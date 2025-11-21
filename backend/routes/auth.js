const express = require('express');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const router = express.Router();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Google client id (optional) - set GOOGLE_CLIENT_ID env var in production
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '539940068725-bl40qj6qrpas5b2csag86l77p2392rlq.apps.googleusercontent.com';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
// Email sending removed (nodemailer was used previously). No-op in this build.

// helper to build validation response
function validationResponse(res, errors, message = 'Validation failed') {
  return res.status(400).json({ message, errors });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    const errors = {};

    if (!email || !email.toString().trim()) errors.email = 'Email is required';
    else if (!emailRegex.test(email)) errors.email = 'Enter a valid email';

    if (!password) errors.password = 'Password is required';
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters';
    else if (!/\d/.test(password)) errors.password = 'Password must contain a number';

    if (!name || !name.toString().trim()) errors.name = 'Full name is required';

    if (Object.keys(errors).length) return validationResponse(res, errors);

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'User already exists', errors: { email: 'Email already in use' } });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const user = new User({ name, email, password: hash });
    await user.save();

    return res.status(201).json({ message: 'User created', user: { id: user._id, email: user.email, name: user.name } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const errors = {};

    if (!email || !email.toString().trim()) errors.email = 'Email is required';
    else if (!emailRegex.test(email)) errors.email = 'Enter a valid email';

    if (!password) errors.password = 'Password is required';

    if (Object.keys(errors).length) return validationResponse(res, errors);

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials', errors: { email: 'No account with this email' } });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials', errors: { password: 'Incorrect password' } });

    // For simplicity we return user info. In production use JWT or sessions.

    return res.json({ message: 'Logged in', user: { id: user._id, email: user.email, name: user.name } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/google
// body: { id_token }
router.post('/google', async (req, res) => {
  try {
    const { id_token } = req.body || {};
    if (!id_token) return res.status(400).json({ message: 'id_token is required' });

    let payload;
    if (googleClient) {
      const ticket = await googleClient.verifyIdToken({ idToken: id_token, audience: GOOGLE_CLIENT_ID });
      payload = ticket.getPayload();
    } else {
      // If no client ID is provided, attempt a minimal token decode (less secure)
      // This is a fallback for local testing only.
      const parts = id_token.split('.');
      if (parts.length !== 3) return res.status(400).json({ message: 'Invalid id_token format' });
      const decoded = Buffer.from(parts[1], 'base64').toString('utf8');
      payload = JSON.parse(decoded);
    }

    const email = payload.email;
    const name = payload.name || payload.email;
    if (!email) return res.status(400).json({ message: 'Google token does not contain email' });

    // find or create user
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ name, email, password: Date.now().toString() });
      // save with a random password (not used) - in production mark the account as OAuth-only
      await user.save();
    }

    return res.json({ message: 'Logged in with Google', user: { id: user._id, email: user.email, name: user.name } });
  } catch (err) {
    console.error('Google auth error', err);
    return res.status(500).json({ message: 'Google authentication failed' });
  }
});

// GET /api/auth/profile/:id
router.get('/profile/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ message: 'User id required' });
    const user = await User.findById(id).select('profile name email');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ profile: user.profile || {}, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Profile get error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/profile/:id
// body: { crimeThriller, horror, fantasy, philosophy }
router.post('/profile/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { crimeThriller = 0, horror = 0, fantasy = 0, philosophy = 0 } = req.body || {};
    if (!id) return res.status(400).json({ message: 'User id required' });
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.profile = { crimeThriller, horror, fantasy, philosophy };
    await user.save();
    return res.json({ message: 'Profile saved', profile: user.profile });
  } catch (err) {
    console.error('Profile save error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

