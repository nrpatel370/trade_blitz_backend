const db = require('../config/database');

// Submit feedback
exports.submitFeedback = async (req, res) => {
  try {
    const { subject, message, category, rating } = req.body;

    // Validation
    if (!subject || !message || !rating) {
      return res.status(400).json({ error: 'Subject, message, and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const validCategories = ['bug', 'feature', 'general', 'other'];
    const feedbackCategory = validCategories.includes(category) ? category : 'general';

    // Get user_id if authenticated (optional)
    const userId = req.userId || null;

    const [result] = await db.query(
      'INSERT INTO feedback (user_id, subject, message, category, rating) VALUES (?, ?, ?, ?, ?)',
      [userId, subject, message, feedbackCategory, rating]
    );

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

// Get all feedback (admin use)
exports.getAllFeedback = async (req, res) => {
  try {
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
