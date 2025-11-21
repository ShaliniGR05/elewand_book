const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: false },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    profilePicture: { type: String, default: null }, // URL to uploaded profile picture
    bio: { type: String, default: '', maxlength: 500 },
    location: { type: String, default: '' },
    website: { type: String, default: '' },
    joinedDate: { type: Date, default: Date.now },
    profileVisibility: { type: String, enum: ['public', 'private'], default: 'public' },
    profile: {
      crimeThriller: { type: Number, default: 0 },
      horror: { type: Number, default: 0 },
      fantasy: { type: Number, default: 0 },
      philosophy: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
