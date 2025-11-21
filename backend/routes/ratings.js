const express = require('express');
const Rating = require('../models/Rating');
const User = require('../models/User');
const router = express.Router();

// GET /api/ratings - Get all ratings with aggregated book data
router.get('/', async (req, res) => {
  try {
    const sortBy = req.query.sort || 'rating'; // 'rating' or 'recent'
    const limit = parseInt(req.query.limit) || 0; // 0 means no limit
    
    const ratingsData = await Rating.getBooksWithRatings(sortBy, limit);
    
    res.json({
      success: true,
      ratings: ratingsData
    });
  } catch (error) {
    console.error('Error fetching ratings:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching ratings'
    });
  }
});

// GET /api/ratings/book/:bookId - Get ratings for a specific book
router.get('/book/:bookId', async (req, res) => {
  try {
    const { bookId } = req.params;
    
    const bookStats = await Rating.getBookRatingStats(bookId);
    
    if (!bookStats) {
      return res.json({
        success: true,
        bookId,
        averageRating: 0,
        totalRatings: 0,
        ratings: []
      });
    }
    
    res.json({
      success: true,
      bookId: bookStats._id,
      averageRating: Math.round(bookStats.averageRating * 10) / 10,
      totalRatings: bookStats.totalRatings,
      ratings: bookStats.ratings
    });
  } catch (error) {
    console.error('Error fetching book ratings:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching book ratings'
    });
  }
});

// POST /api/ratings - Add or update a rating
router.post('/', async (req, res) => {
  try {
    const { userId, bookId, bookTitle, bookAuthor, bookCover, rating, comment } = req.body;
    
    // Validate required fields
    if (!userId || !bookId || !bookTitle || !bookAuthor || !rating) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields: userId, bookId, bookTitle, bookAuthor, rating'
      });
    }
    
    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }
    
    // Check if user exists and get their profile visibility
    const user = await User.findById(userId).select('name profileVisibility');
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if user's profile is public (only public users can rate)
    if (user.profileVisibility === 'private') {
      return res.status(403).json({ 
        success: false,
        message: 'Only users with public profiles can submit ratings'
      });
    }
    
    // Check if user has already rated this book
    const existingRating = await Rating.findOne({ userId, bookId });
    
    if (existingRating) {
      // Update existing rating
      existingRating.rating = rating;
      existingRating.comment = comment || '';
      existingRating.bookTitle = bookTitle;
      existingRating.bookAuthor = bookAuthor;
      existingRating.bookCover = bookCover || null;
      existingRating.userName = user.name;
      
      await existingRating.save();
      
      res.json({
        success: true,
        message: 'Rating updated successfully',
        rating: existingRating
      });
    } else {
      // Create new rating
      const newRating = new Rating({
        userId,
        userName: user.name,
        bookId,
        bookTitle,
        bookAuthor,
        bookCover: bookCover || null,
        rating,
        comment: comment || ''
      });
      
      await newRating.save();
      
      res.status(201).json({
        success: true,
        message: 'Rating created successfully',
        rating: newRating
      });
    }
    
  } catch (error) {
    console.error('Error saving rating:', error);
    
    // Handle duplicate key error (should not happen due to upsert logic above)
    if (error.code === 11000) {
      return res.status(409).json({ 
        success: false,
        message: 'You have already rated this book'
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Error saving rating'
    });
  }
});

// DELETE /api/ratings/:ratingId - Delete a rating (only by the user who created it)
router.delete('/:ratingId', async (req, res) => {
  try {
    const { ratingId } = req.params;
    const { userId } = req.body; // User ID should be sent in request body for security
    
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: 'User ID is required'
      });
    }
    
    // Find and verify ownership
    const rating = await Rating.findById(ratingId);
    if (!rating) {
      return res.status(404).json({ 
        success: false,
        message: 'Rating not found'
      });
    }
    
    // Check if the user owns this rating
    if (rating.userId.toString() !== userId) {
      return res.status(403).json({ 
        success: false,
        message: 'You can only delete your own ratings'
      });
    }
    
    await Rating.findByIdAndDelete(ratingId);
    
    res.json({
      success: true,
      message: 'Rating deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting rating:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting rating'
    });
  }
});

// GET /api/ratings/user/:userId - Get all ratings by a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const userRatings = await Rating.find({ userId })
      .sort({ createdAt: -1 })
      .select('-userId'); // Don't include userId in response for privacy
    
    res.json({
      success: true,
      ratings: userRatings
    });
    
  } catch (error) {
    console.error('Error fetching user ratings:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching user ratings'
    });
  }
});

module.exports = router;