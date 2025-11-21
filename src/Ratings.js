import React, { useState, useEffect } from 'react';
import './ratings.css';

export default function Ratings({ user }) {
  const [ratings, setRatings] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratedBooksSearch, setRatedBooksSearch] = useState([]);
  const [ratedSearchQuery, setRatedSearchQuery] = useState('');
  const [ratedSearchResults, setRatedSearchResults] = useState([]);
  const [expandedComments, setExpandedComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [isPublicProfile, setIsPublicProfile] = useState(true);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [sortBy, setSortBy] = useState('rating'); // 'rating', 'recent'

  useEffect(() => {
    if (user?.id) {
      fetchUserProfile();
      fetchRatings();
    }
  }, [user, sortBy]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.search-container')) {
        setSearchResults([]);
        setRatedSearchResults([]);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSearchResults([]);
        setRatedSearchResults([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    fetchRatedBooksSearch();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`/api/profile/${user.id}`);
      const data = await response.json();
      if (response.ok && data.user) {
        setIsPublicProfile(data.user.profileVisibility === 'public');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchRatings = async () => {
    try {
      const response = await fetch(`/api/ratings?sort=${sortBy}&limit=5`);
      const data = await response.json();
      if (response.ok) {
        setRatings(data.ratings || []);
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRatedBooksSearch = async () => {
    try {
      const response = await fetch('/api/ratings?sort=rating');
      const data = await response.json();
      if (response.ok) {
        setRatedBooksSearch(data.ratings || []);
      }
    } catch (error) {
      console.error('Error fetching rated books for search:', error);
    }
  };

  const searchRatedBooks = (query) => {
    if (!query.trim()) {
      setRatedSearchResults([]);
      return;
    }

    const filtered = ratedBooksSearch
      .filter(book => 
        book.bookTitle.toLowerCase().includes(query.toLowerCase()) ||
        book.bookAuthor.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 5); // Limit to top 5 results

    setRatedSearchResults(filtered);
  };

  const searchBooks = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/books/${user.id}/search?q=${encodeURIComponent(query)}&maxResults=10`);
      const data = await response.json();
      if (response.ok) {
        setSearchResults(data.books);
      }
    } catch (error) {
      console.error('Error searching books:', error);
    }
  };

  const handleBookSelect = (book) => {
    if (!isPublicProfile) return; // Only public users can rate
    
    setSelectedBook(book);
    setNewRating(0);
    setNewComment('');
    setShowRatingForm(true);
    setSearchResults([]);
    setSearchQuery('');
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const clearRatedSearch = () => {
    setRatedSearchQuery('');
    setRatedSearchResults([]);
  };

  const submitRating = async () => {
    if (!selectedBook || newRating === 0) return;

    const ratingData = {
      userId: user.id,
      bookId: selectedBook.googleId || selectedBook.id,
      bookTitle: selectedBook.title,
      bookAuthor: selectedBook.author,
      bookCover: selectedBook.coverImage,
      rating: newRating,
      comment: newComment.trim()
    };

    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ratingData)
      });

      if (response.ok) {
        setShowRatingForm(false);
        setSelectedBook(null);
        setNewRating(0);
        setNewComment('');
        fetchRatings(); // Refresh ratings
      } else {
        const error = await response.json();
        alert(error.message || 'Error submitting rating');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Error submitting rating');
    }
  };

  const renderStars = (rating, interactive = false, onStarClick = null) => {
    return (
      <div className={`stars ${interactive ? 'interactive' : ''}`}>
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={`star ${star <= rating ? 'filled' : ''}`}
            onClick={interactive ? () => onStarClick(star) : undefined}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const toggleComments = (bookId) => {
    setExpandedComments(prev => ({
      ...prev,
      [bookId]: !prev[bookId]
    }));
  };

  const renderRatingCard = (ratingData) => {
    const isExpanded = expandedComments[ratingData.bookId];
    const commentsToShow = isExpanded ? ratingData.comments : ratingData.comments?.slice(0, 1);
    const hasMoreComments = ratingData.comments && ratingData.comments.length > 1;

    return (
      <div key={ratingData.bookId} className="rating-card">
        <div className="book-info">
          <div className="book-cover">
            {ratingData.bookCover ? (
              <img src={ratingData.bookCover} alt={ratingData.bookTitle} />
            ) : (
              <div className="book-cover-placeholder">
                <span>{ratingData.bookTitle.charAt(0)}</span>
              </div>
            )}
          </div>
          <div className="book-details">
            <h3 className="book-title">{ratingData.bookTitle}</h3>
            <p className="book-author">{ratingData.bookAuthor}</p>
            <div className="rating-summary">
              {renderStars(ratingData.averageRating || ratingData.rating)}
              <span className="rating-text">
                {ratingData.averageRating 
                  ? `${ratingData.averageRating.toFixed(1)} (${ratingData.totalRatings} ${ratingData.totalRatings === 1 ? 'rating' : 'ratings'})`
                  : `${ratingData.rating}/5`
                }
              </span>
            </div>
          </div>
        </div>
        
        {/* User comments */}
        {ratingData.comments && ratingData.comments.length > 0 && (
          <div className="comments-section">
            <div className="comments-header">
              <h4>Comments:</h4>
              {hasMoreComments && (
                <button 
                  className="comments-toggle"
                  onClick={() => toggleComments(ratingData.bookId)}
                >
                  {isExpanded ? `Hide ${ratingData.comments.length - 1} more` : `Show ${ratingData.comments.length - 1} more`}
                </button>
              )}
            </div>
            {commentsToShow?.map(comment => (
              <div key={comment.id} className="comment">
                <div className="comment-header">
                  <span className="comment-user">{comment.userName}</span>
                  {renderStars(comment.rating)}
                  <span className="comment-date">{new Date(comment.createdAt).toLocaleDateString()}</span>
                </div>
                {comment.text && <p className="comment-text">{comment.text}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="ratings-loading">Loading ratings...</div>;
  }

  return (
    <div className="ratings-container">
      <div className="ratings-header">
        <h2>Book Ratings</h2>
        <div className="ratings-controls">
          <div className="sort-controls">
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="rating">Highest Rated</option>
              <option value="recent">Most Recent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Profile status indicator */}
      <div className={`profile-status ${isPublicProfile ? 'public' : 'private'}`}>
        <span className="status-icon">{isPublicProfile ? '' : ''}</span>
        <span className="status-text">
          {isPublicProfile 
            ? 'Your profile is public - you can rate and comment on books' 
            : 'Your profile is private - you can view ratings but cannot rate or comment'
          }
        </span>
      </div>

      {/* Search section - only for public users */}
      {isPublicProfile && (
        <div className="search-section">
          <h3>Rate a Book</h3>
          <div className="search-container">
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="Search for books to rate..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchBooks(e.target.value);
                }}
                className="search-input"
              />
              {(searchQuery || searchResults.length > 0) && (
                <button 
                  className="clear-search-btn"
                  onClick={clearSearch}
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>
            
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((book, index) => (
                  <div
                    key={book.googleId || book.id || `book-${index}`}
                    className="search-result-item"
                    onClick={() => handleBookSelect(book)}
                  >
                    <div className="book-cover-small">
                      {book.coverImage ? (
                        <img src={book.coverImage} alt={book.title} />
                      ) : (
                        <div className="book-cover-placeholder-small">
                          <span>{book.title.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                    <div className="book-info-small">
                      <h4>{book.title}</h4>
                      <p>{book.author}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search Rated Books section */}
      <div className="search-section">
        <h3>Search Rated Books</h3>
        <div className="search-container">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Search already rated books..."
              value={ratedSearchQuery}
              onChange={(e) => {
                setRatedSearchQuery(e.target.value);
                searchRatedBooks(e.target.value);
              }}
              className="search-input"
            />
            {(ratedSearchQuery || ratedSearchResults.length > 0) && (
              <button 
                className="clear-search-btn"
                onClick={clearRatedSearch}
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>
          
          {ratedSearchResults.length > 0 && (
            <div className="search-results">
              {ratedSearchResults.map((book) => (
                <div key={book.bookId} className="search-result-item rated-book-result">
                  <div className="book-cover-small">
                    {book.bookCover ? (
                      <img src={book.bookCover} alt={book.bookTitle} />
                    ) : (
                      <div className="book-cover-placeholder-small">
                        <span>{book.bookTitle.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="book-info-small">
                    <h4>{book.bookTitle}</h4>
                    <p>{book.bookAuthor}</p>
                    <div className="rating-preview">
                      {renderStars(book.averageRating)}
                      <span className="rating-preview-text">
                        {book.averageRating.toFixed(1)} ({book.totalRatings})
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rating form modal */}
      {showRatingForm && selectedBook && (
        <div className="rating-modal-overlay" onClick={() => setShowRatingForm(false)}>
          <div className="rating-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Rate: {selectedBook.title}</h3>
              <button className="close-button" onClick={() => setShowRatingForm(false)}>×</button>
            </div>
            <div className="modal-content">
              <div className="book-preview">
                <div className="book-cover-small">
                  {selectedBook.coverImage ? (
                    <img src={selectedBook.coverImage} alt={selectedBook.title} />
                  ) : (
                    <div className="book-cover-placeholder-small">
                      <span>{selectedBook.title.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div>
                  <h4>{selectedBook.title}</h4>
                  <p>{selectedBook.author}</p>
                </div>
              </div>
              
              <div className="rating-input">
                <label>Your Rating:</label>
                {renderStars(newRating, true, setNewRating)}
              </div>
              
              <div className="comment-input">
                <label>Comment (optional):</label>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts about this book..."
                  rows={4}
                />
              </div>
              
              <div className="modal-actions">
                <button 
                  className="submit-button"
                  onClick={submitRating}
                  disabled={newRating === 0}
                >
                  Submit Rating
                </button>
                <button 
                  className="cancel-button"
                  onClick={() => setShowRatingForm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ratings display */}
      <div className="ratings-content">
        {ratings.length === 0 ? (
          <div className="no-ratings">
            <p>No books have been rated yet.</p>
            {isPublicProfile && <p>Be the first to rate a book!</p>}
          </div>
        ) : (
          <div className="ratings-list">
            {ratings.map(rating => renderRatingCard(rating))}
          </div>
        )}
      </div>
    </div>
  );
}