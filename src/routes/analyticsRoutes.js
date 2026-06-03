const express = require('express');
const {
  getIssueAnalytics,
  getProjectAnalytics,
  getDeveloperAnalytics,
} = require('../controllers/analyticsController');
const { requireAuth, permit } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/issues', requireAuth, permit('admin', 'manager'), getIssueAnalytics);
router.get('/projects', requireAuth, permit('admin', 'manager'), getProjectAnalytics);
router.get('/developers', requireAuth, permit('admin', 'manager'), getDeveloperAnalytics);

module.exports = router;
