const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    author: { type: String, required: true },
    isbn: { type: String, default: '' },
    description: { type: String, default: '' },
    coverImage: { type: String, default: null },
    pageCount: { type: Number, default: 0 },
    publishedDate: { type: Date, default: null },
    publisher: { type: String, default: '' },
    language: { type: String, default: 'English' },
    categories: [{ type: String }],
    // User-specific data
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    shelf: { 
      type: String, 
      enum: ['want-to-read', 'currently-reading', 'read', 'favorites', 'dnf', 'custom'],
      default: 'want-to-read' 
    },
    customShelfName: { type: String, default: '' }, // For custom shelves
    // Reading progress
    currentPage: { type: Number, default: 0 },
    readingProgress: { type: Number, default: 0 }, // Percentage
    startedReading: { type: Date, default: null },
    finishedReading: { type: Date, default: null },
    readingTime: { type: Number, default: 0 }, // Minutes spent reading
    // User notes and rating
    personalNotes: { type: String, default: '' },
    personalRating: { type: Number, min: 0, max: 5, default: 0 },
    tags: [{ type: String }],
    isPrivate: { type: Boolean, default: false },
    // Reading sessions for tracking
    readingSessions: [{
      date: { type: Date, default: Date.now },
      pagesRead: { type: Number, default: 0 },
      timeSpent: { type: Number, default: 0 }, // Minutes
      notes: { type: String, default: '' }
    }],
    // Goals and challenges
    readingGoal: {
      targetDate: { type: Date, default: null },
      dailyPageGoal: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

// Index for efficient queries
BookSchema.index({ userId: 1, shelf: 1 });
BookSchema.index({ userId: 1, title: 1 });
BookSchema.index({ userId: 1, author: 1 });

// Virtual for reading speed (pages per minute)
BookSchema.virtual('readingSpeed').get(function() {
  if (this.readingTime && this.currentPage) {
    return this.currentPage / this.readingTime;
  }
  return 0;
});

// Virtual for days reading
BookSchema.virtual('daysReading').get(function() {
  if (this.startedReading) {
    const now = this.finishedReading || new Date();
    return Math.ceil((now - this.startedReading) / (1000 * 60 * 60 * 24));
  }
  return 0;
});

module.exports = mongoose.model('Book', BookSchema);