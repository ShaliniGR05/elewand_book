import React, { useEffect, useState, useRef } from 'react';
import './dashboard.css';
import Sidebar from './Sidebar';
import Profile from './Profile';
import MyShelf from './MyShelf';
import Analyse from './Analyse';
import Ratings from './Ratings';
import Recommendations from './Recommendations';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [books, setBooks] = useState([]);
  const [currentView, setCurrentView] = useState('dashboard');
  const [coversLoaded, setCoversLoaded] = useState(false);
  // cache map: title/ISBN -> image url or null (if not found)
  const coversRef = useRef({});
  const [loading, setLoading] = useState(true);
  const [activityData, setActivityData] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('bv_user');
    if (!stored) { setLoading(false); return; }
    const u = JSON.parse(stored);
    setUser(u);
    // fetch profile
    fetch(`/api/auth/profile/${u.id}`)
      .then(r => r.json())
      .then(data => {
        if (data && data.profile) setProfile(data.profile);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    
    // fetch activity data
    setActivityLoading(true);
    fetch(`/api/activity/${u.id}`)
      .then(r => r.json())
      .then(data => {
        if (data && data.success) setActivityData(data.activity);
      })
      .catch(() => {})
      .finally(() => setActivityLoading(false));
  }, []);

  useEffect(() => {
    if (!profile) return;
    // pick genre with highest score
    const entries = Object.entries(profile);
    if (!entries.length) return;
    let top = entries[0];
    for (const e of entries) if ((e[1] || 0) > (top[1] || 0)) top = e;
    const genre = top[0];
    // send score so server can return an appropriate number of books
    const score = profile[genre] || 0;
    fetch(`/api/books?genre=${genre}&score=${encodeURIComponent(score)}`)
      .then(r => r.json())
      .then(data => { if (data && data.books) setBooks(data.books); })
      .catch(() => {});
  }, [profile]);

  // helper: try to resolve a cover image for a book using several free services
  // order: Google Books (search by title/author), then Open Library (by ISBN if present), then null
  async function resolveCover(b) {
    const key = (b.isbn || b.title || '').trim();
    if (!key) return null;
    if (coversRef.current[key] !== undefined) return coversRef.current[key];

    // Try Google Books API (no API key required for simple search)
    try {
      const q = encodeURIComponent(`${b.title} ${b.author || ''}`);
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=5`);
      if (res.ok) {
        const jd = await res.json();
        if (jd.items && jd.items.length) {
          // prefer items with imageLinks
          for (const it of jd.items) {
            if (it.volumeInfo && it.volumeInfo.imageLinks && it.volumeInfo.imageLinks.thumbnail) {
              const thumb = it.volumeInfo.imageLinks.thumbnail.replace(/^http:/, 'https:');
              coversRef.current[key] = thumb;
              return thumb;
            }
          }
        }
      }
    } catch (e) {
      // ignore and try fallback
    }

    // Try Open Library by ISBN if available
    if (b.isbn) {
      try {
        const isbn = b.isbn.replace(/[^0-9Xx]/g, '');
        const url = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
        // quick HEAD-ish check by fetching and checking status
        const r = await fetch(url, { method: 'GET' });
        if (r.ok) {
          coversRef.current[key] = url;
          return url;
        }
      } catch (e) {}
    }

    // not found
    coversRef.current[key] = null;
    return null;
  }

  // Preload covers for books when books change
  useEffect(() => {
    if (!books || !books.length) return;
    setCoversLoaded(false);
    let mounted = true;
    (async () => {
      const promises = books.map(async (b) => {
        try {
          await resolveCover(b);
        } catch (e) {}
      });
      await Promise.all(promises);
      // Trigger re-render only after all covers are loaded
      if (mounted) {
        setCoversLoaded(true);
      }
    })();
    return () => { mounted = false; };
  }, [books]);

  const handleLogout = () => {
    try { localStorage.removeItem('bv_user'); } catch (e) {}
    window.location.href = '/';
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
  };

  if (loading) return <div className="dash-root"><div className="dash-inner">Loading...</div></div>;

  return (
    <div className="dash-root">
      <header className="dash-header">
        <div className="dash-inner">
          <h1 className="dash-title">
            {currentView === 'profile' ? 'Profile' : 
             currentView === 'shelves' ? 'Shelves' : 
             currentView === 'analyse' ? 'Reading Analysis' :
             currentView === 'ratings' ? 'Book Ratings' :
             currentView === 'recommendations' ? 'Book Recommendations' :
             'Dashboard'}
          </h1>
          <div className="dash-actions">
            {user && <div className="dash-greeting">Hi, <strong>{user.name}</strong></div>}
            <button className="dash-logout" onClick={handleLogout}>Logout</button>
          </div>
        </div>
        <p className="dash-sub">
          {currentView === 'profile' 
            ? 'Manage your profile and reading preferences' 
            : currentView === 'shelves'
            ? 'Organize and track your personal book collection'
            : currentView === 'ratings'
            ? 'Rate books and read reviews from other readers'
            : currentView === 'recommendations'
            ? 'Discover new books tailored to your reading preferences'
            : 'EleWand Book recommendations just for you!'
          }
        </p>
      </header>

      <div className="dash-body">
        <Sidebar 
          user={user} 
          currentView={currentView} 
          onViewChange={handleViewChange} 
        />
        
        <main className="dash-main">
          {currentView === 'profile' ? (
            <Profile user={user} />
          ) : currentView === 'shelves' ? (
            <MyShelf user={user} />
          ) : currentView === 'analyse' ? (
            <Analyse user={user} profile={profile} />
          ) : currentView === 'ratings' ? (
            <Ratings user={user} />
          ) : currentView === 'recommendations' ? (
            <Recommendations user={user} />
          ) : (
            <>
              {!profile && (
                <section style={{padding:20}}>
                  <h2 className="recs-title">Set up your profile</h2>
                  <p className="recs-sub">We couldn't find your profile. <a href="/profile-setup">Click here to set it up</a>.</p>
                </section>
              )}

              {profile && (
                <>
                  <section className="recs-section">
                    <h2 className="recs-title">Reading Profile</h2>
                    <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12}}>
                      <div className="feature-card">
                        <div className="feature-name">Crime/Thriller</div>
                        <div style={{fontSize:20, fontWeight:700}}>{profile.crimeThriller || 0}</div>
                      </div>
                      <div className="feature-card">
                        <div className="feature-name">Horror</div>
                        <div style={{fontSize:20, fontWeight:700}}>{profile.horror || 0}</div>
                      </div>
                      <div className="feature-card">
                        <div className="feature-name">Fantasy</div>
                        <div style={{fontSize:20, fontWeight:700}}>{profile.fantasy || 0}</div>
                      </div>
                      <div className="feature-card">
                        <div className="feature-name">Philosophy</div>
                        <div style={{fontSize:20, fontWeight:700}}>{profile.philosophy || 0}</div>
                      </div>
                    </div>
                  </section>

                  {/* Activity Section */}
                  <section className="recs-section" style={{marginTop:20}}>
                    <h2 className="recs-title">Activity</h2>
                    {activityLoading ? (
                      <div style={{textAlign:'center', padding:20}}>Loading activity data...</div>
                    ) : activityData ? (
                      <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12}}>
                        <div className="feature-card">
                          <div className="feature-name">Books Completed</div>
                          <div style={{fontSize:20, fontWeight:700, color:'#66a15a'}}>{activityData.completedBooks || 0}</div>
                          <div style={{fontSize:12, color:'#5b6a6a'}}>Total finished books</div>
                        </div>
                        <div className="feature-card">
                          <div className="feature-name">Currently Reading</div>
                          <div style={{fontSize:20, fontWeight:700, color:'#f0a36e'}}>{activityData.currentlyReadingBooks || 0}</div>
                          <div style={{fontSize:12, color:'#5b6a6a'}}>Books in progress</div>
                        </div>
                        <div className="feature-card">
                          <div className="feature-name">Average Rating</div>
                          <div style={{fontSize:20, fontWeight:700, color:'#f39c12'}}>
                            {activityData.averageRating > 0 ? `${activityData.averageRating}★` : '0★'}
                          </div>
                          <div style={{fontSize:12, color:'#5b6a6a'}}>Your average book rating</div>
                        </div>
                        <div className="feature-card">
                          <div className="feature-name">Total Ratings</div>
                          <div style={{fontSize:20, fontWeight:700, color:'#e67e22'}}>{activityData.totalRatings || 0}</div>
                          <div style={{fontSize:12, color:'#5b6a6a'}}>Books you've rated</div>
                        </div>
                      </div>
                    ) : (
                      <div style={{textAlign:'center', padding:20, color:'#5b6a6a'}}>
                        Failed to load activity data. Please try refreshing the page.
                      </div>
                    )}
                  </section>
                </>
              )}

              {books && books.length > 0 && coversLoaded && (
                <section className="recs-section" style={{marginTop:20}}>
                  <h2 className="recs-title">Recommended Books</h2>
                  <div className="recs-grid">
                    {books.map(b => (
                      <article key={b.id} className="rec-card">
                        <div className="rec-thumb">
                          {(() => {
                            const key = (b.isbn || b.title || '').trim();
                            const img = key ? coversRef.current[key] : null;
                            if (img) {
                              return <img src={img} alt={b.title} style={{width:'100%',height:'100%',objectFit:'cover'}} />;
                            }
                            // fallback: first char
                            return b.title ? b.title.charAt(0) : '?';
                          })()}
                        </div>
                        <div className="rec-body">
                          <h3 className="rec-title">{b.title}</h3>
                          <div className="rec-author">by {b.author}</div>
                          <p className="rec-desc">{b.desc}</p>
                          <div className="rec-cta-row">
                            <button className="rec-btn">Save</button>
                            <button className="rec-btn ghost">Details</button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
