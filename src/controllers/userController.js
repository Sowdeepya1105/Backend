const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/response');

const getUsers = async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search.trim(), $options: 'i' } },
      { email: { $regex: search.trim(), $options: 'i' } },
      { role: { $regex: search.trim(), $options: 'i' } },
      { department: { $regex: search.trim(), $options: 'i' } },
    ];
  }

  const pageNumber = Number(page) || 1;
  const pageSize = Number(limit) || 10;
  const skip = (pageNumber - 1) * pageSize;

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select('-password')
    .skip(skip)
    .limit(pageSize)
    .sort({ createdAt: -1 });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return successResponse(
    res,
    'Users fetched successfully',
    { users },
    200,
    { page: pageNumber, limit: pageSize, total, totalPages }
  );
};

const getUserById = async (req, res) => {
  const { id } = req.params;
  const user = await User.findOne({ userId: id }).select('-password');

  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  return successResponse(res, 'User fetched successfully', { user });
};

module.exports = {
  getUsers,
  getUserById,
};
