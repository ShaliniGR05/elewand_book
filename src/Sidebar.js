import React from 'react';
import './sidebar.css';

function IconButton({ icon, label, onClick, isActive }) {
  return (
    <button 
      className={`sb-item ${isActive ? 'active' : ''}`} 
      aria-label={label} 
      title={label}
      onClick={onClick}
    >
      <div className="sb-icon" aria-hidden>{icon}</div>
      <span className="sb-tooltip" aria-hidden>{label}</span>
    </button>
  );
}

export default function Sidebar({ user, currentView, onViewChange }) {
  const handleProfileClick = () => {
    if (onViewChange) onViewChange('profile');
  };

  const handleShelvesClick = () => {
    if (onViewChange) onViewChange('shelves');
  };

  const handleDashboardClick = () => {
    if (onViewChange) onViewChange('dashboard');
  };

  const handleRecommendationsClick = () => {
    if (onViewChange) onViewChange('recommendations');
  };

  const handleRatingsClick = () => {
    if (onViewChange) onViewChange('ratings');
  };

  return (
    <aside className="sb-root">
      <nav className="sb-nav">
        <IconButton 
          icon={<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#6b3f2b" d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5 0-9 2.5-9 5v1h18v-1c0-2.5-4-5-9-5z"/></svg>} 
          label="Profile" 
          onClick={handleProfileClick}
          isActive={currentView === 'profile'}
        />
        <IconButton 
          icon={<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#4285f4" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>} 
          label="Dashboard" 
          onClick={handleDashboardClick}
          isActive={currentView === 'dashboard'}
        />
        <IconButton 
          icon={<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#b85a46" d="M3 6h18v2H3zM3 11h18v2H3zM3 16h18v2H3z"/></svg>} 
          label="My Shelves" 
          onClick={handleShelvesClick}
          isActive={currentView === 'shelves'}
        />
        <IconButton 
          icon={<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#667eea" d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.5 1-1v-1H9v1zm3-19C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .5.4 1 1 1h6c.6 0 1-.5 1-1v-2.3c1.8-1.3 3-3.4 3-5.7 0-3.9-3.1-7-7-7z"/></svg>} 
          label="Recommendations" 
          onClick={handleRecommendationsClick}
          isActive={currentView === 'recommendations'}
        />
        <IconButton 
          icon={<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#f39c12" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>} 
          label="Ratings" 
          onClick={handleRatingsClick}
          isActive={currentView === 'ratings'}
        />
      </nav>
    </aside>
  );
}
