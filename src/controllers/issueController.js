const { randomUUID } = require('crypto');
const Issue = require('../models/Issue');
const Project = require('../models/Project');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { successResponse, errorResponse } = require('../utils/response');

const allowedStatus = ['open', 'in-progress', 'testing', 'resolved', 'closed'];
const allowedPriority = ['low', 'medium', 'high'];
const allowedSeverity = ['minor', 'major', 'critical'];

const parseDate = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const createIssue = async (req, res) => {
  const { title, description, priority, severity, status, dueDate, projectId, assignedToId, reportedById } = req.body;

  if (!title || !priority || !severity || !projectId || !reportedById) {
    return errorResponse(res, 'Missing required issue fields', 400);
  }

  const project = await Project.findOne({ projectId });
  if (!project) {
    return errorResponse(res, 'Invalid project reference', 400);
  }

  const reportedBy = await User.findOne({ userId: reportedById });
  if (!reportedBy) {
    return errorResponse(res, 'Invalid reportedBy user', 400);
  }

  let assignedTo = null;
  if (assignedToId) {
    assignedTo = await User.findOne({ userId: assignedToId });
    if (!assignedTo) {
      return errorResponse(res, 'Invalid assignedTo user', 400);
    }
  }

  const normalizedPriority = priority.trim().toLowerCase();
  const normalizedSeverity = severity.trim().toLowerCase();
  const normalizedStatus = status ? status.trim().toLowerCase() : 'open';
  const parsedDueDate = parseDate(dueDate);

  if (!allowedPriority.includes(normalizedPriority)) {
    return errorResponse(res, 'Invalid priority value', 400);
  }
  if (!allowedSeverity.includes(normalizedSeverity)) {
    return errorResponse(res, 'Invalid severity value', 400);
  }
  if (!allowedStatus.includes(normalizedStatus)) {
    return errorResponse(res, 'Invalid status value', 400);
  }
  if (dueDate && parsedDueDate === null) {
    return errorResponse(res, 'Invalid dueDate value', 400);
  }

  const duplicate = await Issue.findOne({ project: project._id, title: title.trim() });
  if (duplicate) {
    return errorResponse(res, 'Duplicate issue title within the same project', 409);
  }

  const issue = await Issue.create({
    issueId: randomUUID(),
    title: title.trim(),
    description: description ? description.trim() : '',
    priority: normalizedPriority,
    severity: normalizedSeverity,
    status: normalizedStatus,
    dueDate: parsedDueDate,
    project: project._id,
    assignedTo: assignedTo ? assignedTo._id : undefined,
    reportedBy: reportedBy._id,
  });

  return successResponse(res, 'Issue created successfully', issue, 201, { issue });
};

const getIssues = async (req, res) => {
  const { priority, status, severity, project, assignedTo, reportedBy, search, page = 1, limit = 10 } = req.query;
  const filter = {};

  if (priority) {
    filter.priority = priority.trim().toLowerCase();
  }
  if (status) {
    filter.status = status.trim().toLowerCase();
  }
  if (severity) {
    filter.severity = severity.trim().toLowerCase();
  }
  if (project) {
    const projectDoc = await Project.findOne({ projectId: project.trim() });
    if (projectDoc) {
      filter.project = projectDoc._id;
    }
  }
  if (assignedTo) {
    const user = await User.findOne({ userId: assignedTo.trim() });
    if (user) {
      filter.assignedTo = user._id;
    }
  }
  if (reportedBy) {
    const user = await User.findOne({ userId: reportedBy.trim() });
    if (user) {
      filter.reportedBy = user._id;
    }
  }
  if (search) {
    filter.$or = [
      { title: { $regex: search.trim(), $options: 'i' } },
      { description: { $regex: search.trim(), $options: 'i' } },
    ];
  }

  const pageNumber = Number(page) || 1;
  const pageSize = Number(limit) || 10;
  const skip = (pageNumber - 1) * pageSize;

  const total = await Issue.countDocuments(filter);
  const issues = await Issue.find(filter)
    .skip(skip)
    .limit(pageSize)
    .populate('project', 'projectId title status')
    .populate('assignedTo', 'userId name role')
    .populate('reportedBy', 'userId name role')
    .sort({ createdAt: -1 });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return successResponse(res, 'Issues fetched successfully', { issues }, 200, {
    issues,
    page: pageNumber,
    limit: pageSize,
    total,
    totalPages,
  });
};

const getIssueById = async (req, res) => {
  const { id } = req.params;
  const issue = await Issue.findOne({ issueId: id })
    .populate('project', 'projectId title status')
    .populate('assignedTo', 'userId name role')
    .populate('reportedBy', 'userId name role');

  if (!issue) {
    return errorResponse(res, 'Issue not found', 404);
  }

  return successResponse(res, 'Issue fetched successfully', { issue }, 200, { issue });
};

