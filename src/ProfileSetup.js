import React, { useState, useEffect } from 'react';
import './profile.css';

const QUESTIONS = [
  {
    key: 'q1',
    title: 'What kind of story pace do you enjoy?',
    options: [
      { label: 'Fast & suspenseful', genre: 'crimeThriller' },
      { label: 'Slow & creeping tension', genre: 'horror' },
      { label: 'Epic and adventurous', genre: 'fantasy' },
      { label: 'Thoughtful and reflective', genre: 'philosophy' },
    ],
  },
  {
    key: 'q2',
    title: 'Which element excites you most in a book?',
    options: [
      { label: 'Mystery, secrets, investigations', genre: 'crimeThriller' },
      { label: 'Darkness, fear, supernatural', genre: 'horror' },
      { label: 'Magic, mythical creatures, quests', genre: 'fantasy' },
      { label: 'Big ideas, life lessons, wisdom', genre: 'philosophy' },
    ],
  },
  {
    key: 'q3',
    title: 'What mood do you want while reading?',
    options: [
      { label: 'Edge-of-the-seat suspense', genre: 'crimeThriller' },
      { label: 'Chills and goosebumps', genre: 'horror' },
      { label: 'Wonder and imagination', genre: 'fantasy' },
      { label: 'Calm and introspection', genre: 'philosophy' },
    ],
  },
  {
    key: 'q4',
    title: 'Which type of setting do you prefer?',
    options: [
      { label: 'Modern city / crime scene', genre: 'crimeThriller' },
      { label: 'Haunted house / eerie locations', genre: 'horror' },
      { label: 'Magical worlds / kingdoms', genre: 'fantasy' },
      { label: 'Ancient Greece, old libraries, or intellectual discussions', genre: 'philosophy' },
    ],
  },
  {
    key: 'q5',
    title: 'How do you want to feel after finishing a book?',
    options: [
      { label: 'Shocked by twists and revelations', genre: 'crimeThriller' },
      { label: 'Haunted, slightly disturbed', genre: 'horror' },
      { label: 'Inspired by adventure and heroism', genre: 'fantasy' },
      { label: 'Enlightened with new perspectives', genre: 'philosophy' },
    ],
  },
];

export default function ProfileSetup() {
  const stored = (typeof window !== 'undefined') ? localStorage.getItem('bv_user') : null;
  const user = stored ? JSON.parse(stored) : null;

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ q1:0, q2:0, q3:0, q4:0, q5:0 });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { if (!user) setMsg('No user found. Please login.'); }, [user]);

  const select = (qKey, number) => {
    setAnswers(a => ({ ...a, [qKey]: number }));
  };

  const calcScores = () => {
    const scores = { crimeThriller:0, horror:0, fantasy:0, philosophy:0 };
    for (let i = 0; i < QUESTIONS.length; i++) {
      const q = QUESTIONS[i];
      const choice = answers[q.key];
      if (!choice) continue;
      // map 1-5 scale: each selected number gives +10 to the associated genre
      // For flexibility, use the option index: the option determines which genre gets the points.
  const genre = QUESTIONS[i].options[(choice <= QUESTIONS[i].options.length) ? (choice - 1) : 0].genre;
      if (genre) scores[genre] += 10;
    }
    return scores;
  };

  const submit = async () => {
    if (!user) return setMsg('No user found. Please login.');
    for (let q of QUESTIONS) if (!answers[q.key]) return setMsg('Please answer all questions');
    const scores = calcScores();
    setSaving(true);
    try {
      const res = await fetch(`/api/auth/profile/${user.id}`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(scores) });
      const data = await res.json();
      if (!res.ok) throw new Error(data && data.message ? data.message : 'Save failed');
      setMsg('Profile saved');
      setTimeout(() => { window.location.href = '/dashboard'; }, 800);
    } catch (err) { setMsg(err.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  if (!user) return (<div className="ps-root"><div className="ps-inner"><h2>Please login to set up your profile</h2></div></div>);

  const q = QUESTIONS[step];

  return (
    <div className="ps-root">
      <div className="ps-inner ps-stepper">
        <div className="ps-header">
          <h2>Welcome, {user.name}</h2>
          <p className="ps-lead">Answer a few quick questions to personalize recommendations.</p>
        </div>

        <div className="ps-progress">Step {step+1} of {QUESTIONS.length}</div>

        <div className="ps-card">
          <div className="ps-question">{q.title}</div>

          <div className="ps-scale-row">
            {[1,2,3,4,5].map(n => {
              const selected = answers[q.key] === n;
              return (
                <button key={n} className={`ps-scale-btn ${selected ? 'selected' : ''}`} onClick={() => select(q.key, n)}>
                  <div className="ps-num">{n}</div>
                  <div className="ps-label">{q.options[Math.max(0, Math.min(q.options.length-1, n-1))].label}</div>
                </button>
              );
            })}
          </div>

          <div className="ps-nav">
            <button className="ps-back" onClick={() => setStep(s => Math.max(0, s-1))} disabled={step===0}>Back</button>
            {step < QUESTIONS.length-1 ? (
              <button className="ps-next" onClick={() => setStep(s => Math.min(QUESTIONS.length-1, s+1))}>Next</button>
            ) : (
              <button className="ps-save" onClick={submit} disabled={saving}>{saving ? 'Saving...' : 'Finish & Save'}</button>
            )}
          </div>

          {msg && <div className="ps-msg">{msg}</div>}
        </div>
      </div>
    </div>
  );
}
