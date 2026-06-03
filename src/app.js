const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const syncRoutes = require('./routes/syncRoutes');
const healthRoutes = require('./routes/healthRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const issueRoutes = require('./routes/issueRoutes');
const commentRoutes = require('./routes/commentRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const frontendDist = path.resolve(__dirname, '../../Frontend/dist');
const indexHtmlPath = path.join(frontendDist, 'index.html');
const frontendAvailable = fs.existsSync(indexHtmlPath);
const apiPrefixes = ['/auth', '/sync', '/health', '/users', '/projects', '/issues', '/comments', '/analytics'];

app.use(cors());
app.use(express.json());

if (frontendAvailable) {
  app.use(express.static(frontendDist));
}

app.use('/auth', authRoutes);
app.use('/sync', syncRoutes);
app.use('/health', healthRoutes);
app.use('/users', userRoutes);
app.use('/projects', projectRoutes);
app.use('/issues', issueRoutes);
app.use('/comments', commentRoutes);
app.use('/analytics', analyticsRoutes);

if (frontendAvailable) {
  app.use((req, res, next) => {
    if (apiPrefixes.some((prefix) => req.path.startsWith(prefix))) {
      return next();
    }
    return res.sendFile(indexHtmlPath);
  });
}

app.use(errorHandler);

if (!frontendAvailable) {
  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Backend is running',
      data: [],
    });
  });
}

module.exports = app;
