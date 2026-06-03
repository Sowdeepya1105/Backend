const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorResponse } = require('../utils/response');

const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, 'Authorization token missing', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return errorResponse(res, 'Invalid token user', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    return errorResponse(res, 'Invalid or expired token', 401);
  }
};

const permit = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Authorization required', 401);
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 'Forbidden: insufficient permissions', 403);
    }

    next();
  };
};

module.exports = {
  requireAuth,
  permit,
};
