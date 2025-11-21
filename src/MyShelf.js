import React, { useState, useEffect } from 'react';
import './myshelves.css';

export default function MyShelf({ user }) {
  const [shelves, setShelves] = useState([]);
  const [selectedShelf, setSelectedShelf] = useState(null);
  const [books, setBooks] = useState([]);
  const [showAddBook, setShowAddBook] = useState(false);
  const [showCreateShelf, setShowCreateShelf] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [showBookDetails, setShowBookDetails] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid'); // 'grid', 'list'

  useEffect(() => {
    if (!user?.id) return;
    fetchShelves();
    fetchStats();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedShelf && (selectedShelf._id || selectedShelf.isDefault)) {
      fetchShelfBooks(selectedShelf);
    }
  }, [selectedShelf]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchShelves = async () => {
    try {
      const response = await fetch(`/api/shelves/${user.id}`);
      const data = await response.json();
      if (response.ok) {
        setShelves(data.shelves);
        if (data.shelves.length > 0 && !selectedShelf) {
          setSelectedShelf(data.shelves[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching shelves:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchShelfBooks = async (shelf) => {
    try {
      if (!shelf || typeof shelf !== 'object') {
        return;
      }
      
      const shelfName = shelf.isDefault ? shelf.name : 'custom';
      const params = new URLSearchParams({
        sort: 'createdAt',
        order: 'desc',
        limit: '100'
      });
      
      if (!shelf.isDefault) {
        params.append('customShelfName', shelf.name);
      }

      const response = await fetch(`/api/shelves/${user.id}/books/${shelfName}?${params}`);
      
      const data = await response.json();
      
      if (response.ok) {
        const books = data.books || [];
        setBooks(books);
      } else {
        setBooks([]);
      }
    } catch (error) {
      console.error('Error fetching shelf books:', error);
      setBooks([]);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/books/${user.id}/stats`);
      const data = await response.json();
      if (response.ok) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const searchBooks = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(`/api/books/${user.id}/search?q=${encodeURIComponent(query)}&maxResults=8`);
      const data = await response.json();
      
      if (response.ok && data.books) {
        setSearchResults(data.books);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleBookSelect = (book) => {
    setSelectedBook(book);
    setShowBookDetails(true);
  };

  const addBookToShelf = async (book, targetShelf) => {
    try {
      const bookData = {
        ...book,
        shelf: targetShelf.isDefault ? targetShelf.name : 'custom',
        customShelfName: targetShelf.isDefault ? '' : targetShelf.name
      };

      const response = await fetch(`/api/books/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData)
      });

      if (response.ok) {
        await fetchShelves();
        if (selectedShelf && 
            ((selectedShelf.isDefault && selectedShelf.name === targetShelf.name) ||
             (!selectedShelf.isDefault && selectedShelf.name === targetShelf.name))) {
          await fetchShelfBooks(selectedShelf);
        }
        
        // Reset states
        setShowAddBook(false);
        setShowBookDetails(false);
        setSelectedBook(null);
        setSearchQuery('');
        setSearchResults([]);
        
      } else {
        const errorData = await response.json();
      }
    } catch (error) {
    }
  };

  const moveBook = async (bookId, targetShelf) => {
    try {
      const response = await fetch(`/api/books/${user.id}/${bookId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetShelf: targetShelf.isDefault ? targetShelf.name : 'custom',
          customShelfName: targetShelf.isDefault ? '' : targetShelf.name
        })
      });

      if (response.ok) {
        await fetchShelves();
        await fetchShelfBooks(selectedShelf);
        await fetchStats();
      }
    } catch (error) {
      console.error('Error moving book:', error);
    }
  };

  const deleteBook = async (bookId) => {
    if (!window.confirm('Are you sure you want to delete this book from your library?')) {
      return;
    }

    try {
      const response = await fetch(`/api/books/${user.id}/${bookId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchShelves();
        await fetchShelfBooks(selectedShelf);
        await fetchStats();
      } else {
        const errorData = await response.json();
        alert('Failed to delete book. Please try again.');
      }
    } catch (error) {
      alert('Error deleting book. Please try again.');
    }
  };

  const deleteShelf = async (shelfToDelete) => {
    if (shelfToDelete.isDefault) {
      alert('Cannot delete default shelves.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the shelf "${shelfToDelete.name}"? All books in this shelf will be moved to "Want to Read".`)) {
      return;
    }

    try {
      const response = await fetch(`/api/shelves/${user.id}/${shelfToDelete._id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchShelves();
        // If we're currently viewing the deleted shelf, switch to first available shelf
        if (selectedShelf && selectedShelf._id === shelfToDelete._id) {
          const updatedShelves = await fetch(`/api/shelves/${user.id}`).then(r => r.json());
          if (updatedShelves.shelves.length > 0) {
            setSelectedShelf(updatedShelves.shelves[0]);
          }
        }
        await fetchStats();
      } else {
        const errorData = await response.json();
        console.error('Failed to delete shelf:', errorData.message);
        alert('Failed to delete shelf. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting shelf:', error);
      alert('Error deleting shelf. Please try again.');
    }
  };

  const createShelf = async (shelfData) => {
    try {
      console.log('Creating shelf with data:', shelfData);
      
      const response = await fetch(`/api/shelves/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shelfData)
      });

      console.log('Create shelf response status:', response.status);
      const data = await response.json();
      console.log('Create shelf response data:', data);

      if (response.ok) {
        console.log('Shelf created successfully, refreshing shelves...');
        await fetchShelves();
        setShowCreateShelf(false);
      } else {
        console.error('Failed to create shelf:', data);
      }
    } catch (error) {
      console.error('Error creating shelf:', error);
    }
  };



  const BookCard = ({ book, index }) => (
    <div
      className="book-card"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="book-cover">
        {book.coverImage ? (
          <img src={book.coverImage} alt={book.title} />
        ) : (
          <div className="book-cover-placeholder">
            <span>{book.title.charAt(0)}</span>
          </div>
        )}
        {book.readingProgress > 0 && (
          <div className="reading-progress">
            <div 
              className="progress-bar" 
              style={{ width: `${book.readingProgress}%` }}
            ></div>
            <span className="progress-text">{Math.round(book.readingProgress)}%</span>
          </div>
        )}
        <button 
          className="delete-book-btn"
          onClick={(e) => {
            e.stopPropagation();
            deleteBook(book._id);
          }}
          title="Delete book"
        >
          ×
        </button>
      </div>
      <div className="book-info">
        <h3 className="book-title">{book.title}</h3>
        <p className="book-author">{book.author}</p>
        {book.personalRating > 0 && (
          <div className="book-rating">
            {'★'.repeat(book.personalRating)}{'☆'.repeat(5 - book.personalRating)}
          </div>
        )}
        {book.personalNotes && (
          <p className="book-notes">{book.personalNotes.substring(0, 100)}...</p>
        )}
      </div>
    </div>
  );

  if (loading) {
    return <div className="shelves-loading">Loading your library...</div>;
  }

  return (
    <div className="my-shelves">
      {/* Stats Dashboard */}
      {stats && (
        <div className="reading-stats">
          <div className="stat-card">
            <div className="stat-number">{stats.totalBooks}</div>
            <div className="stat-label">Total Books</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.booksRead}</div>
            <div className="stat-label">Books Read</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.currentlyReading}</div>
            <div className="stat-label">Currently Reading</div>
          </div>
        </div>
      )}

      <div className="shelves-container">
        {/* Sidebar with shelves */}
        <div className="shelves-sidebar">
          <div className="sidebar-header">
            <h2>My Shelves</h2>
            <div className="sidebar-actions">
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => setShowAddBook(true)}
              >
                + Add Book
              </button>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setShowCreateShelf(true)}
              >
                + New Shelf
              </button>
            </div>
          </div>

          <div className="shelves-list">
            {shelves.map((shelf) => (
              <div
                key={shelf.name}
                className={`shelf-item ${selectedShelf?.name === shelf.name ? 'active' : ''}`}
                onClick={() => setSelectedShelf(shelf)}
              >
                <div className="shelf-info">
                  <span className="shelf-name">{shelf.displayName || shelf.name}</span>
                </div>
                <div className="shelf-actions">
                  <span className="shelf-count">{shelf.bookCount}</span>
                  {!shelf.isDefault && (
                    <button 
                      className="delete-shelf-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteShelf(shelf);
                      }}
                      title="Delete shelf"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main content area */}
        <div className="shelves-main">
          {selectedShelf && (
            <>
              <div className="shelf-header">
                <div className="shelf-title-section">
                  <h1>{selectedShelf.displayName || selectedShelf.name}</h1>
                  <span className="book-count">{books.length} books</span>
                </div>
              </div>

              <div className={`books-container ${view}`}>
                {books.length === 0 ? (
                  <div className="empty-shelf">
                    <div className="empty-icon">📚</div>
                    <h3>Your shelf is empty</h3>
                    <p>Start building your library by adding some books!</p>
                    <button 
                      className="btn btn-primary"
                      onClick={() => setShowAddBook(true)}
                    >
                      Add Your First Book
                    </button>
                  </div>
                ) : (
                  <div className="books-grid">
                    {books.map((book, index) => (
                      <BookCard key={book._id} book={book} index={index} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Book Modal */}
      {showAddBook && (
        <div className="add-book-overlay" onClick={() => {
          setShowAddBook(false);
          setSearchQuery('');
          setSearchResults([]);
          setSearchLoading(false);
        }}>
          <div className="add-book-modal" onClick={(e) => e.stopPropagation()}>
            <div className="add-book-header">
              <h2>Add a Book to Your Library</h2>
              <button className="close-btn" onClick={() => {
                setShowAddBook(false);
                setSearchQuery('');
                setSearchResults([]);
                setSearchLoading(false);
              }}>×</button>
            </div>
            
            <div className="add-book-content">
              <div className="book-search-section">
                <div className="search-container">
                  <input
                    type="text"
                    placeholder="Search for books by title, author, or ISBN..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      searchBooks(e.target.value);
                    }}
                    className="book-search-input"
                    autoFocus
                  />
                  {searchLoading && (
                    <div className="search-loading-indicator">
                      <div className="loading-spinner"></div>
                    </div>
                  )}
                </div>

                <div className="search-results-container">
                  {searchQuery.trim() === '' ? (
                    <div className="search-placeholder">
                      <div className="placeholder-icon">📚</div>
                      <p>Start typing to search for books...</p>
                      <small>Search by title, author, or ISBN to find books to add to your shelves</small>
                    </div>
                  ) : searchLoading ? (
                    <div className="search-loading">
                      <div className="loading-spinner large"></div>
                      <p>Searching for books...</p>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="no-search-results">
                      <div className="no-results-icon">🔍</div>
                      <p>No books found for "{searchQuery}"</p>
                      <small>Try a different search term or check your spelling</small>
                    </div>
                  ) : (
                    <div className="book-search-results">
                      {searchResults.map((book, index) => (
                        <div 
                          key={book.googleId || index} 
                          className="book-search-result"
                          onClick={() => handleBookSelect(book)}
                        >
                          <div className="book-result-cover">
                            {book.coverImage ? (
                              <img src={book.coverImage} alt={book.title} />
                            ) : (
                              <div className="book-result-placeholder">
                                <span>{book.title.charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                          </div>
                          <div className="book-result-info">
                            <h3 className="book-result-title">{book.title}</h3>
                            <p className="book-result-author">{book.author}</p>
                            {book.publishedDate && (
                              <p className="book-result-year">{new Date(book.publishedDate).getFullYear()}</p>
                            )}
                            {book.description && (
                              <p className="book-result-desc">
                                {book.description.length > 120 
                                  ? `${book.description.substring(0, 120)}...` 
                                  : book.description}
                              </p>
                            )}
                          </div>
                          <div className="book-result-actions">
                            <button className="select-book-btn">
                              Select Book
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Book Details & Shelf Selection Modal */}
      {showBookDetails && selectedBook && (
        <div className="book-details-overlay" onClick={() => {
          setShowBookDetails(false);
          setSelectedBook(null);
        }}>
          <div className="book-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="book-details-header">
              <h2>Add to Shelf</h2>
              <button className="close-btn" onClick={() => {
                setShowBookDetails(false);
                setSelectedBook(null);
              }}>×</button>
            </div>
            
            <div className="book-details-content">
              <div className="book-preview">
                <div className="book-preview-cover">
                  {selectedBook.coverImage ? (
                    <img src={selectedBook.coverImage} alt={selectedBook.title} />
                  ) : (
                    <div className="book-preview-placeholder">
                      <span>{selectedBook.title.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                </div>
                <div className="book-preview-info">
                  <h3>{selectedBook.title}</h3>
                  <p className="book-author">{selectedBook.author}</p>
                  {selectedBook.publishedDate && (
                    <p className="book-year">Published: {new Date(selectedBook.publishedDate).getFullYear()}</p>
                  )}
                  {selectedBook.pageCount > 0 && (
                    <p className="book-pages">{selectedBook.pageCount} pages</p>
                  )}
                  {selectedBook.categories && selectedBook.categories.length > 0 && (
                    <div className="book-categories">
                      {selectedBook.categories.slice(0, 3).map((category, index) => (
                        <span key={index} className="book-category">{category}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {selectedBook.description && (
                <div className="book-description">
                  <h4>Description</h4>
                  <p>{selectedBook.description}</p>
                </div>
              )}

              <div className="shelf-selection">
                <h4>Choose a shelf for this book:</h4>
                <div className="shelf-options">
                  {shelves.map((shelf) => (
                    <button
                      key={shelf.name}
                      className="shelf-option-btn"
                      onClick={() => addBookToShelf(selectedBook, shelf)}
                    >
                      <span className="shelf-name">{shelf.displayName || shelf.name}</span>
                      <span className="shelf-book-count">({shelf.bookCount})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Shelf Modal */}
      {showCreateShelf && (
        <CreateShelfModal 
          onClose={() => setShowCreateShelf(false)}
          onCreateShelf={createShelf}
        />
      )}
    </div>
  );
}

function CreateShelfModal({ onClose, onCreateShelf }) {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });



  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.name.trim()) {
      onCreateShelf(formData);
    }
  };

  return (
    <div className="add-book-overlay" onClick={onClose}>
      <div className="add-book-modal" onClick={(e) => e.stopPropagation()}>
        <div className="add-book-header">
          <h2>Create New Shelf</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form className="add-book-content" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Shelf Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Science Fiction, Favorites, To Read Later"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description for your shelf"
              rows="3"
            />
          </div>



          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Shelf
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}