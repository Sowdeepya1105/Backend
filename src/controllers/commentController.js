const { randomUUID } = require('crypto');
const Comment = require('../models/Comment');
const Issue = require('../models/Issue');
const { successResponse, errorResponse } = require('../utils/response');

const createComment = async (req, res) => {
  const { issueId, message } = req.body;

  if (!issueId || !message) {
    return errorResponse(res, 'issueId and message are required', 400);
  }

  const issue = await Issue.findOne({ issueId });
  if (!issue) {
    return errorResponse(res, 'Issue not found', 404);
  }

  const comment = await Comment.create({
    commentId: randomUUID(),
    message: message.trim(),
    issue: issue._id,
    user: req.user._id,
  });

  return successResponse(res, 'Comment added successfully', comment, 201, { comment });
};

const getComments = async (req, res) => {
  const { issueId } = req.query;
  const filter = {};

  if (issueId) {
    const issue = await Issue.findOne({ issueId });
    if (issue) {
      filter.issue = issue._id;
    }
  }

  const comments = await Comment.find(filter)
    .populate('issue', 'issueId title')
    .populate('user', 'userId name role')
    .sort({ createdAt: -1 });

  return successResponse(res, 'Comments fetched successfully', { comments }, 200, { comments });
};

const getCommentById = async (req, res) => {
  const { id } = req.params;
  const comment = await Comment.findOne({ commentId: id })
    .populate('issue', 'issueId title')
    .populate('user', 'userId name role');

  if (!comment) {
    return errorResponse(res, 'Comment not found', 404);
  }

  return successResponse(res, 'Comment fetched successfully', { comment }, 200, { comment });
};

const deleteComment = async (req, res) => {
  const { id } = req.params;
  const comment = await Comment.findOne({ commentId: id });
  if (!comment) {
    return errorResponse(res, 'Comment not found', 404);
  }

  if (req.user.role !== 'admin' && req.user.role !== 'manager' && comment.user.toString() !== req.user._id.toString()) {
    return errorResponse(res, 'Not authorized to delete this comment', 403);
  }

  await comment.deleteOne();
  return successResponse(res, 'Comment deleted successfully', { commentId: id });
};

module.exports = {
  createComment,
  getComments,
  getCommentById,
  deleteComment,
};
