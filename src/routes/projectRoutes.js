const express = require('express');
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
} = require('../controllers/projectController');
const { requireAuth, permit } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', requireAuth, permit('admin', 'manager'), createProject);
router.get('/', requireAuth, getProjects);
router.get('/:id', requireAuth, getProjectById);
router.patch('/:id', requireAuth, permit('admin', 'manager'), updateProject);
router.delete('/:id', requireAuth, permit('admin', 'manager'), deleteProject);

module.exports = router;
