const express = require('express');
const mongoose = require('mongoose');
const Book = require('../models/Book');
const Rating = require('../models/Rating');
const router = express.Router();

// GET /api/activity/:userId - Get user's reading activity statistics
router.get('/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Get all books for the user
    const allBooks = await Book.find({ userId });
    
    // Get completed books (read shelf)
    const completedBooks = allBooks.filter(book => book.shelf === 'read');
    
    // Get currently reading books
    const currentlyReadingBooks = allBooks.filter(book => book.shelf === 'currently-reading');
    
    // Get total books in all shelves
    const totalBooks = allBooks.length;
    
    // Get user's ratings and calculate average rating
    const userRatings = await Rating.find({ userId });
    const totalRatings = userRatings.length;
    const averageRating = totalRatings > 0 
      ? userRatings.reduce((sum, rating) => sum + rating.rating, 0) / totalRatings 
      : 0;
    


    const activityStats = {
      totalBooks,
      completedBooks: completedBooks.length,
      currentlyReadingBooks: currentlyReadingBooks.length,
      totalRatings,
      averageRating: Math.round(averageRating * 10) / 10 // rounded to 1 decimal
    };

    res.json({
      success: true,
      activity: activityStats
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching activity data' 
    });
  }
});

module.exports = router;