-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'operator' CHECK (role IN ('operator', 'engineer', 'admin')),
  is_verified BOOLEAN DEFAULT true, -- Auto-approved as requested
  reset_password_token VARCHAR(100),
  reset_password_expires TIMESTAMP,
  last_login TIMESTAMP,
  login_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_password_token) WHERE reset_password_token IS NOT NULL;

-- Insert demo users with hashed passwords
-- Default password for all demo users: PipelineSecure2024!
INSERT INTO users (username, email, password_hash, full_name, role, login_count) VALUES
('operator', 'operator@powerpipeline.com', '$2a$12$LQv3c1yqBWVHxkdUx7kfHezB6OYkfT7Z7YkR7NcXqMl9pWtQ6o8O2', 'Control Room Operator', 'operator', 0),
('engineer', 'engineer@powerpipeline.com', '$2a$12$LQv3c1yqBWVHxkdUx7kfHezB6OYkfT7Z7YkR7NcXqMl9pWtQ6o8O2', 'Systems Engineer', 'engineer', 0),
('admin', 'admin@powerpipeline.com', '$2a$12$LQv3c1yqBWVHxkdUx7kfHezB6OYkfT7Z7YkR7NcXqMl9pWtQ6o8O2', 'Administrator', 'admin', 0)
ON CONFLICT (username) DO NOTHING;

-- Create login_logs table to track user logins
CREATE TABLE IF NOT EXISTS login_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  device_fingerprint VARCHAR(100),
  login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  logout_time TIMESTAMP,
  session_duration INTEGER -- in seconds
);

CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_login_time ON login_logs(login_time);