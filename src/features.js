import React from 'react';
import './feature.css';

export default function Features() {
  const items = [
    { title: 'Personalized Dashboard', desc: 'Quick access to picks, reading lists and insights.' },
    { title: 'Mood-based Recommendations', desc: 'Find books that match your mood right now.' },
    { title: 'Public/Private Profiles', desc: 'Share or keep your reading activity private.' },
    { title: 'Ratings & Reviews', desc: 'Rate books and share your thoughts with others.' },
    { title: 'Book Shelf', desc: 'Create your own shelf and add books and start reading.' },
  ];

  return (
    <section className="features-section">
      <div className="features-inner">
        <h2 className="features-title">Feature Preview</h2>
        <p className="features-sub">Powerful features to make reading fun and personal.</p>

        <div className="features-grid">
          {items.map((it) => (
            <article key={it.title} className="feature-card" tabIndex="0" aria-label={it.title}>
              <div className="feature-icon" aria-hidden="true">★</div>
              <h3 className="feature-name">{it.title}</h3>
              <p className="feature-desc">{it.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
