import React, { useState, useEffect } from 'react';
import './profile.css';

export default function Profile({ user }) {
  const [profileData, setProfileData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    location: '',
    website: '',
    profileVisibility: 'public',
    profile: {
      crimeThriller: 0,
      horror: 0,
      fantasy: 0,
      philosophy: 0
    }
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [picturePreview, setPicturePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/profile/${user.id}`);
      const data = await response.json();
      
      if (response.ok && data.user) {
        setProfileData(data.user);
        setFormData({
          name: data.user.name || '',
          bio: data.user.bio || '',
          location: data.user.location || '',
          website: data.user.website || '',
          profileVisibility: data.user.profileVisibility || 'public',
          profile: {
            crimeThriller: data.user.profile?.crimeThriller || 0,
            horror: data.user.profile?.horror || 0,
            fantasy: data.user.profile?.fantasy || 0,
            philosophy: data.user.profile?.philosophy || 0
          }
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('profile.')) {
      const profileField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          [profileField]: parseInt(value) || 0
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handlePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPicturePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadProfilePicture = async () => {
    if (!profilePicture) return;
    
    const formData = new FormData();
    formData.append('profilePicture', profilePicture);
    
    try {
      const response = await fetch(`/api/profile/${user.id}/picture`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (response.ok) {
        setProfileData(prev => ({ ...prev, profilePicture: data.profilePicture }));
        setProfilePicture(null);
        setPicturePreview(null);
        return true;
      } else {
        console.error('Error uploading picture:', data.message);
        return false;
      }
    } catch (error) {
      console.error('Error uploading picture:', error);
      return false;
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      // Upload picture first if there's one
      if (profilePicture) {
        const pictureUploaded = await uploadProfilePicture();
        if (!pictureUploaded) {
          setSaving(false);
          return;
        }
      }



      // Update profile data
      const response = await fetch(`/api/profile/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (response.ok) {
        setProfileData(data.user);
        setIsEditing(false);
        // Force re-fetch to ensure we have the latest data
        await fetchProfile();
      } else {
        console.error('Error saving profile:', data.message);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteProfilePicture = async () => {
    try {
      const response = await fetch(`/api/profile/${user.id}/picture`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setProfileData(prev => ({ ...prev, profilePicture: null }));
      }
    } catch (error) {
      console.error('Error deleting picture:', error);
    }
  };

  if (loading) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  if (!profileData) {
    return <div className="profile-error">Error loading profile</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-picture-section">
          <div className="profile-picture">
            {picturePreview ? (
              <img src={picturePreview} alt="Preview" />
            ) : profileData.profilePicture ? (
              <img src={profileData.profilePicture} alt={profileData.name} />
            ) : (
              <div className="profile-picture-placeholder">
                {profileData.name?.charAt(0) || 'U'}
              </div>
            )}
          </div>
          
          {isEditing && (
            <div className="picture-controls">
              <input
                type="file"
                accept="image/*"
                onChange={handlePictureChange}
                id="picture-upload"
                style={{ display: 'none' }}
              />
              <label htmlFor="picture-upload" className="btn btn-secondary">
                Choose Photo
              </label>
              {profileData.profilePicture && (
                <button 
                  className="btn btn-danger"
                  onClick={deleteProfilePicture}
                  type="button"
                >
                  Remove
                </button>
              )}
            </div>
          )}
        </div>

        <div className="profile-info">
          {isEditing ? (
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="profile-name-input"
              placeholder="Your name"
            />
          ) : (
            <h1 className="profile-name">{profileData.name}</h1>
          )}
          
          <p className="profile-email">{profileData.email}</p>
          <p className="profile-joined">
            Joined {new Date(profileData.joinedDate || profileData.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="profile-actions">
          {isEditing ? (
            <div className="edit-actions">
              <button 
                className="btn btn-primary" 
                onClick={saveProfile}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setIsEditing(false);
                  setPicturePreview(null);
                  setProfilePicture(null);
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button 
              className="btn btn-primary" 
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-section">
          <h2>About</h2>
          {isEditing ? (
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              placeholder="Tell us about yourself..."
              className="profile-bio-input"
              rows="4"
            />
          ) : (
            <p className="profile-bio">
              {profileData.bio || 'No bio added yet.'}
            </p>
          )}
        </div>

        <div className="profile-section">
          <h2>Details</h2>
          <div className="profile-details">
            <div className="detail-item">
              <label>Location:</label>
              {isEditing ? (
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Your location"
                  className="detail-input"
                />
              ) : (
                <span>{profileData.location || 'Not specified'}</span>
              )}
            </div>
            
            <div className="detail-item">
              <label>Website:</label>
              {isEditing ? (
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="https://your-website.com"
                  className="detail-input"
                />
              ) : (
                <span>
                  {profileData.website ? (
                    <a href={profileData.website} target="_blank" rel="noopener noreferrer">
                      {profileData.website}
                    </a>
                  ) : (
                    'Not specified'
                  )}
                </span>
              )}
            </div>
            
            <div className="detail-item">
              <label>Profile Visibility:</label>
              {isEditing ? (
                <div className="visibility-toggle">
                  <label className="toggle-option">
                    <input
                      type="radio"
                      name="profileVisibility"
                      value="public"
                      checked={formData.profileVisibility === 'public'}
                      onChange={handleInputChange}
                    />
                    <span>Public</span>
                  </label>
                  <label className="toggle-option">
                    <input
                      type="radio"
                      name="profileVisibility"
                      value="private"
                      checked={formData.profileVisibility === 'private'}
                      onChange={handleInputChange}
                    />
                    <span>Private</span>
                  </label>
                </div>
              ) : (
                <span className={`visibility-badge ${profileData.profileVisibility || 'public'}`}>
                  {(profileData.profileVisibility || 'public') === 'public' ? ' Public' : ' Private'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h2>Reading Preferences</h2>
          <div className="preferences-grid">
            {Object.entries(formData.profile).map(([key, value]) => (
              <div key={key} className="preference-item">
                <label className="preference-label">
                  {key === 'crimeThriller' ? 'Crime/Thriller' : 
                   key.charAt(0).toUpperCase() + key.slice(1)}:
                </label>
                {isEditing ? (
                  <input
                    type="range"
                    name={`profile.${key}`}
                    value={value}
                    onChange={handleInputChange}
                    min="0"
                    max="10"
                    className="preference-slider"
                  />
                ) : null}
                <span className="preference-value">{value}/10</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}