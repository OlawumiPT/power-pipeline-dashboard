// backend/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'pipeline_dashboard',
  user: process.env.DB_USER || 'dashboard_admin',
  password: process.env.DB_PASSWORD || 'powertransition'
});

// Set schema for all connections
pool.on('connect', (client) => {
  client.query(`SET search_path TO pipeline_dashboard`);
});

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
  } else {
    console.log('✅ Database connected successfully:', res.rows[0].now);
  }
});

module.exports = pool;