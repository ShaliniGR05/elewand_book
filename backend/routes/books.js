const express = require('express');
const mongoose = require('mongoose');
const fetch = require('node-fetch');
const Book = require('../models/Book');
const router = express.Router();

// Simple in-memory book "database" for demo purposes (keeping for recommendations)
const BOOKS = [
  { id: 'b1', title: 'The Silent Patient', author: 'Alex Michaelides', genre: 'crimeThriller', desc: 'A psychological thriller about a woman who stopped speaking after a violent act.' },
  { id: 'b2', title: 'Gone Girl', author: 'Gillian Flynn', genre: 'crimeThriller', desc: 'A twisty thriller about a missing wife and secrets.' },
  { id: 'b3', title: 'It', author: 'Stephen King', genre: 'horror', desc: 'A group of friends face a terrifying entity in their small town.' },
  { id: 'b4', title: 'The Haunting of Hill House', author: 'Shirley Jackson', genre: 'horror', desc: 'A classic eerie haunted-house story.' },
  { id: 'b5', title: 'The Hobbit', author: 'J.R.R. Tolkien', genre: 'fantasy', desc: 'Bilbo Baggins goes on an unexpected adventure.' },
  { id: 'b6', title: 'The Name of the Wind', author: 'Patrick Rothfuss', genre: 'fantasy', desc: 'An epic tale of a young magician and storyteller.' },
  { id: 'b7', title: 'Meditations', author: 'Marcus Aurelius', genre: 'philosophy', desc: 'Stoic reflections and practical wisdom.' },
  { id: 'b8', title: 'The Republic', author: 'Plato', genre: 'philosophy', desc: 'A foundational work of political philosophy and justice.' },
];

// GET /api/books?genre=crimeThriller (keeping for recommendations)
router.get('/', (req, res) => {
  const genre = (req.query.genre || '').toString();
  const rawLimit = req.query.limit;
  const rawScore = req.query.score;
  let limit = 6;
  if (rawLimit !== undefined) {
    const l = parseInt(rawLimit, 10);
    if (!Number.isNaN(l) && l > 0) limit = l;
  } else if (rawScore !== undefined) {
    const s = Number(rawScore);
    if (!Number.isNaN(s)) {
      limit = Math.max(1, Math.round(s / 10));
    }
  }

  const filtered = BOOKS.filter(b => !genre || b.genre === genre);
  const subset = filtered.slice(0, limit);
  return res.json({ books: subset });
});

