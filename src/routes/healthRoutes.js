const express = require('express');
const mongoose = require('mongoose');
const Issue = require('../models/Issue');
const { successResponse } = require('../utils/response');

const router = express.Router();

router.get('/', async (req, res) => {
  const status = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const documentCount = await Issue.countDocuments();

  return successResponse(res, 'Database connected successfully', {
    database: status,
    documentCount,
  });
});

module.exports = router;
