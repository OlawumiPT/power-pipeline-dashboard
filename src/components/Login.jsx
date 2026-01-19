import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/powerTransitionLogo.png';
import './Login.css';

const Login = () => {
  const [credentials, setCredentials] = useState({ 
    username: '', 
    password: '' 
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Get device info for login logging
      const deviceInfo = {
        ip_address: 'auto-detected', // In production, you can add IP detection
        user_agent: navigator.userAgent,
        device_fingerprint: 'web-browser'
      };

      const result = await login({
        ...credentials,
        ...deviceInfo
      });
      
      if (result.success) {
        // Store token and user data in localStorage
        if (result.token) {
          localStorage.setItem('token', result.token);
          localStorage.setItem('user', JSON.stringify(result.user));
        }
        
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        setError(result.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      
      // Handle specific error types
      if (err.message === 'Failed to fetch') {
        setError('Cannot connect to server. Please check your network connection and ensure the backend is running.');
      } else if (err.message.includes('401')) {
        setError('Invalid credentials or account not approved.');
      } else if (err.message.includes('404')) {
        setError('Login endpoint not found. Please check backend configuration.');
      } else {
        setError(err.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Helper to test backend connection
  const testBackendConnection = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const response = await fetch(`${apiUrl}/health`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Backend is running:', data);
        alert(`✅ Backend is running!\nStatus: ${data.status}\nEmail Service: ${data.email_service}`);
        return true;
      } else {
        console.error('Backend health check failed');
        alert('❌ Backend is not responding properly.');
        return false;
      }
    } catch (error) {
      console.error('Cannot connect to backend:', error);
      alert(`❌ Cannot connect to backend.\n\nMake sure:\n1. Backend server is running\n2. URL is correct: ${import.meta.env.VITE_API_URL || 'http://localhost:8080'}\n3. CORS is configured`);
      return false;
    }
  };

  // Helper to test login endpoint
  const testLoginEndpoint = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'test',
          password: 'test',
          ip_address: 'test',
          user_agent: 'test',
          device_fingerprint: 'test'
        })
      });
      
      const data = await response.json();
      console.log('Login endpoint test:', { status: response.status, data });
      
      if (response.status === 401) {
        alert('✅ Login endpoint exists but rejected credentials (expected)\n\nThis means:\n1. Backend is running ✅\n2. Login route exists ✅\n3. Need valid database user');
      } else if (response.ok) {
        alert('✅ Login endpoint is working!');
      } else {
        alert(`❌ Login endpoint error: ${data.message || response.status}`);
      }
    } catch (error) {
      console.error('Login endpoint test failed:', error);
      alert(`❌ Cannot reach login endpoint: ${error.message}`);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="company-branding">
            <img 
              src={logo} 
              alt="Power Transitions Logo" 
              style={{ 
                height: "40px", 
                objectFit: "contain",
                filter: "brightness(0) invert(1)" 
              }} 
            />
          </div>
          <p className="login-subtitle">Login Portal</p>
        </div>

        {/* Debug info (remove in production) */}
        {(import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true') && (
          <div className="debug-info">
            <p>
              <small>
                Backend URL: {import.meta.env.VITE_API_URL || 'Not set (using default)'}
              </small>
            </p>
            <div className="debug-buttons">
              <button 
                type="button" 
                className="debug-button"
                onClick={testBackendConnection}
                disabled={isLoading}
              >
                Test Backend
              </button>
              <button 
                type="button" 
                className="debug-button"
                onClick={testLoginEndpoint}
                disabled={isLoading}
              >
                Test Login Endpoint
              </button>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">
              <span className="label-icon">👤</span>
              Username or Email:
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={credentials.username}
              onChange={handleInputChange}
              placeholder="Enter username or email"
              required
              className="form-input"
              disabled={isLoading}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <span className="label-icon">🔒</span>
              Password:
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              required
              className="form-input"
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          {/* Database Notice (for development) */}
          {(import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true') && (
            <div className="info-message">
              ℹ️ Ensure you have an active user in the database with status='active'
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Authenticating...
              </>
            ) : (
              'Secure Login'
            )}
          </button>

          {/* Security Notice */}
          <div className="security-notice">
            <p>
              <strong>⚠️ Security Notice:</strong> This system contains sensitive operational data. 
              All access is logged and monitored. Unauthorized access is prohibited.
            </p>
            
            {/* Connection Status */}
            <div className="connection-status">
              <small>
                Backend: {import.meta.env.VITE_API_URL ? 'Configured' : 'Using default (localhost:8080)'}
              </small>
            </div>
          </div>
        </form>

        <div className="login-footer">
          <div className="footer-links">
            <Link to="/forgot-password" className="footer-link">Forgot Password?</Link>
            <span className="separator">•</span>
            <Link to="/register" className="footer-link">Create Account</Link>
            <span className="separator">•</span>
            <a href="#" className="footer-link">Emergency Procedures</a>
          </div>
          
          {/* Environment Info */}
          <div className="environment-info">
            <small>
              Environment: {import.meta.env.MODE} | 
              API: {import.meta.env.VITE_API_URL ? 'Custom' : 'Default'}
            </small>
          </div>
          
          <p className="copyright">
            © 2026 Power Pipeline Systems. Critical Infrastructure.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