// POST /api/books/:userId - Add a new book
router.post('/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const bookData = {
      ...req.body,
      userId
    };

    if (bookData.shelf === 'custom' && !bookData.customShelfName) {
      return res.status(400).json({ message: 'Custom shelf name is required' });
    }

    const book = new Book(bookData);
    await book.save();

    res.status(201).json({ message: 'Book added successfully', book });
  } catch (error) {
    console.error('Error adding book:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/books/:userId/:bookId - Update a book
router.put('/:userId/:bookId', async (req, res) => {
  try {
    const { userId, bookId } = req.params;
    const updates = req.body;

    const book = await Book.findOne({ _id: bookId, userId });
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        book[key] = updates[key];
      }
    });

    if (updates.currentPage !== undefined && book.pageCount > 0) {
      book.readingProgress = Math.min(100, (book.currentPage / book.pageCount) * 100);
      
      if (book.readingProgress >= 100 && book.shelf === 'currently-reading') {
        book.shelf = 'read';
        book.finishedReading = new Date();
      }
    }

    await book.save();
    res.json({ message: 'Book updated successfully', book });
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/books/:userId/:bookId - Delete a book
router.delete('/:userId/:bookId', async (req, res) => {
  try {
    const { userId, bookId } = req.params;

    const result = await Book.deleteOne({ _id: bookId, userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/books/:userId/:bookId/move - Move book to different shelf
router.post('/:userId/:bookId/move', async (req, res) => {
  try {
    const { userId, bookId } = req.params;
    const { targetShelf, customShelfName } = req.body;

    const book = await Book.findOne({ _id: bookId, userId });
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const oldShelf = book.shelf;
    book.shelf = targetShelf;
    
    if (targetShelf === 'custom') {
      if (!customShelfName) {
        return res.status(400).json({ message: 'Custom shelf name is required' });
      }
      book.customShelfName = customShelfName;
    } else {
      book.customShelfName = '';
    }

    if (targetShelf === 'currently-reading' && oldShelf !== 'currently-reading') {
      book.startedReading = new Date();
    } else if (targetShelf === 'read' && oldShelf !== 'read') {
      book.finishedReading = new Date();
      book.readingProgress = 100;
      book.currentPage = book.pageCount;
    }

    await book.save();
    res.json({ message: 'Book moved successfully', book });
  } catch (error) {
    console.error('Error moving book:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/books/:userId/:bookId/reading-session - Add a reading session
router.post('/:userId/:bookId/reading-session', async (req, res) => {
  try {
    const { userId, bookId } = req.params;
    const { pagesRead, timeSpent, notes } = req.body;

    const book = await Book.findOne({ _id: bookId, userId });
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    book.readingSessions.push({
      pagesRead: pagesRead || 0,
      timeSpent: timeSpent || 0,
      notes: notes || ''
    });

    if (pagesRead > 0) {
      book.currentPage = Math.min(book.pageCount, book.currentPage + pagesRead);
      if (book.pageCount > 0) {
        book.readingProgress = Math.min(100, (book.currentPage / book.pageCount) * 100);
      }
    }

    if (timeSpent > 0) {
      book.readingTime += timeSpent;
    }

    if (book.readingProgress >= 100 && book.shelf === 'currently-reading') {
      book.shelf = 'read';
      book.finishedReading = new Date();
    }

    await book.save();
    res.json({ message: 'Reading session added successfully', book });
  } catch (error) {
    console.error('Error adding reading session:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/books/:userId/search - Search books from Google Books API
router.get('/:userId/search', async (req, res) => {
  try {
    const { q, maxResults = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=${maxResults}`
    );
    
    if (!response.ok) {
      throw new Error('Google Books API error');
    }

    const data = await response.json();
    
    const books = (data.items || []).map(item => {
      const volumeInfo = item.volumeInfo || {};
      const imageLinks = volumeInfo.imageLinks || {};
      
      return {
        googleId: item.id,
        title: volumeInfo.title || 'Unknown Title',
        author: (volumeInfo.authors || []).join(', ') || 'Unknown Author',
        description: volumeInfo.description || '',
        pageCount: volumeInfo.pageCount || 0,
        publishedDate: volumeInfo.publishedDate ? new Date(volumeInfo.publishedDate) : null,
        publisher: volumeInfo.publisher || '',
        language: volumeInfo.language || 'en',
        categories: volumeInfo.categories || [],
        coverImage: imageLinks.thumbnail ? imageLinks.thumbnail.replace('http:', 'https:') : null,
        isbn: volumeInfo.industryIdentifiers ? 
          volumeInfo.industryIdentifiers.find(id => id.type === 'ISBN_13')?.identifier ||
          volumeInfo.industryIdentifiers.find(id => id.type === 'ISBN_10')?.identifier || ''
          : ''
      };
    });

    res.json({ books });
  } catch (error) {
    console.error('Error searching books:', error);
    res.status(500).json({ message: 'Error searching books' });
  }
});

// GET /api/books/:userId/recommendations - Get personalized book recommendations
router.get('/:userId/recommendations', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { maxResults = 8, refresh = false } = req.query;
    
    // Get user's books to analyze reading preferences
    const userBooks = await Book.find({ userId: new mongoose.Types.ObjectId(userId) });
    
    if (userBooks.length === 0) {
      // New users get general recommendations
      const fallbackBooks = BOOKS.slice(0, parseInt(maxResults));
      return res.json({ recommendations: fallbackBooks, reason: 'general' });
    }

    // Calculate genre preferences using shelf weights
    const genreScores = {};
    const shelfWeights = {
      'favorites': 5,
      'read': 3,
      'currently-reading': 2,
      'want-to-read': 1,
      'dnf': -3
    };

    // Analyze user's book categories and authors
    const authorPreferences = {};
    const categoryPreferences = {};

    userBooks.forEach(book => {
      const weight = shelfWeights[book.shelf] || 0;
      
      // Count author preferences
      if (book.author) {
        authorPreferences[book.author] = (authorPreferences[book.author] || 0) + weight;
      }
      
      // Count category preferences
      if (book.categories && book.categories.length > 0) {
        book.categories.forEach(category => {
          const normalizedCat = category.toLowerCase();
          categoryPreferences[normalizedCat] = (categoryPreferences[normalizedCat] || 0) + weight;
        });
      }
    });

    // Find top preferences
    const topCategories = Object.entries(categoryPreferences)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .filter(([_, score]) => score > 0)
      .map(([cat, _]) => cat);

    const topAuthors = Object.entries(authorPreferences)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .filter(([_, score]) => score > 0)
      .map(([author, _]) => author);

    // Get books user already has to avoid duplicates
    const existingTitles = userBooks.map(b => b.title.toLowerCase());
    const existingAuthors = userBooks.map(b => b.author.toLowerCase());

    let recommendations = [];
    
    // Search for books based on preferences
    const searchQueries = [];
    
    // Add category-based searches
    topCategories.forEach(category => {
      searchQueries.push(category);
    });
    
    // Add some general popular terms if we don't have enough categories
    if (searchQueries.length < 2) {
      const fallbackCategories = ['bestseller', 'fiction', 'popular'];
      searchQueries.push(...fallbackCategories.slice(0, 3 - searchQueries.length));
    }

    // Fetch recommendations from Google Books API
    for (const query of searchQueries.slice(0, 2)) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&orderBy=relevance`
        );
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.items) {
            data.items.forEach(item => {
              const volumeInfo = item.volumeInfo || {};
              const imageLinks = volumeInfo.imageLinks || {};
              
              const title = volumeInfo.title || 'Unknown Title';
              const author = (volumeInfo.authors || []).join(', ') || 'Unknown Author';
              
              // Skip if user already has this book or author
              if (existingTitles.includes(title.toLowerCase()) || 
                  existingAuthors.includes(author.toLowerCase())) {
                return;
              }
              
              // Skip if already in recommendations
              if (recommendations.some(rec => rec.title.toLowerCase() === title.toLowerCase())) {
                return;
              }

              recommendations.push({
                id: `rec_${item.id}`,
                title,
                author,
                description: volumeInfo.description ? 
                  volumeInfo.description.substring(0, 200) + (volumeInfo.description.length > 200 ? '...' : '') 
                  : 'No description available.',
                coverImage: imageLinks.thumbnail ? 
                  imageLinks.thumbnail.replace('http:', 'https:') : null,
                pageCount: volumeInfo.pageCount || 0,
                categories: volumeInfo.categories || [],
                publishedDate: volumeInfo.publishedDate,
                isbn: volumeInfo.industryIdentifiers ? 
                  volumeInfo.industryIdentifiers.find(id => id.type === 'ISBN_13')?.identifier ||
                  volumeInfo.industryIdentifiers.find(id => id.type === 'ISBN_10')?.identifier || ''
                  : '',
                googleId: item.id,
                reason: `Based on your interest in ${query}`
              });
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching recommendations for ${query}:`, error);
      }
    }

    // Limit results and shuffle for variety
    recommendations = recommendations
      .slice(0, parseInt(maxResults) * 2)
      .sort(() => Math.random() - 0.5)
      .slice(0, parseInt(maxResults));

    // If we don't have enough recommendations, add some fallbacks
    if (recommendations.length < 3) {
      const fallbacks = BOOKS
        .filter(book => !existingTitles.includes(book.title.toLowerCase()))
        .slice(0, parseInt(maxResults) - recommendations.length);
      
      recommendations.push(...fallbacks);
    }

    res.json({ 
      recommendations: recommendations.slice(0, parseInt(maxResults)),
      preferences: {
        topCategories,
        topAuthors,
        totalBooks: userBooks.length
      }
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ message: 'Error generating recommendations' });
  }
});

// GET /api/books/:userId/books - Get user's books with optional shelf filtering
router.get('/:userId/books', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { shelf, customShelfName, sort = 'createdAt', order = 'desc', limit = 100 } = req.query;
    
    let query = { userId: new mongoose.Types.ObjectId(userId) };
    
    // Filter by shelf if specified
    if (shelf) {
      if (shelf === 'custom' && customShelfName) {
        query.shelf = 'custom';
        query.customShelfName = customShelfName;
      } else if (shelf !== 'custom') {
        query.shelf = shelf;
      }
    }
    
    const books = await Book.find(query)
      .sort({ [sort]: order === 'desc' ? -1 : 1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json({ books });
  } catch (error) {
    console.error('Error fetching user books:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/books/:userId/stats - Get reading statistics
router.get('/:userId/stats', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const stats = await Book.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalBooks: { $sum: 1 },
          booksRead: { $sum: { $cond: [{ $eq: ['$shelf', 'read'] }, 1, 0] } },
          currentlyReading: { $sum: { $cond: [{ $eq: ['$shelf', 'currently-reading'] }, 1, 0] } },
          totalPages: { $sum: '$pageCount' },
          pagesRead: { $sum: '$currentPage' },
          totalReadingTime: { $sum: '$readingTime' },
          averageRating: { $avg: { $cond: [{ $gt: ['$personalRating', 0] }, '$personalRating', null] } }
        }
      }
    ]);

    const result = stats[0] || {
      totalBooks: 0,
      booksRead: 0,
      currentlyReading: 0,
      totalPages: 0,
      pagesRead: 0,
      totalReadingTime: 0,
      averageRating: 0
    };

    const thisYear = new Date().getFullYear();
    const yearlyStats = await Book.aggregate([
      { 
        $match: { 
          userId: new mongoose.Types.ObjectId(userId),
          finishedReading: {
            $gte: new Date(`${thisYear}-01-01`),
            $lt: new Date(`${thisYear + 1}-01-01`)
          }
        }
      },
      {
        $group: {
          _id: null,
          booksThisYear: { $sum: 1 },
          pagesThisYear: { $sum: '$pageCount' }
        }
      }
    ]);

    const yearly = yearlyStats[0] || { booksThisYear: 0, pagesThisYear: 0 };

    res.json({
      ...result,
      ...yearly,
      readingEfficiency: result.pagesRead > 0 ? (result.pagesRead / result.totalPages * 100).toFixed(1) : 0
    });
  } catch (error) {
    console.error('Error fetching reading stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