const updateIssue = async (req, res) => {
  const { id } = req.params;
  const { title, description, priority, severity, dueDate, projectId, assignedToId, reportedById } = req.body;

  const issue = await Issue.findOne({ issueId: id });
  if (!issue) {
    return errorResponse(res, 'Issue not found', 404);
  }

  if (issue.status === 'resolved') {
    return errorResponse(res, 'Resolved issues cannot be edited directly', 400);
  }

  if (req.user.role === 'tester') {
    return errorResponse(res, 'Testers cannot update issues directly', 403);
  }

  if (req.user.role === 'developer' && issue.assignedTo?.toString() !== req.user._id.toString()) {
    return errorResponse(res, 'Developers can update only assigned issues', 403);
  }

  if (title && title.trim() !== issue.title) {
    const duplicate = await Issue.findOne({ project: issue.project, title: title.trim() });
    if (duplicate) {
      return errorResponse(res, 'Duplicate issue title within the same project', 409);
    }
    issue.title = title.trim();
  }

  if (description !== undefined) {
    issue.description = description ? description.trim() : '';
  }

  if (priority) {
    const normalizedPriority = priority.trim().toLowerCase();
    if (!allowedPriority.includes(normalizedPriority)) {
      return errorResponse(res, 'Invalid priority value', 400);
    }
    issue.priority = normalizedPriority;
  }

  if (severity) {
    const normalizedSeverity = severity.trim().toLowerCase();
    if (!allowedSeverity.includes(normalizedSeverity)) {
      return errorResponse(res, 'Invalid severity value', 400);
    }
    issue.severity = normalizedSeverity;
  }

  if (dueDate) {
    const parsedDueDate = parseDate(dueDate);
    if (parsedDueDate === null) {
      return errorResponse(res, 'Invalid dueDate value', 400);
    }
    issue.dueDate = parsedDueDate;
  }

  if (projectId) {
    const project = await Project.findOne({ projectId });
    if (!project) {
      return errorResponse(res, 'Invalid project reference', 400);
    }
    issue.project = project._id;
  }

  if (assignedToId) {
    const assignedTo = await User.findOne({ userId: assignedToId });
    if (!assignedTo) {
      return errorResponse(res, 'Invalid assignedTo user', 400);
    }
    issue.assignedTo = assignedTo._id;
  }

  if (reportedById) {
    const reportedBy = await User.findOne({ userId: reportedById });
    if (!reportedBy) {
      return errorResponse(res, 'Invalid reportedBy user', 400);
    }
    issue.reportedBy = reportedBy._id;
  }

  await issue.save();
  return successResponse(res, 'Issue updated successfully', { issue }, 200, { issue });
};

const deleteIssue = async (req, res) => {
  const { id } = req.params;
  const issue = await Issue.findOne({ issueId: id });
  if (!issue) {
    return errorResponse(res, 'Issue not found', 404);
  }

  await issue.deleteOne();
  return successResponse(res, 'Issue deleted successfully', {}, 200, { issueId: id });
};

const assignIssue = async (req, res) => {
  const { id } = req.params;
  const { assignedToId } = req.body;

  if (!assignedToId) {
    return errorResponse(res, 'assignedToId is required', 400);
  }

  const issue = await Issue.findOne({ issueId: id });
  if (!issue) {
    return errorResponse(res, 'Issue not found', 404);
  }

  if (issue.status === 'closed') {
    return errorResponse(res, 'Closed issues cannot be assigned', 400);
  }

  const assignedTo = await User.findOne({ userId: assignedToId });
  if (!assignedTo) {
    return errorResponse(res, 'Assigned user does not exist', 400);
  }

  issue.assignedTo = assignedTo._id;
  await issue.save();

  await ActivityLog.create({
    issue: issue._id,
    user: req.user._id,
    action: 'assigned issue',
    previousStatus: issue.status,
    newStatus: issue.status,
  });

  return successResponse(res, 'Issue assigned successfully', { issue }, 200, { issue });
};

const updateIssueStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return errorResponse(res, 'Status is required', 400);
  }

  const normalizedStatus = status.trim().toLowerCase();
  if (!allowedStatus.includes(normalizedStatus)) {
    return errorResponse(res, 'Invalid status value', 400);
  }

  const issue = await Issue.findOne({ issueId: id });
  if (!issue) {
    return errorResponse(res, 'Issue not found', 404);
  }

  if (issue.status === 'closed' && normalizedStatus !== 'open') {
    return errorResponse(res, 'Closed issues cannot move back without reopen', 400);
  }

  if (req.user.role === 'tester' && normalizedStatus === 'closed') {
    return errorResponse(res, 'Testers cannot close issues directly', 403);
  }

  if (normalizedStatus === 'testing') {
    if (req.user.role !== 'developer' || issue.assignedTo?.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Only assigned developer can move issue to testing', 403);
    }
  }

  if (req.user.role === 'developer' && issue.assignedTo?.toString() !== req.user._id.toString()) {
    return errorResponse(res, 'Developers can update only assigned issues', 403);
  }

  const previousStatus = issue.status;
  issue.status = normalizedStatus;
  if (normalizedStatus === 'resolved') {
    issue.resolvedAt = new Date();
  }

  await issue.save();
  await ActivityLog.create({
    issue: issue._id,
    user: req.user._id,
    action: 'status update',
    previousStatus,
    newStatus: normalizedStatus,
  });

  return successResponse(res, 'Issue status updated successfully', { issue }, 200, { issue });
};

module.exports = {
  createIssue,
  getIssues,
  getIssueById,
  updateIssue,
  deleteIssue,
  assignIssue,
  updateIssueStatus,
};
