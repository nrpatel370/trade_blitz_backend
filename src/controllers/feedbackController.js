/*
 * feedbackController.js - Handles user feedback submissions
 * 
 * Single Responsibility: Only manages feedback-related operations
 * This controller processes feedback form submissions and retrieval
 */

const db = require('../config/database');

/*
 * Submit new feedback from a user
 * Validates input, saves to database, returns confirmation
 */
exports.submitFeedback = async (req, res) => {
  try {
    const { subject, message, category, rating } = req.body;

    // Validate required fields
    if (!subject || !message || !rating) {
      return res.status(400).json({ error: 'Subject, message, and rating are required' });
    }

    // Validate rating is within acceptable range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Sanitize category - default to 'general' if invalid
    const validCategories = ['bug', 'feature', 'general', 'other'];
    const feedbackCategory = validCategories.includes(category) ? category : 'general';

    // Get user_id if logged in, otherwise null for anonymous feedback
    const userId = req.userId || null;

    // Insert feedback into database
    const [result] = await db.query(
      'INSERT INTO feedback (user_id, subject, message, category, rating) VALUES (?, ?, ?, ?, ?)',
      [userId, subject, message, feedbackCategory, rating]
    );

    // Return success response with feedback details
    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback: {
        feedbackId: result.insertId,
        subject,
        message,
        category: feedbackCategory,
        rating
      }
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
};

/*
 * Retrieve all feedback entries
 * Joins with users table to get submitter username
 */
exports.getAllFeedback = async (req, res) => {
  try {
    // Get all feedback with optional username, sorted newest first
    const [feedback] = await db.query(
      `SELECT f.*, u.username 
       FROM feedback f 
       LEFT JOIN users u ON f.user_id = u.user_id 
       ORDER BY f.created_at DESC`
    );

    res.json({ feedback });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
};
