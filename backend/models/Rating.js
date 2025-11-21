const mongoose = require('mongoose');

const RatingSchema = new mongoose.Schema({
  // User who made the rating
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  
  // Book information
  bookId: {
    type: String,
    required: true
  },
  bookTitle: {
    type: String,
    required: true
  },
  bookAuthor: {
    type: String,
    required: true
  },
  bookCover: {
    type: String,
    default: null
  },
  
  // Rating and review
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    default: '',
    maxlength: 1000
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure one rating per user per book
RatingSchema.index({ userId: 1, bookId: 1 }, { unique: true });

// Index for efficient querying by book
RatingSchema.index({ bookId: 1 });

// Index for sorting by rating
RatingSchema.index({ rating: -1 });

// Index for sorting by date
RatingSchema.index({ createdAt: -1 });

// Update the updatedAt field on save
RatingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get average rating for a book
RatingSchema.statics.getBookRatingStats = async function(bookId) {
  const stats = await this.aggregate([
    { $match: { bookId: bookId } },
    {
      $group: {
        _id: '$bookId',
        averageRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 },
        ratings: {
          $push: {
            userId: '$userId',
            userName: '$userName',
            rating: '$rating',
            comment: '$comment',
            createdAt: '$createdAt'
          }
        }
      }
    }
  ]);
  
  return stats.length > 0 ? stats[0] : null;
};

// Static method to get all books with ratings sorted by average rating or recent
RatingSchema.statics.getBooksWithRatings = async function(sortBy = 'rating', limit = 0) {
  const pipeline = [
    {
      $group: {
        _id: '$bookId',
        bookTitle: { $first: '$bookTitle' },
        bookAuthor: { $first: '$bookAuthor' },
        bookCover: { $first: '$bookCover' },
        averageRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 },
        latestRating: { $max: '$createdAt' },
        comments: {
          $push: {
            id: '$_id',
            userId: '$userId',
            userName: '$userName',
            rating: '$rating',
            text: '$comment',
            createdAt: '$createdAt'
          }
        }
      }
    }
  ];

  // Add sorting based on the sortBy parameter
  if (sortBy === 'rating') {
    pipeline.push({ $sort: { averageRating: -1, totalRatings: -1 } });
  } else if (sortBy === 'recent') {
    pipeline.push({ $sort: { latestRating: -1 } });
  }

  // Add limit if specified
  if (limit > 0) {
    pipeline.push({ $limit: limit });
  }

  const results = await this.aggregate(pipeline);
  
  return results.map(book => ({
    bookId: book._id,
    bookTitle: book.bookTitle,
    bookAuthor: book.bookAuthor,
    bookCover: book.bookCover,
    averageRating: Math.round(book.averageRating * 10) / 10, // Round to 1 decimal
    totalRatings: book.totalRatings,
    comments: book.comments.filter(comment => comment.text && comment.text.trim() !== '')
  }));
};

module.exports = mongoose.model('Rating', RatingSchema);