const express = require('express');
const mongoose = require('mongoose');
const Book = require('../models/Book');
const Shelf = require('../models/Shelf');
const router = express.Router();

// GET /api/shelves/:userId - Get all shelves for a user
router.get('/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Get custom shelves
    const customShelves = await Shelf.find({ userId }).sort({ sortOrder: 1, createdAt: 1 });
    
    // Get default shelves with book counts
    const defaultShelves = [
      { name: 'want-to-read', displayName: 'Want to Read', icon: '📚', color: '#4285f4' },
      { name: 'currently-reading', displayName: 'Currently Reading', icon: '📖', color: '#34a853' },
      { name: 'read', displayName: 'Read', icon: '✅', color: '#fbbc04' },
      { name: 'favorites', displayName: 'Favorites', icon: '⭐', color: '#ea4335' },
      { name: 'dnf', displayName: 'Did Not Finish', icon: '⏸️', color: '#9aa0a6' }
    ];

    // Get book counts for each shelf
    const shelfCounts = await Book.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$shelf', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    shelfCounts.forEach(item => {
      countMap[item._id] = item.count;
    });

    // Add counts to default shelves
    const shelvesWithCounts = defaultShelves.map(shelf => ({
      ...shelf,
      bookCount: countMap[shelf.name] || 0,
      isDefault: true
    }));

    // Add counts to custom shelves
    const customShelvesWithCounts = await Promise.all(
      customShelves.map(async (shelf) => {
        const count = await Book.countDocuments({ 
          userId, 
          shelf: 'custom', 
          customShelfName: shelf.name 
        });
        return {
          ...shelf.toObject(),
          bookCount: count,
          isDefault: false
        };
      })
    );

    res.json({
      shelves: [...shelvesWithCounts, ...customShelvesWithCounts]
    });
  } catch (error) {
    console.error('Error fetching shelves:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/shelves/:userId - Create a new custom shelf
router.post('/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { name, description, color, icon } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Shelf name is required' });
    }

    // Check if shelf name already exists
    const existingShelf = await Shelf.findOne({ userId, name });
    if (existingShelf) {
      return res.status(400).json({ message: 'Shelf name already exists' });
    }

    const shelf = new Shelf({
      name,
      description: description || '',
      userId,
      color: color || '#4285f4',
      icon: icon || '📚'
    });

    await shelf.save();
    
    res.status(201).json({ 
      message: 'Shelf created successfully', 
      shelf: { ...shelf.toObject(), bookCount: 0, isDefault: false }
    });
  } catch (error) {
    console.error('Error creating shelf:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/shelves/:userId/:shelfId - Update a custom shelf
router.put('/:userId/:shelfId', async (req, res) => {
  try {
    const { userId, shelfId } = req.params;
    const { name, description, color, icon } = req.body;

    const shelf = await Shelf.findOne({ _id: shelfId, userId });
    if (!shelf) {
      return res.status(404).json({ message: 'Shelf not found' });
    }

    // Check if new name conflicts with existing shelves
    if (name && name !== shelf.name) {
      const existingShelf = await Shelf.findOne({ userId, name });
      if (existingShelf) {
        return res.status(400).json({ message: 'Shelf name already exists' });
      }
    }

    if (name) shelf.name = name;
    if (description !== undefined) shelf.description = description;
    if (color) shelf.color = color;
    if (icon) shelf.icon = icon;

    await shelf.save();

    res.json({ message: 'Shelf updated successfully', shelf });
  } catch (error) {
    console.error('Error updating shelf:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/shelves/:userId/:shelfId - Delete a custom shelf
router.delete('/:userId/:shelfId', async (req, res) => {
  try {
    const { userId, shelfId } = req.params;

    const shelf = await Shelf.findOne({ _id: shelfId, userId });
    if (!shelf) {
      return res.status(404).json({ message: 'Shelf not found' });
    }

    // Move all books from this custom shelf to "want-to-read"
    await Book.updateMany(
      { userId, shelf: 'custom', customShelfName: shelf.name },
      { shelf: 'want-to-read', customShelfName: '' }
    );

    await Shelf.deleteOne({ _id: shelfId, userId });

    res.json({ message: 'Shelf deleted successfully' });
  } catch (error) {
    console.error('Error deleting shelf:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/shelves/:userId/books/:shelfName - Get books in a specific shelf
router.get('/:userId/books/:shelfName', async (req, res) => {
  try {
    const { userId, shelfName } = req.params;
    const { sort = 'createdAt', order = 'desc', limit = 50, skip = 0 } = req.query;

    let query = { userId };
    
    if (shelfName === 'custom') {
      const customShelfName = req.query.customShelfName;
      if (!customShelfName) {
        return res.status(400).json({ message: 'Custom shelf name required' });
      }
      query.shelf = 'custom';
      query.customShelfName = customShelfName;
    } else {
      query.shelf = shelfName;
    }

    const sortObj = {};
    sortObj[sort] = order === 'desc' ? -1 : 1;

    const books = await Book.find(query)
      .sort(sortObj)
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const totalCount = await Book.countDocuments(query);

    res.json({
      books,
      totalCount,
      hasMore: totalCount > parseInt(skip) + books.length
    });
  } catch (error) {
    console.error('Error fetching shelf books:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;