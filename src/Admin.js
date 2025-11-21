import React, { useEffect, useMemo, useState } from 'react';
import './dashboard.css';

// small helper to fetch JSON and attach x-user from localStorage for admin check
function fetchJson(url, opts = {}) {
  const stored = localStorage.getItem('bv_user');
  const headers = { ...(opts.headers || {}) };
  if (stored) headers['x-user'] = stored;
  
  console.log('fetchJson - URL:', url);
  console.log('fetchJson - Headers:', headers);
  
  return fetch(url, { ...opts, headers }).then(async (r) => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw data;
    return data;
  });
}

export default function Admin() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('users'); // 'users' | 'analytics'

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bv_user');
      if (stored) setUser(JSON.parse(stored));
    } catch (_) {}
  }, []);

  const isAdmin = useMemo(() => {
    try {
      const email = (user && user.email ? user.email : '').toLowerCase();
      return email === 'grshalinissm@gmail.com';
    } catch (_) { return false; }
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === 'users') loadUsers();
    if (tab === 'analytics') loadStats();
  }, [tab, isAdmin]);

  useEffect(() => { if (isAdmin) loadUsers(); }, [isAdmin]);

  async function loadUsers() {
    setLoadingUsers(true);
    setUsersError(null);
    try {
      console.log('Fetching users from /api/admin/users...');
      const data = await fetchJson('/api/admin/users');
      console.log('Received user data:', data);
      setUsers((data && data.users) || []);
    } catch (e) {
      console.error('Error loading users:', e);
      setUsersError(e.message || 'Failed to load users');
      setUsers([]);
    } finally { 
      setLoadingUsers(false); 
    }
  }

  async function loadStats() {
    try {
      const data = await fetchJson('/api/admin/stats');
      setStats(data);
    } catch (e) { console.error(e); setStats(null); }
  }

  // simple inline bar chart without external deps
  function Bar({ label, value, max }) {
    const pct = max ? Math.round((value / max) * 100) : 0;
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span>{label}</span>
          <span>{value}</span>
        </div>
        <div style={{ background: '#eee', height: 10, borderRadius: 6 }}>
          <div style={{ width: pct + '%', height: '100%', background: '#6c5ce7', borderRadius: 6 }} />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="dash-root">
        <header className="dash-header">
          <div className="dash-inner"><h1 className="dash-title">Admin Panel</h1></div>
        </header>
        <div style={{ padding: 20 }}>Access denied. Admins only.</div>
      </div>
    );
  }

  const genreTotals = stats?.profileSums || { crimeThriller: 0, horror: 0, fantasy: 0, philosophy: 0 };
  const maxVal = Math.max(genreTotals.crimeThriller, genreTotals.horror, genreTotals.fantasy, genreTotals.philosophy, 1);

  return (
    <div className="dash-root admin-root">
      <header className="dash-header admin-header" style={{ 
        background: 'linear-gradient(135deg, #b85a46 0%, #6b3f2b 100%)',
        color: 'white'
      }}>
        <div className="dash-inner admin-inner">
          <div>
            <h1 className="dash-title" style={{ color: 'white', fontSize: '32px' }}>
               Admin Panel
            </h1>
            <p className="dash-sub" style={{ color: 'rgba(255,255,255,0.9)', margin: '8px 0 0 0' }}>
              Manage users and view activity analytics
            </p>
          </div>
          <div className="dash-actions">
            <div style={{ 
              marginRight: 16, 
              color: 'rgba(255,255,255,0.9)',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
               Hi, <strong style={{ color: 'white' }}>{user && user.name}</strong>
            </div>
            <button 
              className="dash-logout" 
              onClick={() => { localStorage.removeItem('bv_user'); window.location.href = '/'; }}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '2px solid rgba(255,255,255,0.3)',
                color: 'white',
                padding: '10px 16px',
                borderRadius: '8px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
               Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Top Navigation */}
      <div className="admin-top-nav">
        <div className="admin-nav-inner">
          <nav className="admin-nav-buttons">
            <button 
              className={`admin-nav-btn ${tab === 'users' ? 'active' : ''}`} 
              onClick={() => setTab('users')}
            >
               Manage Users
            </button>
            <button 
              className={`admin-nav-btn ${tab === 'analytics' ? 'active' : ''}`} 
              onClick={() => setTab('analytics')}
            >
               Analytics
            </button>
          </nav>
        </div>
      </div>

      <div className="dash-body-full">
        <main className="dash-main-full">
          {tab === 'users' && (
            <section className="users-section">
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ 
                  margin: '0 0 8px 0', 
                  color: '#2c3e50',
                  fontSize: '28px',
                  fontWeight: '600'
                }}>Registered Users</h2>
                <p style={{ 
                  margin: '0 0 20px 0', 
                  color: '#6c757d',
                  fontSize: '14px'
                }}>Manage and view all users registered on the platform</p>
              </div>
              
              <div style={{ 
                marginBottom: '24px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '16px',
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                borderRadius: '12px',
                border: '1px solid #dee2e6'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button 
                    className="rec-btn ghost" 
                    onClick={loadUsers}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '2px solid #b85a46',
                      background: 'transparent',
                      color: '#b85a46',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                     Refresh Users
                  </button>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: '16px'
                }}>
                  <span style={{ 
                    color: '#495057', 
                    fontSize: '14px',
                    fontWeight: '500',
                    padding: '8px 12px',
                    background: 'white',
                    borderRadius: '8px',
                    border: '1px solid #dee2e6'
                  }}>
                     Total: <strong style={{ color: '#b85a46' }}>{users.length}</strong> user{users.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              {loadingUsers ? (
                <div style={{ 
                  padding: '40px 20px', 
                  textAlign: 'center', 
                  background: 'white',
                  borderRadius: '12px',
                  border: '1px solid #dee2e6',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <div style={{
                    display: 'inline-block',
                    width: '40px',
                    height: '40px',
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #b85a46',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '16px'
                  }}></div>
                  <div style={{ color: '#6c757d', fontSize: '16px', fontWeight: '500' }}>Loading users...</div>
                  <div style={{ color: '#adb5bd', fontSize: '14px', marginTop: '8px' }}>Please wait while we fetch user data</div>
                </div>
              ) : usersError ? (
                <div style={{ 
                  padding: '40px 20px', 
                  textAlign: 'center', 
                  background: '#fff5f5',
                  borderRadius: '12px', 
                  border: '2px solid #fed7d7',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}></div>
                  <h3 style={{ color: '#e53e3e', margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>Error Loading Users</h3>
                  <p style={{ color: '#c53030', margin: '0 0 20px 0', fontSize: '14px' }}>{usersError}</p>
                  <button 
                    className="rec-btn" 
                    onClick={loadUsers}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #e53e3e, #c53030)',
                      color: 'white',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                     Try Again
                  </button>
                </div>
              ) : users.length === 0 ? (
                <div style={{ 
                  padding: '40px 20px', 
                  textAlign: 'center', 
                  background: 'white',
                  borderRadius: '12px',
                  border: '2px dashed #dee2e6',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>👥</div>
                  <h3 style={{ color: '#495057', margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>No Users Found</h3>
                  <p style={{ color: '#6c757d', margin: '0 0 20px 0', fontSize: '14px' }}>
                    No users have registered yet, or there might be a connection issue.
                  </p>
                  <button 
                    className="rec-btn" 
                    onClick={loadUsers}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #b85a46, #6b3f2b)',
                      color: 'white',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                     Try Again
                  </button>
                </div>
              ) : (
                <div className="table-container">
                  <table className="admin-table users-table">
                    <thead>
                      <tr>
                        <th className="th-name">Name</th>
                        <th className="th-email">Email</th>
                        <th className="th-joined">Joined</th>
                        <th className="th-preferences">Profile Preferences</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u, index) => (
                        <tr key={u._id}>
                          <td className="user-name">
                            <div style={{ fontWeight: '600', color: '#2c3e50' }}>
                              {u.name || <span style={{ color: '#95a5a6', fontStyle: 'italic' }}>No name provided</span>}
                            </div>
                          </td>
                          <td className="user-email">
                            <div style={{ wordBreak: 'break-word', color: '#34495e' }}>{u.email}</div>
                          </td>
                          <td className="user-joined">
                            <div>{new Date(u.createdAt).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}</div>
                            <div style={{ color: '#adb5bd', fontSize: '12px' }}>
                              {new Date(u.createdAt).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                          </td>
                          <td className="user-preferences">
                            {u.profile ? (
                              <div className="preference-badges">
                                {u.profile.crimeThriller > 0 && (
                                  <span className="preference-badge" style={{ 
                                    background: 'linear-gradient(135deg, #ff6b6b, #ee5a52)', 
                                    color: 'white'
                                  }}>
                                    Crime/Thriller: {u.profile.crimeThriller}
                                  </span>
                                )}
                                {u.profile.horror > 0 && (
                                  <span className="preference-badge" style={{ 
                                    background: 'linear-gradient(135deg, #4ecdc4, #44a08d)', 
                                    color: 'white'
                                  }}>
                                     Horror: {u.profile.horror}
                                  </span>
                                )}
                                {u.profile.fantasy > 0 && (
                                  <span className="preference-badge" style={{ 
                                    background: 'linear-gradient(135deg, #45b7d1, #3498db)', 
                                    color: 'white'
                                  }}>
                                     Fantasy: {u.profile.fantasy}
                                  </span>
                                )}
                                {u.profile.philosophy > 0 && (
                                  <span className="preference-badge" style={{ 
                                    background: 'linear-gradient(135deg, #f9ca24, #f0932b)', 
                                    color: '#2c3e50'
                                  }}>
                                     Philosophy: {u.profile.philosophy}
                                  </span>
                                )}
                                {(!u.profile.crimeThriller && !u.profile.horror && !u.profile.fantasy && !u.profile.philosophy) && 
                                  <span className="no-preferences">No preferences set</span>}
                              </div>
                            ) : (
                              <span className="no-preferences">No profile data</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {tab === 'analytics' && (
            <section style={{ padding: 20 }}>
              <h2>Analytics</h2>
              {!stats ? (
                <div>
                  <button className="rec-btn ghost" onClick={loadStats}>Load Analytics</button>
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: 12 }}>Total users: <strong>{stats.totalUsers}</strong></div>
                  <div style={{ maxWidth: 600 }}>
                    <Bar label="Crime/Thriller" value={genreTotals.crimeThriller} max={maxVal} />
                    <Bar label="Horror" value={genreTotals.horror} max={maxVal} />
                    <Bar label="Fantasy" value={genreTotals.fantasy} max={maxVal} />
                    <Bar label="Philosophy" value={genreTotals.philosophy} max={maxVal} />
                  </div>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
