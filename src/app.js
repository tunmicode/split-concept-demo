const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const splitRoutes = require('./routes/split.routes');
const chatRoutes = require('./routes/chat.routes');

const app = express();
const rootDir = path.resolve(__dirname, '..');

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/splits', splitRoutes);
app.use('/api/chat', chatRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'split-demo-api' });
});

app.use(express.static(rootDir));

app.get(['/', '/index.html', '/account.html', '/profile.html', '/split-create.html', '/split-link.html', '/split-review.html'], (req, res) => {
  const requestedFile = req.path === '/' ? 'index.html' : req.path.replace(/^\//, '');
  const targetPath = path.join(rootDir, requestedFile);
  res.sendFile(targetPath);
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }

  res.sendFile(path.join(rootDir, 'index.html'));
});

module.exports = app;
