import React, { useEffect, useState, useRef } from 'react';
import './dashboard.css';

export default function Recommendations({ user }) {
  const [recommendations, setRecommendations] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(null); // Track which book is being added
  const [refreshing, setRefreshing] = useState(false);
  const coversRef = useRef({});

  useEffect(() => {
    if (user) {
      loadRecommendations();
    }
  }, [user]);

  const loadRecommendations = async (refresh = false) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/books/${user.id}/recommendations?maxResults=8&refresh=${refresh}`);
      const data = await response.json();
      
      if (data.recommendations) {
        setRecommendations(data.recommendations);
        setPreferences(data.preferences);
        // Preload covers
        setTimeout(() => loadCovers(data.recommendations), 100);
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadCovers = async (books) => {
    for (const book of books) {
      if (book.coverImage) {
        coversRef.current[book.id] = book.coverImage;
      } else {
        // Try to get cover from Google Books if not available
        try {
          const query = encodeURIComponent(`${book.title} ${book.author}`);
          const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`);
          if (res.ok) {
            const data = await res.json();
            if (data.items && data.items[0] && data.items[0].volumeInfo.imageLinks) {
              const cover = data.items[0].volumeInfo.imageLinks.thumbnail.replace('http:', 'https:');
              coversRef.current[book.id] = cover;
            }
          }
        } catch (e) {
          // Ignore cover loading errors
        }
      }
    }
    // Force re-render to show loaded covers
    setRecommendations(prev => [...prev]);
  };

  const addToShelf = async (book, shelf = 'want-to-read') => {
    try {
      setAdding(book.id);
      
      const bookData = {
        title: book.title,
        author: book.author,
        description: book.description,
        coverImage: book.coverImage,
        pageCount: book.pageCount,
        categories: book.categories,
        isbn: book.isbn,
        shelf: shelf,
        publishedDate: book.publishedDate ? new Date(book.publishedDate) : null
      };

      const response = await fetch(`/api/books/${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookData),
      });

      if (response.ok) {
        // Remove from recommendations after successful add
        setRecommendations(prev => prev.filter(rec => rec.id !== book.id));
        
        // Show success message (you could add a toast notification here)
      } else {
        // Failed to add book
      }
    } catch (error) {
      // Error adding book
    } finally {
      setAdding(null);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadRecommendations(true);
  };

  if (loading && !refreshing) {
    return (
      <div className="dash-root">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ 
            fontSize: '18px', 
            color: '#6b3f2b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              border: '2px solid #b85a46',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            Loading your personalized recommendations...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-root" style={{ padding: '0 20px' }}>
      {/* Preferences Summary */}
      {preferences && (
        <section style={{ 
          background: '#fff', 
          border: '1px solid rgba(106,74,60,0.08)', 
          borderRadius: '12px', 
          padding: '20px',
          marginBottom: '25px'
        }}>
          <h2 style={{ 
            margin: '0 0 15px 0', 
            color: '#6b3f2b', 
            fontSize: '18px',
            fontWeight: '600'
          }}>
            
             Based on Your Reading Profile
          </h2>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            {preferences.topCategories.length > 0 && (
              <div>
                <span style={{ fontWeight: '600', color: '#8b6b5c' }}>Favorite Genres: </span>
                {preferences.topCategories.map((cat, idx) => (
                  <span key={cat} style={{ 
                    background: '#f8f9fa', 
                    padding: '4px 8px', 
                    borderRadius: '12px', 
                    fontSize: '12px',
                    margin: '0 4px',
                    color: '#6b3f2b',
                    fontWeight: '500'
                  }}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </span>
                ))}
              </div>
            )}
            <div style={{ 
              background: 'rgba(102, 161, 90, 0.1)', 
              padding: '8px 12px', 
              borderRadius: '20px',
              fontSize: '14px',
              color: '#66a15a',
              fontWeight: '600'
            }}>
               {preferences.totalBooks} books in your library
            </div>
          </div>
        </section>
      )}

      {/* Actions */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px' 
      }}>
        <h2 className="recs-title" style={{ margin: 0 }}>
          Today's Picks for You
        </h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            background: refreshing ? '#ccc' : '#b85a46',
            color: 'white',
            border: 'none',
            padding: '10px 16px',
            borderRadius: '8px',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px'
          }}
        >
          {refreshing ? (
            <>
              <div style={{
                width: '14px',
                height: '14px',
                border: '2px solid white',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Refreshing...
            </>
          ) : (
            <>Get New Picks</>
          )}
        </button>
      </div>

      {/* Recommendations Grid */}
      {recommendations.length > 0 ? (
        <div className="recs-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '20px',
          marginBottom: '30px'
        }}>
          {recommendations.map(book => (
            <article key={book.id} className="rec-card" style={{
              background: '#fff',
              border: '1px solid rgba(106,74,60,0.08)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-start',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
              {/* Book Cover */}
              <div style={{
                width: '80px',
                height: '120px',
                flexShrink: 0,
                borderRadius: '8px',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #dee2e6'
              }}>
                {book.coverImage || coversRef.current[book.id] ? (
                  <img 
                    src={book.coverImage || coversRef.current[book.id]} 
                    alt={book.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#6b3f2b',
                  display: book.coverImage || coversRef.current[book.id] ? 'none' : 'flex'
                }}>
                  {book.title ? book.title.charAt(0).toUpperCase() : ''}
                </div>
              </div>

              {/* Book Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '16px', 
                  fontWeight: '600',
                  color: '#2d2d2d',
                  lineHeight: '1.3',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {book.title}
                </h3>
                
                <div style={{ 
                  color: '#8b6b5c', 
                  fontSize: '14px', 
                  marginBottom: '8px',
                  fontWeight: '500'
                }}>
                  by {book.author}
                </div>

                <p style={{ 
                  color: '#666', 
                  fontSize: '13px', 
                  lineHeight: '1.4',
                  margin: '0 0 12px 0',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {book.description}
                </p>

                {book.reason && (
                  <div style={{
                    fontSize: '12px',
                    color: '#66a15a',
                    background: 'rgba(102, 161, 90, 0.1)',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    marginBottom: '12px',
                    fontWeight: '500',
                    display: 'inline-block'
                  }}>
                     {book.reason}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  marginTop: 'auto'
                }}>
                  <button
                    onClick={() => addToShelf(book, 'want-to-read')}
                    disabled={adding === book.id}
                    style={{
                      background: adding === book.id ? '#ccc' : '#b85a46',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      cursor: adding === book.id ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      fontSize: '12px',
                      flex: 1
                    }}
                  >
                    {adding === book.id ? '' : ' Add to Want to Read'}
                  </button>
                  
                  <button
                    onClick={() => addToShelf(book, 'currently-reading')}
                    disabled={adding === book.id}
                    style={{
                      background: 'transparent',
                      color: '#6b3f2b',
                      border: '1px solid rgba(106,74,60,0.2)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      cursor: adding === book.id ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      fontSize: '12px'
                    }}
                  >
                     Start Reading
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px',
          background: '#fff',
          borderRadius: '12px',
          border: '1px solid rgba(106,74,60,0.08)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}></div>
          <h3 style={{ color: '#6b3f2b', marginBottom: '8px' }}>No recommendations available</h3>
          <p style={{ color: '#666', margin: 0 }}>
            Add some books to your shelves to get personalized recommendations!
          </p>
        </div>
      )}
    </div>
  );
}