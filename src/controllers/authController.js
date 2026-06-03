const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/response');
const { randomUUID } = require('crypto');

const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '12h' }
  );
};

const register = async (req, res) => {
  const { name, email, password, role, department, status } = req.body || {};

  if (!name || !email || !password || !role) {
    return errorResponse(res, 'Name, email, password, and role are required', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });

  if (existing) {
    return errorResponse(res, 'Email already registered', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    userId: randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role,
    department: department ? department.trim() : 'general',
    status: status || 'active',
  });

  const responseUser = {
    _id: user._id,
    userId: user.userId,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    status: user.status,
    createdAt: user.createdAt,
  };

  return successResponse(res, 'User registered successfully', responseUser, 201, { user: responseUser });
};

const login = async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return errorResponse(res, 'Email and password are required', 400);
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    return errorResponse(res, 'Invalid credentials', 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    return errorResponse(res, 'Invalid credentials', 401);
  }

  const token = createToken(user);

  const responseUser = {
    _id: user._id,
    userId: user.userId,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    status: user.status,
    createdAt: user.createdAt,
  };

  return successResponse(res, 'Login successful', { token, user: responseUser }, 200, { token });
};

const me = async (req, res) => {
  const user = req.user;
  const responseUser = {
    _id: user._id,
    userId: user.userId,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    status: user.status,
    createdAt: user.createdAt,
  };

  return successResponse(res, 'Authenticated user fetched successfully', responseUser, 200, { user: responseUser });
};

module.exports = {
  register,
  login,
  me,
};
