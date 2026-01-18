// backend/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Determine if we're in production (Azure) or development (local)
const isProduction = process.env.NODE_ENV === 'production';

// Database configuration for different environments
const dbConfig = isProduction ? {
  // 🚀 AZURE POSTGRESQL (PRODUCTION)
  host: process.env.DB_HOST || 'pt-power-pipeline-db.postgres.database.azure.com',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'pt_power_pipeline',
  user: process.env.DB_USER || 'pt_admin',
  password: process.env.DB_PASSWORD,  // REQUIRED for Azure - don't set default
  ssl: {
    rejectUnauthorized: false,  // Required for Azure PostgreSQL
    ca: process.env.DB_SSL_CA   // Optional: SSL certificate if needed
  },
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20
} : {
  // 💻 LOCAL POSTGRESQL (DEVELOPMENT)
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'pipeline_dashboard',
  user: process.env.DB_USER || 'dashboard_admin',
  password: process.env.DB_PASSWORD || 'powertransition',
  ssl: false,  // SSL usually not needed for local development
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10
};

console.log(`🔗 Connecting to ${isProduction ? 'Azure PostgreSQL (Production)' : 'Local PostgreSQL (Development)'}`);
console.log(`📁 Database: ${dbConfig.database}`);

// Create the connection pool
const pool = new Pool(dbConfig);

// Set schema for all connections (if needed)
pool.on('connect', (client) => {
  const schema = isProduction ? 'public' : 'pipeline_dashboard';
  client.query(`SET search_path TO ${schema}`);
  console.log(`📊 Schema set to: ${schema}`);
});

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
    if (isProduction) {
      console.error('💡 Azure PostgreSQL troubleshooting:');
      console.error('1. Check if database exists: pt_power_pipeline');
      console.error('2. Verify username: pt_admin');
      console.error('3. Ensure DB_PASSWORD is set in Azure environment variables');
      console.error('4. Check firewall rules allow Azure services');
      console.error('5. Verify SSL connection: sslmode=require');
    }
  } else {
    console.log('✅ Database connected successfully:', res.rows[0].now);
    console.log('📍 Host:', dbConfig.host);
  }
});

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Closing database connections...');
  await pool.end();
  console.log('✅ Database connections closed');
  process.exit(0);
});

module.exports = pool;