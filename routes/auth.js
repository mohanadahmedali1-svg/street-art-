const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { getDB } = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, try again later' }
});

// POST /api/auth/login
router.post('/login', loginLimiter, [
  body('username').trim().isLength({ min: 3, max: 50 }).escape(),
  body('password').isLength({ min: 6, max: 100 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid input' });

  const { username, password } = req.body;
  const db = getDB();

  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
    const user = rows[0];

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000
    });

    res.json({ message: 'Login successful', user: { username: user.username, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/register
router.post('/register', [
  body('username').trim().isLength({ min: 3, max: 50 }).escape(),
  body('password').isLength({ min: 6, max: 100 }),
  body('role').isIn(['admin', 'editor', 'viewer'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid input' });

  const { username, password, role } = req.body;
  const db = getDB();
  const hash = bcrypt.hashSync(password, 10);

  try {
    await db.execute('INSERT INTO users (username, password, role) VALUES (?,?,?)', [username, hash, role]);
    res.json({ message: 'User created successfully' });
  } catch (e) {
    res.status(400).json({ error: 'Username already exists' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

module.exports = router;
