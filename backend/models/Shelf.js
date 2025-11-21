const mongoose = require('mongoose');

const ShelfSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isDefault: { type: Boolean, default: false },
    color: { type: String, default: '#4285f4' }, // Hex color for shelf theme
    icon: { type: String, default: '📚' }, // Emoji icon
    isPrivate: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    // Reading goals for this shelf
    yearlyGoal: { type: Number, default: 0 },
    currentYearProgress: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Index for efficient queries
ShelfSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Shelf', ShelfSchema);