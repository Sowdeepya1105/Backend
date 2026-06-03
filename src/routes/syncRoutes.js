const express = require('express');
const { syncDataset } = require('../controllers/syncController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', requireAuth, syncDataset);

module.exports = router;
