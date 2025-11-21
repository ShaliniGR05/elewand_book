import React from 'react';
import './App.css';
import About from './about';
import Features from './features';
import Footer from './footer';
import Auth from './auth';
import Dashboard from './Dashboard';
import ProfileSetup from './ProfileSetup';
import Admin from './Admin';
import { Routes, Route, useNavigate } from 'react-router-dom';

function MainLanding() {
  // scroll handler to bring features section into view
  const scrollToFeatures = (e) => {
    if (e.type === 'keydown' && !['Enter', ' '].includes(e.key)) return;
    const el = document.querySelector('.features-section');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // scroll handler to bring about section into view
  const scrollToAbout = (e) => {
    if (e.type === 'keydown' && !['Enter', ' '].includes(e.key)) return;
    const el = document.querySelector('.about-section');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // scroll handler to bring contact/footer section into view
  const scrollToContact = (e) => {
    if (e.type === 'keydown' && !['Enter', ' '].includes(e.key)) return;
    const el = document.querySelector('.footer-section');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const [showAuth, setShowAuth] = React.useState(false);
  const navigate = useNavigate();

  // prevent background scroll when auth modal is open
  React.useEffect(() => {
    document.body.style.overflow = showAuth ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showAuth]);

  const openAuth = (e) => {
    if (e && e.type === 'keydown' && !['Enter', ' '].includes(e.key)) return;
    setShowAuth(true);
  };
  const closeAuth = () => setShowAuth(false);

  const handleAuthSuccess = (isSignUp) => {
    // Close modal and navigate: only send new users (signup) to profile setup
    setShowAuth(false);
    try {
      const stored = localStorage.getItem('bv_user');
      const u = stored ? JSON.parse(stored) : null;
      const email = (u && u.email) ? u.email.toString().toLowerCase() : '';
      if (email === 'grshalinissm@gmail.com') {
        navigate('/admin');
        return;
      }
    } catch (e) {
      // ignore parse errors
    }
    if (isSignUp) navigate('/profile-setup');
    else navigate('/dashboard');
  };

  return (
    <div className="App">
      <nav className="site-nav">
        <div className="nav-inner">
          <div className="brand">EleWand</div>
          <ul className="nav-links">
            <li
              role="button"
              tabIndex="0"
              onClick={scrollToAbout}
              onKeyDown={scrollToAbout}
            >
              About
            </li>
            <li
              role="button"
              tabIndex="0"
              onClick={scrollToFeatures}
              onKeyDown={scrollToFeatures}
            >
              Discover
            </li>
            <li
              role="button"
              tabIndex="0"
              onClick={scrollToContact}
              onKeyDown={scrollToContact}
            >
              Contact
            </li>
            <li
              role="button"
              tabIndex="0"
              onClick={openAuth}
              onKeyDown={openAuth}
            >
              Login/SignUp
            </li>
          </ul>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-inner">
          <div className="hello">Hello!</div>
          <h1 className="hero-title">
            <span className="welcome">Welcome</span>
            <span className="to"> To </span>
            <span className="elewand">EleWand</span>
            <span className="book"> Book</span>
            <br />
            <span className="recommend">Recommendations</span>
          </h1>
          <p className="tagline">Personalized book recommendations just for you!</p>

          <div className="cta-row">
            <button className="cta">
              <span className="play">▸</span>
              <span>EXPLORE NOW</span>
            </button>

            <div className="blocks">
              <span className="block" />
              <span className="block" />
              <span className="block" />
              <span className="block" />
              <span className="block small" />
            </div>
          </div>
        </div>
      </header>

      <About />

      <Features />

      <Footer />

      {/* Auth modal */}
      {showAuth && <Auth onClose={closeAuth} onAuthSuccess={handleAuthSuccess} />}
    </div>
  );
}

function App() {
  
  return (
    <Routes>
      <Route path="/" element={<MainLanding />} />
      <Route path="/profile-setup" element={<ProfileSetup />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  );
}

export default App;
