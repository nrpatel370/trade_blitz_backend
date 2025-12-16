/**
 * app.js - Main Express Application Configuration
 * 
 * Design Pattern: MVC (Model-View-Controller)
 * - Routes handle incoming requests and delegate to controllers
 * - Controllers contain business logic and interact with models/services
 * - Responses serve as the "view" (JSON API responses)
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Each route file handles one resource type
 * - Open/Closed: New routes can be added without modifying existing ones
 * - Dependency Inversion: Routes depend on abstractions (controllers/services)
 */

const express = require('express');
const cors = require('cors');

// Import route modules - each handles a specific resource
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const rosterRoutes = require('./routes/rosterRoutes');
const playerRoutes = require('./routes/playerRoutes');
const rankingsRoutes = require('./routes/rankingsRoutes');
const tradeRoutes = require('./routes/tradeRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');

const app = express();

// Middleware setup
app.use(cors({
  origin: 'http://localhost:4200', // Allow Angular frontend
  credentials: true
}));
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded data

// Mount API routes - each route group has its own base path
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rosters', rosterRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/rankings', rankingsRoutes);
app.use('/api/trade', tradeRoutes);
app.use('/api/feedback', feedbackRoutes);

// Health check endpoint for monitoring
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Trade Blitz API is running' });
});

// Global error handler - catches any unhandled errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

module.exports = app;
