const Issue = require('../models/Issue');
const Project = require('../models/Project');
const User = require('../models/User');
const { successResponse } = require('../utils/response');

const getIssueAnalytics = async (req, res) => {
  const totalIssues = await Issue.countDocuments();
  const openIssues = await Issue.countDocuments({ status: 'open' });
  const resolvedIssues = await Issue.countDocuments({ status: 'resolved' });
  const closedIssues = await Issue.countDocuments({ status: 'closed' });

  return successResponse(res, 'Issue analytics fetched successfully', {
    totalIssues,
    openIssues,
    resolvedIssues,
    closedIssues,
  });
};

const getProjectAnalytics = async (req, res) => {
  const projects = await Project.aggregate([
    {
      $lookup: {
        from: 'issues',
        localField: '_id',
        foreignField: 'project',
        as: 'issues',
      },
    },
    {
      $project: {
        projectId: 1,
        title: 1,
        status: 1,
        issueCount: { $size: '$issues' },
      },
    },
  ]);

  const activeProjectCount = await Project.countDocuments({ status: 'active' });
  const closedProjectCount = await Project.countDocuments({ status: 'archived' });

  return successResponse(res, 'Project analytics fetched successfully', {
    projectMetrics: projects,
    activeProjectCount,
    closedProjectCount,
  });
};

const getDeveloperAnalytics = async (req, res) => {
  const resolvedIssues = await Issue.aggregate([
    { $match: { status: 'resolved', assignedTo: { $exists: true, $ne: null } } },
    {
      $group: {
        _id: '$assignedTo',
        resolvedCount: { $sum: 1 },
        averageResolutionMs: { $avg: { $subtract: ['$resolvedAt', '$createdAt'] } },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'developer',
      },
    },
    { $unwind: '$developer' },
    {
      $project: {
        userId: '$developer.userId',
        name: '$developer.name',
        resolvedCount: 1,
        averageResolutionTimeHours: { $divide: ['$averageResolutionMs', 1000 * 60 * 60] },
      },
    },
    { $sort: { resolvedCount: -1 } },
  ]);

  return successResponse(res, 'Developer analytics fetched successfully', {
    developers: resolvedIssues,
  });
};

module.exports = {
  getIssueAnalytics,
  getProjectAnalytics,
  getDeveloperAnalytics,
};
