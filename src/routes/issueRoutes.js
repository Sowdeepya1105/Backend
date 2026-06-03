const express = require('express');
const {
  createIssue,
  getIssues,
  getIssueById,
  updateIssue,
  deleteIssue,
  assignIssue,
  updateIssueStatus,
} = require('../controllers/issueController');
const { requireAuth, permit } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', requireAuth, createIssue);
router.get('/', requireAuth, getIssues);
router.get('/:id', requireAuth, getIssueById);
router.patch('/:id', requireAuth, updateIssue);
router.delete('/:id', requireAuth, deleteIssue);
router.patch('/:id/assign', requireAuth, permit('admin', 'manager'), assignIssue);
router.patch('/:id/status', requireAuth, updateIssueStatus);

module.exports = router;
