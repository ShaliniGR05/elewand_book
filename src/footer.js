import React from 'react';
import './footer.css';

export default function Footer() {
  return (
    <footer className="footer-section" aria-labelledby="footer-title">
      <div className="footer-inner">
        <div className="footer-left">
          <h3 id="footer-title" className="footer-title">Get in touch</h3>
          <p className="footer-text">
            Have questions or want to collaborate? Reach out to us at
            <a href="mailto:elewand@gmail.com" className="footer-email"> elewand@gmail.com</a>
          </p>
          <p className="footer-small">© {new Date().getFullYear()} EleWand — All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
