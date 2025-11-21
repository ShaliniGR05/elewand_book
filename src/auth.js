import React, { useState, useEffect, useRef } from 'react';
import './auth.css';

const INITIAL_FORM = { name: '', email: '', password: '', confirm: '' };
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Auth({ onClose, onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [serverMsg, setServerMsg] = useState('');
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const refs = { name: useRef(null), email: useRef(null), password: useRef(null), confirm: useRef(null) };

  // Google Client ID - prefer env var, fallback to hardcoded
  const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '539940068725-bl40qj6qrpas5b2csag86l77p2392rlq.apps.googleusercontent.com';

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    // Load Google Identity Services
    const loadGoogleScript = () => {
      if (window.google?.accounts?.id) {
        initializeGoogle();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      document.head.appendChild(script);
    };

    const initializeGoogle = () => {
      if (window.google?.accounts?.id && GOOGLE_CLIENT_ID) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse,
            auto_select: false,
            cancel_on_tap_outside: false,
          });
          setGoogleLoaded(true);
        } catch (error) {
          console.error('Google Identity Services initialization failed:', error);
        }
      }
    };

    loadGoogleScript();

    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, GOOGLE_CLIENT_ID]);

  const finishAuth = (signedUpFlag) => {
    if (typeof onAuthSuccess === 'function') onAuthSuccess(signedUpFlag); else onClose();
  };

  const handleGoogleResponse = async (response) => {
    try {
      setServerMsg('Signing in with Google...');
      
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: response.credential }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.message || 'Google authentication failed';
        setErrors(prev => ({ ...prev, server: msg }));
        setServerMsg(msg);
        return;
      }

      setErrors({});
      setServerMsg(data.message || 'Signed in with Google');

      // Store user data
      try {
        if (data?.user) {
          localStorage.setItem('bv_user', JSON.stringify(data.user));
        }
      } catch (e) {
        console.error('Failed to store user data:', e);
      }

      setTimeout(() => finishAuth(false), 700);

    } catch (error) {
      console.error('Google auth error:', error);
      setErrors(prev => ({ ...prev, server: 'Google authentication failed' }));
      setServerMsg('Google authentication failed');
    }
  };

  const swap = () => {
    setIsSignUp(s => !s);
    setForm(INITIAL_FORM);
    setErrors({});
  };

  const validateField = (name, value) => {
    let err = '';
    if (name === 'name' && isSignUp) {
      if (!value.trim()) err = 'Full name is required';
    }
    if (name === 'email') {
      if (!value.trim()) err = 'Email is required';
      else if (!emailRegex.test(value)) err = 'Enter a valid email';
    }
    if (name === 'password') {
      if (!value) err = 'Password is required';
      else if (value.length < 8) err = 'Password must be at least 8 characters';
      else if (!/\d/.test(value)) err = 'Password must contain a number';
    }
    if (name === 'confirm' && isSignUp) {
      if (!value) err = 'Please confirm your password';
      else if (value !== form.password) err = 'Passwords do not match';
    }
    setErrors((prev) => ({ ...prev, [name]: err }));
    return err === '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    validateField(name, value);
    if (name === 'password' && isSignUp && form.confirm) {
      validateField('confirm', form.confirm);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const toValidate = isSignUp ? ['name','email','password','confirm'] : ['email','password'];

    let firstInvalid = null;
    let allValid = true;
    toValidate.forEach((k) => {
      const ok = validateField(k, form[k]);
      if (!ok) {
        allValid = false;
        if (!firstInvalid) firstInvalid = k;
      }
    });

    if (!allValid) {
      if (firstInvalid && refs[firstInvalid] && refs[firstInvalid].current) {
        refs[firstInvalid].current.focus();
      }
      return;
    }

    const url = isSignUp ? '/api/auth/register' : '/api/auth/login';
    const payload = isSignUp ? { name: form.name, email: form.email, password: form.password } : { email: form.email, password: form.password };

    (async () => {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = data?.message || 'Authentication failed';
          const fieldErrors = data?.errors || {};
          setErrors(prev => ({ ...prev, ...fieldErrors, server: msg }));
          setServerMsg(msg);
          return;
        }
        setErrors({});
        setServerMsg(data.message || (isSignUp ? 'Signed up' : 'Signed in'));
        try { if (data?.user) localStorage.setItem('bv_user', JSON.stringify(data.user)); } catch {}
        setTimeout(() => finishAuth(isSignUp), 700);
      } catch (err) {
        console.error('Auth error', err);
        setErrors(prev => ({ ...prev, server: 'Network error' }));
        setServerMsg('Network error');
      }
    })();
  };

  const renderGoogleButton = () => {
    const buttonContainer = document.getElementById('google-signin-button');
    if (buttonContainer && window.google?.accounts?.id) {
      buttonContainer.innerHTML = ''; // Clear existing content
      window.google.accounts.id.renderButton(buttonContainer, {
        theme: 'outline',
        size: 'large',
        width: '100%',
        text: 'signin_with'
      });
    }
  };

  // Render Google button when component mounts and Google is loaded
  useEffect(() => { if (googleLoaded) setTimeout(renderGoogleButton, 100); }, [googleLoaded]);

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true" aria-label="Authentication">
      <div className="auth-card" role="document">
        <button className="auth-close" onClick={onClose} aria-label="Close auth">×</button>

        <div className="auth-left">
          <div className="auth-left-inner">
            <h1 className="auth-welcome">{isSignUp ? 'Join us!' : 'Welcome!'}</h1>
            <p className="auth-lead">Create your account. For Free!</p>
            <button className="auth-cta-ghost" onClick={swap}>
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </div>

        <div className="auth-right">
          <h2 className="auth-title">{isSignUp ? 'Create Account' : 'Login'}</h2>

          <form className="auth-form" onSubmit={handleSubmit}>
            {isSignUp && (
              <>
                <input
                  ref={refs.name}
                  className={`auth-input ${errors.name ? 'invalid' : ''}`}
                  name="name"
                  placeholder="Full name"
                  value={form.name}
                  onChange={handleChange}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'err-name' : undefined}
                />
                {errors.name && <div id="err-name" className="auth-error">{errors.name}</div>}
              </>
            )}

            <input
              ref={refs.email}
              className={`auth-input ${errors.email ? 'invalid' : ''}`}
              name="email"
              type="email"
              placeholder="Username or Email"
              value={form.email}
              onChange={handleChange}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'err-email' : undefined}
            />
            {errors.email && <div id="err-email" className="auth-error">{errors.email}</div>}

            <input
              ref={refs.password}
              className={`auth-input ${errors.password ? 'invalid' : ''}`}
              name="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'err-password' : undefined}
            />
            {errors.password && <div id="err-password" className="auth-error">{errors.password}</div>}

            {isSignUp && (
              <>
                <input
                  ref={refs.confirm}
                  className={`auth-input ${errors.confirm ? 'invalid' : ''}`}
                  name="confirm"
                  type="password"
                  placeholder="Confirm password"
                  value={form.confirm}
                  onChange={handleChange}
                  aria-invalid={!!errors.confirm}
                  aria-describedby={errors.confirm ? 'err-confirm' : undefined}
                />
                {errors.confirm && <div id="err-confirm" className="auth-error">{errors.confirm}</div>}
              </>
            )}

            <button
              className="auth-btn"
              type="submit"
              disabled={Object.values(errors).some(Boolean) || !form.email || !form.password || (isSignUp && (!form.name || !form.confirm))}
            >
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </button>

            {serverMsg && <div className="auth-server-msg" role="status">{serverMsg}</div>}

            <div className="auth-or">or</div>

            <div className="google-signin-container">
              {/* Container for Google's official rendered button */}
              <div id="google-signin-button"></div>
            </div>

            <div className="auth-switch">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <button type="button" className="auth-link" onClick={swap}>
                {isSignUp ? ' Sign In' : ' Sign Up'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
