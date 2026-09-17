const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db');
const { signToken } = require('../utils/jwt');
const { sendVerificationCode } = require('../services/email.service');

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function signUp(req, res) {
  try {
    const { fullName, username, email, phone, password } = req.body || {};

    if (!fullName || !username || !password) {
      return res.status(400).json({ error: 'Full name, username, and password are required.' });
    }

    const normalizedUsername = normalizeUsername(username);
    const finalEmail = email ? String(email).trim().toLowerCase() : null;
    const finalPhone = phone ? String(phone).trim() : null;

    if (!finalEmail && !finalPhone) {
      return res.status(400).json({ error: 'Email or phone is required.' });
    }

    if (normalizedUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const existingUser = await db.query(
      `SELECT id FROM users WHERE LOWER(username) = LOWER($1) OR (email IS NOT NULL AND LOWER(email) = LOWER($2)) OR (phone IS NOT NULL AND phone = $3)`,
      [normalizedUsername, finalEmail || '', finalPhone || '']
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Username, email, or phone is already in use.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userResult = await db.query(
      `INSERT INTO users (full_name, username, email, phone, password_hash, is_active)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING id, full_name, username, email, phone, is_active, created_at`,
      [String(fullName).trim(), normalizedUsername, finalEmail, finalPhone, passwordHash]
    );

    const user = userResult.rows[0];
    const code = generateCode();
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.query(
      `INSERT INTO email_verification_codes (user_id, code_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, codeHash, expiresAt]
    );

    if (user.email) {
      await sendVerificationCode({ email: user.email, code });
    }

    res.status(201).json({
      message: 'Account created. Check your email for a verification code.',
      user: {
        id: user.id,
        fullName: user.full_name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        isActive: user.is_active,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Unable to create account.' });
  }
}

async function verifyEmail(req, res) {
  try {
    const { userId, code } = req.body || {};

    if (!userId || !code) {
      return res.status(400).json({ error: 'User ID and verification code are required.' });
    }

    const result = await db.query(
      `SELECT * FROM email_verification_codes
       WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'No active verification code found for this user.' });
    }

    const stored = result.rows[0];
    const suppliedHash = crypto.createHash('sha256').update(String(code).trim()).digest('hex');

    if (stored.code_hash !== suppliedHash) {
      return res.status(400).json({ error: 'Incorrect verification code.' });
    }

    await db.query(
      `UPDATE users SET is_active = true, email_verified_at = NOW() WHERE id = $1`,
      [userId]
    );

    await db.query(
      `UPDATE email_verification_codes SET used_at = NOW() WHERE id = $1`,
      [stored.id]
    );

    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Unable to verify email.' });
  }
}

async function login(req, res) {
  try {
    const { login, password } = req.body || {};

    if (!login || !password) {
      return res.status(400).json({ error: 'Username or email/phone and password are required.' });
    }

    const identifier = String(login).trim();
    const result = await db.query(
      `SELECT * FROM users
       WHERE LOWER(username) = LOWER($1)
          OR (email IS NOT NULL AND LOWER(email) = LOWER($1))
          OR (phone IS NOT NULL AND phone = $1)
       LIMIT 1`,
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is not active. Please verify your email first.' });
    }

    const token = signToken({ userId: user.id, username: user.username });
    const isSecure = process.env.NODE_ENV === 'production';

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: process.env.COOKIE_SAME_SITE || 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: {
        id: user.id,
        fullName: user.full_name,
        username: user.username,
        email: user.email,
        phone: user.phone,
      },
      message: 'Logged in successfully.',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Unable to log in.' });
  }
}

async function logout(_req, res) {
  res.clearCookie('jwt', { httpOnly: true, sameSite: process.env.COOKIE_SAME_SITE || 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ message: 'Logged out successfully.' });
}

async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { signUp, verifyEmail, login, logout, me };
