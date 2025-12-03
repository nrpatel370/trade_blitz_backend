// ===== src/app.js =====
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const rosterRoutes = require('./routes/rosterRoutes');
const playerRoutes = require('./routes/playerRoutes');
const rankingsRoutes = require('./routes/rankingsRoutes');
const tradeRoutes = require('./routes/tradeRoutes');
const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:4200', // Angular default port
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rosters', rosterRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/rankings', rankingsRoutes);
app.use('/api/trade', tradeRoutes);


// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Trade Blitz API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

module.exports = app;
