import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/powerTransitionLogo.png'; 
import './Login.css';
import { Link } from 'react-router-dom';

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

    const result = await login(credentials);
    
    if (result.success) {
      // Redirect to dashboard
      navigate('/dashboard');
    } else {
      setError(result.message);
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

  // Demo credentials for testing (remove in production)
  const loadDemoCredentials = (role) => {
    const demos = {
      operator: { username: 'operator', password: 'PipelineSecure2024!' },
      engineer: { username: 'engineer', password: 'PipelineSecure2024!' },
      admin: { username: 'admin', password: 'PipelineSecure2024!' }
    };
    setCredentials(demos[role]);
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

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">
              <span className="label-icon">👤</span>
              Username:
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={credentials.username}
              onChange={handleInputChange}
              placeholder="Enter your username"
              required
              className="form-input"
              disabled={isLoading}
              autoComplete="username"
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
           
          </div>
        </form>

        <div className="login-footer">
  <div className="footer-links">
    <Link to="/forgot-password" className="footer-link">Forgot Password?</Link> {/* UPDATE THIS */}
    <span className="separator">•</span>
    <Link to="/register" className="footer-link">Create Account</Link> {/* ADD THIS */}
    <span className="separator">•</span>
    <a href="#" className="footer-link">Emergency Procedures</a>
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
