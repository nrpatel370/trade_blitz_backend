/**
 * database.js - MySQL Database Configuration
 * 
 * Creates and exports a connection pool for MySQL database access
 * Uses environment variables for secure credential management
 * 
 * Design Pattern: Singleton - Single pool instance shared across app
 * SOLID: Dependency Inversion - Abstracts database connection details
 */

const mysql = require('mysql2/promise');

/**
 * MySQL connection pool configuration
 * Pool maintains multiple connections for concurrent requests
 * connectionLimit: Max 10 simultaneous connections
 * waitForConnections: Queue requests when pool is full
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Verify database connectivity on startup
pool.getConnection()
  .then(connection => {
    console.log('Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('Database connection failed:', err.message);
  });

module.exports = pool;
