const express = require('express');
const User = require('../models/User');

const router = express.Router();

// Admin check: verify email equals the allowed admin email.
// For this project we read a JSON string from header `x-user` set by the client after login.
function isAdmin(req) {
  try {
    const header = req.get('x-user');
    if (!header) return false;
    const u = JSON.parse(header);
    const email = (u && u.email ? u.email : '').toString().toLowerCase();
    return email === 'grshalinissm@gmail.com';
  } catch (_) {
    return false;
  }
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

// GET /api/admin/users -> return all users (without passwords)
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users, totalCount: users.length });
  } catch (err) {
    console.error('Admin list users error', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/admin/stats -> simple analytics from profile fields
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const agg = await User.aggregate([
      { $project: { profile: 1 } },
      {
        $group: {
          _id: null,
          crimeThriller: { $sum: { $ifNull: ['$profile.crimeThriller', 0] } },
          horror: { $sum: { $ifNull: ['$profile.horror', 0] } },
          fantasy: { $sum: { $ifNull: ['$profile.fantasy', 0] } },
          philosophy: { $sum: { $ifNull: ['$profile.philosophy', 0] } },
        },
      },
    ]);

    const profileSums = agg && agg[0]
      ? {
          crimeThriller: agg[0].crimeThriller || 0,
          horror: agg[0].horror || 0,
          fantasy: agg[0].fantasy || 0,
          philosophy: agg[0].philosophy || 0,
        }
      : { crimeThriller: 0, horror: 0, fantasy: 0, philosophy: 0 };

    res.json({ totalUsers, profileSums });
  } catch (err) {
    console.error('Admin stats error', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/admin/test -> test endpoint to check basic functionality
router.get('/test', requireAdmin, async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const sampleUsers = await User.find().select('name email createdAt').limit(3);
    res.json({ 
      message: 'Admin test endpoint working',
      database: {
        connected: true,
        userCount,
        sampleUsers
      }
    });
  } catch (err) {
    console.error('Admin test error', err);
    res.status(500).json({ message: 'Test failed', error: err.message });
  }
});

module.exports = router;
