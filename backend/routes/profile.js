const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/profiles');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: userId_timestamp.extension
    const userId = req.params.id || req.body.userId || Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${userId}_${Date.now()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// GET /api/profile/:id - Get full user profile
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ message: 'User id required' });
    
    const user = await User.findById(id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    return res.json({ 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        bio: user.bio,
        location: user.location,
        website: user.website,
        profileVisibility: user.profileVisibility || 'public',
        joinedDate: user.joinedDate,
        profile: user.profile,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (err) {
    console.error('Profile get error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/profile/:id - Update user profile (without picture)
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { name, bio, location, website, profile, profileVisibility } = req.body || {};
    
    if (!id) return res.status(400).json({ message: 'User id required' });
    
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Update fields if provided
    if (name !== undefined) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (location !== undefined) user.location = location;
    if (website !== undefined) user.website = website;
    if (profileVisibility !== undefined) user.profileVisibility = profileVisibility;
    else if (user.profileVisibility === undefined) user.profileVisibility = 'public';
    if (profile !== undefined) user.profile = { ...user.profile, ...profile };
    
    await user.save();
    
    return res.json({ 
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        bio: user.bio,
        location: user.location,
        website: user.website,
        profileVisibility: user.profileVisibility || 'public',
        profile: user.profile
      }
    });
  } catch (err) {
    console.error('Profile update error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/profile/:id/picture - Upload profile picture
router.post('/:id/picture', upload.single('profilePicture'), async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ message: 'User id required' });
    
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Delete old profile picture if exists
    if (user.profilePicture) {
      const oldPicturePath = path.join(__dirname, '../uploads/profiles', path.basename(user.profilePicture));
      if (fs.existsSync(oldPicturePath)) {
        fs.unlinkSync(oldPicturePath);
      }
    }
    
    // Update user with new profile picture URL
    user.profilePicture = `/uploads/profiles/${req.file.filename}`;
    await user.save();
    
    return res.json({
      message: 'Profile picture uploaded successfully',
      profilePicture: user.profilePicture
    });
  } catch (err) {
    console.error('Profile picture upload error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/profile/:id/picture - Delete profile picture
router.delete('/:id/picture', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ message: 'User id required' });
    
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (user.profilePicture) {
      const picturePath = path.join(__dirname, '../uploads/profiles', path.basename(user.profilePicture));
      if (fs.existsSync(picturePath)) {
        fs.unlinkSync(picturePath);
      }
      
      user.profilePicture = null;
      await user.save();
    }
    
    return res.json({ message: 'Profile picture deleted successfully' });
  } catch (err) {
    console.error('Profile picture delete error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;