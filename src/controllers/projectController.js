const { randomUUID } = require('crypto');
const Project = require('../models/Project');
const User = require('../models/User');
const Issue = require('../models/Issue');
const { successResponse, errorResponse } = require('../utils/response');

const createProject = async (req, res) => {
  const { title, description, ownerId, memberIds = [], status, startDate } = req.body;

  if (!title || !ownerId) {
    return errorResponse(res, 'Title and ownerId are required', 400);
  }

  const owner = await User.findOne({ userId: ownerId });
  if (!owner) {
    return errorResponse(res, 'Owner user does not exist', 400);
  }

  const members = [];
  for (const userId of memberIds) {
    const member = await User.findOne({ userId });
    if (!member) {
      return errorResponse(res, `Project member not found: ${userId}`, 400);
    }
    members.push(member._id);
  }

  const existing = await Project.findOne({ title: title.trim() });
  if (existing) {
    return errorResponse(res, 'Project title already exists', 409);
  }

  const project = await Project.create({
    projectId: randomUUID(),
    title: title.trim(),
    description: description ? description.trim() : '',
    owner: owner._id,
    members,
    status: status || 'active',
    startDate: startDate ? new Date(startDate) : undefined,
  });

  return successResponse(res, 'Project created successfully', project, 201, { project });
};

const getProjects = async (req, res) => {
  const { status, owner, search } = req.query;
  const filter = {};

  if (status) {
    filter.status = status.trim().toLowerCase();
  }

  if (owner) {
    const ownerUser = await User.findOne({ name: owner.trim() });
    if (ownerUser) {
      filter.owner = ownerUser._id;
    }
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search.trim(), $options: 'i' } },
      { description: { $regex: search.trim(), $options: 'i' } },
    ];
  }

  const projects = await Project.find(filter)
    .populate('owner', 'userId name email role')
    .populate('members', 'userId name email role');

  return successResponse(res, 'Projects fetched successfully', { projects }, 200, { projects });
};

const getProjectById = async (req, res) => {
  const { id } = req.params;
  const project = await Project.findOne({ projectId: id })
    .populate('owner', 'userId name email role')
    .populate('members', 'userId name email role');

  if (!project) {
    return errorResponse(res, 'Project not found', 404);
  }

  return successResponse(res, 'Project fetched successfully', { project }, 200, { project });
};

const updateProject = async (req, res) => {
  const { id } = req.params;
  const { title, description, ownerId, memberIds, status, startDate } = req.body;

  const project = await Project.findOne({ projectId: id });
  if (!project) {
    return errorResponse(res, 'Project not found', 404);
  }

  if (title && title.trim() !== project.title) {
    const existing = await Project.findOne({ title: title.trim() });
    if (existing) {
      return errorResponse(res, 'Project title already exists', 409);
    }
    project.title = title.trim();
  }

  if (description !== undefined) {
    project.description = description ? description.trim() : '';
  }

  if (ownerId) {
    const owner = await User.findOne({ userId: ownerId });
    if (!owner) {
      return errorResponse(res, 'Owner user does not exist', 400);
    }
    project.owner = owner._id;
  }

  if (memberIds) {
    const members = [];
    for (const userId of memberIds) {
      const member = await User.findOne({ userId });
      if (!member) {
        return errorResponse(res, `Project member not found: ${userId}`, 400);
      }
      members.push(member._id);
    }
    project.members = members;
  }

  if (status) {
    project.status = status.trim().toLowerCase();
  }

  if (startDate) {
    project.startDate = new Date(startDate);
  }

  await project.save();
  return successResponse(res, 'Project updated successfully', { project }, 200, { project });
};

const deleteProject = async (req, res) => {
  const { id } = req.params;
  const project = await Project.findOne({ projectId: id });
  if (!project) {
    return errorResponse(res, 'Project not found', 404);
  }

  const linkedIssueCount = await Issue.countDocuments({ project: project._id });
  if (linkedIssueCount > 0) {
    return errorResponse(res, 'Cannot delete project with linked issues', 400);
  }

  await project.deleteOne();
  return successResponse(res, 'Project deleted successfully', {}, 200, { projectId: id });
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
};
