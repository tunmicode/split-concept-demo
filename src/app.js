const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const splitRoutes = require('./routes/split.routes');
const chatRoutes = require('./routes/chat.routes');
const { verifyToken } = require('./utils/jwt');

const app = express();
const rootDir = path.resolve(__dirname, '..');
const allowedOrigins = [
  'https://split-concept-demo.vercel.app',
  'http://localhost:3000',
  'http://localhost:8000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8000',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
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

function sendFileIfExists(req, res, fileName) {
  const targetPath = path.join(rootDir, fileName);
  res.sendFile(targetPath);
}

const protectedPages = ['/', '/index.html', '/profile.html', '/split-create.html', '/split-link.html', '/split-review.html'];

app.get(protectedPages, (req, res) => {
  const token = req.cookies?.jwt;
  if (!token) {
    return res.redirect('/account.html');
  }

  try {
    verifyToken(token);
  } catch (_error) {
    return res.redirect('/account.html');
  }

  const requestedFile = req.path === '/' ? 'index.html' : req.path.replace(/^\//, '');
  return sendFileIfExists(req, res, requestedFile);
});

app.get('/account.html', (req, res) => {
  return sendFileIfExists(req, res, 'account.html');
});

app.use(express.static(rootDir));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }

  res.sendFile(path.join(rootDir, 'account.html'));
});

module.exports = app;
