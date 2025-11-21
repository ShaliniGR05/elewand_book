import React from 'react';
import './about.css';

export default function About() {
  return (
    <section className="about-section" aria-labelledby="about-title">
      <div className="about-inner">
        <div className="about-content">
          <h2 id="about-title" className="about-title">About EleWand</h2>
          <p className="about-text">EleWand is your cozy corner for discovering books you’ll truly love. With personalized recommendations, mood-based suggestions, and smart tracking, we make reading feel effortless and fun.</p>
        </div>
        <div className="about-visual" aria-hidden="true">
          <svg viewBox="0 0 280 200" xmlns="http://www.w3.org/2000/svg" role="img">
            <defs>
              <linearGradient id="g1" x1="0" x2="1">
                <stop offset="0" stopColor="#f0a36e"/>
                <stop offset="1" stopColor="#b85a46"/>
              </linearGradient>
              <linearGradient id="g2" x1="0" x2="1">
                <stop offset="0" stopColor="#fff"/>
                <stop offset="1" stopColor="#f6efe6"/>
              </linearGradient>
            </defs>
            <rect width="280" height="200" rx="14" fill="#fffaf6" />
            <g transform="translate(18,28)">
              <rect width="88" height="132" rx="6" fill="url(#g1)" />
              <rect x="100" y="6" width="88" height="126" rx="6" fill="#f0a36e" />
              <rect x="200" y="12" width="60" height="120" rx="6" fill="#66a15a" />
              <g transform="translate(8,12)">
                <rect x="8" y="12" width="72" height="8" rx="3" fill="url(#g2)" opacity="0.9"/>
                <rect x="8" y="32" width="56" height="6" rx="3" fill="url(#g2)" opacity="0.8"/>
                <rect x="8" y="48" width="64" height="6" rx="3" fill="url(#g2)" opacity="0.8"/>
              </g>
              <g transform="translate(108,22)">
                <rect x="8" y="10" width="72" height="6" rx="3" fill="#fff" opacity="0.9"/>
                <rect x="8" y="28" width="52" height="6" rx="3" fill="#fff" opacity="0.85"/>
              </g>
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
