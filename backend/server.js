require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// connect to MongoDB
connectDB();

// middleware - Update CORS to allow your Vercel domain
app.use(cors({
  origin: [
    'http://localhost:3000', // for local development
    'https://elewand-book2-kl0o1gfso-shalini-grs-projects.vercel.app', // your Vercel URL
    'https://elewand-book2.onrender.com' // your backend URL (for testing)
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// middleware
app.use(express.json());

// routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/books', require('./routes/books'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/shelves', require('./routes/shelves'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/activity', require('./routes/activity'));

// serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// serve static (optional) - if you build the React app
app.use(express.static(path.join(__dirname, 'public')));

app.get('/ping', (req, res) => res.send('pong'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
