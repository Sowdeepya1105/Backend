const axios = require('axios');
const { randomUUID } = require('crypto');
const Issue = require('../models/Issue');
const Project = require('../models/Project');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/response');

const allowedPriority = ['low', 'medium', 'high'];
const allowedStatus = ['open', 'in-progress', 'testing', 'resolved', 'closed'];
const allowedSeverity = ['minor', 'major', 'critical'];

const normalize = (value) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim();
};

const normalizeLower = (value) => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim().toLowerCase();
};

const parseDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const safeGetToken = (data) => {
  if (!data) return null;
  if (typeof data === 'string') return data;
  return data.token || data.accessToken || data.authToken || data.data?.token || data.data?.accessToken || null;
};

const safeGetDataUrl = (data) => {
  if (!data) return null;
  if (typeof data === 'string') return null;
  return data.dataUrl || data.url || data.data?.dataUrl || data.data?.url || null;
};

const getExternalToken = async (baseUrl, loginEndpoint, usernameField, passwordField, username, password, setName) => {
  const url = `${baseUrl.replace(/\/$/, '')}${loginEndpoint.startsWith('/') ? loginEndpoint : `/${loginEndpoint}`}`;
  const payload = {
    [usernameField]: username,
    [passwordField]: password,
  };
  if (setName) {
    payload.set = setName;
  }

  const response = await axios.post(url, payload).catch((err) => ({ error: err, response: err.response }));
  if (response?.error && response.response) {
    throw new Error(`External auth failed: ${response.response.status} ${response.response.statusText}`);
  }

  const token = safeGetToken(response.data);
  const dataUrl = safeGetDataUrl(response.data);
  if (!token) {
    throw new Error('External auth did not return a token');
  }

  return { token, dataUrl };
};

const syncDataset = async (req, res) => {
  const baseUrl = process.env.EXTERNAL_API_BASE_URL || process.env.API_BASE_URL;
  const username = process.env.EXTERNAL_API_USERNAME || process.env.STUDENT_ID;
  const password = process.env.EXTERNAL_API_PASSWORD || process.env.STUDENT_PASSWORD;
  const setName = process.env.EXTERNAL_API_SET_NAME || process.env.SET_NAME;

  if (!baseUrl || !username || !password) {
    return errorResponse(res, 'External dataset API credentials are not configured', 500);
  }

  const authPaths = [
    process.env.EXTERNAL_API_AUTH_PATH,
    '/auth/login',
    '/login',
    '/api/auth/login',
    '/api/login',
  ].filter(Boolean);
  const dataPaths = [
    process.env.EXTERNAL_API_DATA_PATH,
    '/issues',
    '/dataset',
    '/data',
    '/sync',
    '/',
  ].filter(Boolean);

  const usernameField = process.env.EXTERNAL_API_AUTH_USERNAME_FIELD || (process.env.STUDENT_ID ? 'studentId' : 'username');
  const passwordField = process.env.EXTERNAL_API_AUTH_PASSWORD_FIELD || 'password';

  let token = null;
  let authError = null;
  let dataUrl = null;
  for (const authPath of authPaths) {
    try {
      const result = await getExternalToken(baseUrl, authPath, usernameField, passwordField, username, password, setName);
      token = result.token;
      dataUrl = result.dataUrl || dataUrl;
      break;
    } catch (error) {
      authError = error;
    }
  }

  if (!token) {
    return errorResponse(res, `Could not authenticate with external API: ${authError?.message || 'unknown error'}`, 500);
  }

  let records = [];
  let lastFetchError = null;

  if (dataUrl) {
    const url = dataUrl.startsWith('http') ? dataUrl : `${baseUrl.replace(/\/$/, '')}${dataUrl.startsWith('/') ? dataUrl : `/${dataUrl}`}`;
    const response = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } }).catch((err) => ({ error: err, response: err.response }));
    if (response?.error && response.response) {
      lastFetchError = response.error;
    } else {
      records = Array.isArray(response.data) ? response.data : response.data?.data || [];
    }
  }

  if (!Array.isArray(records) || records.length === 0) {
    for (const dataPath of dataPaths) {
      const url = `${baseUrl.replace(/\/$/, '')}${dataPath.startsWith('/') ? dataPath : `/${dataPath}`}`;
      const response = await axios
        .get(url, { headers: { Authorization: `Bearer ${token}` } })
        .catch((err) => ({ error: err, response: err.response }));

      if (response?.error && response.response) {
        lastFetchError = response.error;
        continue;
      }

      records = Array.isArray(response.data) ? response.data : response.data?.data || [];
      if (records.length > 0) {
        break;
      }
    }
  }

  if (!Array.isArray(records) || records.length === 0) {
    return errorResponse(res, `Failed to fetch dataset from external API: ${lastFetchError?.message || 'no records returned'}`, 500);
  }

  let inserted = 0;
  let duplicates = 0;
  let rejected = 0;
  const seenIds = new Set();

  for (const raw of records) {
    const issueId = normalize(raw.issueId || raw.id || raw.issue_id || randomUUID());
    if (!issueId) {
      rejected += 1;
      continue;
    }

    if (seenIds.has(issueId)) {
      duplicates += 1;
      continue;
    }
    seenIds.add(issueId);

    const title = normalize(raw.title || raw.name || '');
    const description = normalize(raw.description || raw.details || '');
    const priority = normalizeLower(raw.priority);
    const severity = normalizeLower(raw.severity);
    const status = normalizeLower(raw.status || 'open');
    const dueDate = parseDate(raw.dueDate || raw.due_date || raw.deadline);
    const projectId = normalize(raw.projectId || raw.project_id || raw.project?.projectId);
    const assignedUserId = normalize(raw.assignedTo || raw.assigned_to || raw.assignedToId);
    const reportedUserId = normalize(raw.reportedBy || raw.reported_by || raw.reportedById || raw.reported_by_id);

    if (!title || !priority || !severity || !projectId || !reportedUserId) {
      rejected += 1;
      continue;
    }
    if (!allowedPriority.includes(priority) || !allowedSeverity.includes(severity) || !allowedStatus.includes(status)) {
      rejected += 1;
      continue;
    }
    if (dueDate === null) {
      rejected += 1;
      continue;
    }

    const project = await Project.findOne({ projectId });
    if (!project) {
      rejected += 1;
      continue;
    }

    const reportedBy = await User.findOne({ userId: reportedUserId });
    if (!reportedBy) {
      rejected += 1;
      continue;
    }

    let assignedTo = null;
    if (assignedUserId) {
      assignedTo = await User.findOne({ userId: assignedUserId });
      if (!assignedTo) {
        rejected += 1;
        continue;
      }
    }

    const existingIssue = await Issue.findOne({ issueId });
    if (existingIssue) {
      duplicates += 1;
      continue;
    }

    await Issue.create({
      issueId,
      title,
      description,
      priority,
      severity,
      status,
      dueDate,
      project: project._id,
      assignedTo: assignedTo ? assignedTo._id : undefined,
      reportedBy: reportedBy._id,
    });
    inserted += 1;
  }

  return successResponse(res, 'Dataset synchronized successfully', {
    totalFetched: records.length,
    inserted,
    duplicates,
    rejected,
  }, 200);
};

module.exports = {
  syncDataset,
};
