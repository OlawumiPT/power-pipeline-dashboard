import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import axios from 'axios';

// Create context outside component
const AuthContext = createContext(null);

// Separate hook outside component
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Main provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Initialize from localStorage
    const storedUser = localStorage.getItem('pipeline_user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem('pipeline_token'));

  // API base URL - FIXED: Use correct backend URL
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  // Configure axios defaults once
  useEffect(() => {
    axios.defaults.baseURL = API_URL;
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, [API_URL, token]);

  // Check for existing session on mount
  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem('pipeline_token');
      const storedUser = localStorage.getItem('pipeline_user');
      
      if (storedToken && storedUser) {
        try {
          // Verify token with backend - FIXED: Correct endpoint path
          const response = await axios.post('/api/auth/verify', { token: storedToken }, {
            timeout: 5000
          });
          
          if (response.data.valid) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          } else {
            // Token invalid, clear storage
            localStorage.removeItem('pipeline_token');
            localStorage.removeItem('pipeline_user');
            setToken(null);
            setUser(null);
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          localStorage.removeItem('pipeline_token');
          localStorage.removeItem('pipeline_user');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    verifyToken();
  }, []);

  const register = async (userData) => {
    try {
      console.log('Registering user with approval flow:', userData);
      
      const response = await axios.post('/api/auth/register', {
        ...userData,
        status: 'pending_approval'
      }, {
        timeout: 10000
      });

      // DO NOT auto-login
      // DO NOT store token
      // Return success message only
      
      return { 
        success: true, 
        message: response.data.message || 'Registration submitted for admin approval. You will receive an email once approved.'
      };
      
    } catch (error) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Registration request timed out. Please try again.';
      } else if (error.response) {
        // Handle specific backend messages
        if (error.response.status === 400) {
          errorMessage = error.response.data?.message || 'Invalid registration data.';
        } else if (error.response.status === 409) {
          errorMessage = 'Username or email already exists.';
        } else if (error.response.status === 500) {
          errorMessage = 'Server error. Please contact administrator.';
        } else {
          errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
        }
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection and ensure backend is running.';
      } else {
        errorMessage = error.message || 'Registration failed. Please try again.';
      }
      
      return { 
        success: false, 
        message: errorMessage
      };
    }
  };

  // Add a new function to check registration status
  const checkRegistrationStatus = async (email) => {
    try {
      const response = await axios.get(`/api/auth/registration-status/${encodeURIComponent(email)}`);
      return { success: true, status: response.data.status };
    } catch (error) {
      return { success: false, message: 'Could not check registration status' };
    }
  };

  const login = async (credentials) => {
    try {
      let clientIp = '127.0.0.1';
      
      // Try to get IP address, but don't fail if it doesn't work
      try {
        const ipResponse = await axios.get('https://api.ipify.org?format=json', {
          timeout: 5000,
          baseURL: '' // Override base URL for external API
        });
        
        if (ipResponse.data && ipResponse.data.ip) {
          clientIp = ipResponse.data.ip;
        }
      } catch (ipError) {
        console.warn('Could not fetch IP address, using localhost:', ipError.message);
      }
      
      const clientInfo = {
        ip_address: clientIp,
        user_agent: navigator.userAgent,
        device_fingerprint: generateDeviceFingerprint()
      };

      // Send login request with client info - FIXED: Correct endpoint path
      const response = await axios.post('/api/auth/login', {
        ...credentials,
        ...clientInfo
      }, {
        timeout: 10000,
        validateStatus: (status) => {
          // Accept both success (200-299) and some error statuses
          return (status >= 200 && status < 300) || status === 401 || status === 400;
        }
      });

      // Check if login was successful
      if (response.status === 200 || response.status === 201) {
        const { token: newToken, user: userData } = response.data;
        
        // Store token and user
        localStorage.setItem('pipeline_token', newToken);
        localStorage.setItem('pipeline_user', JSON.stringify(userData));
        
        // Update axios defaults
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        
        // Update state
        setToken(newToken);
        setUser(userData);
        
        return { 
          success: true, 
          user: userData,
          token: newToken
        };
      } else {
        // Login failed but server responded
        return {
          success: false,
          message: response.data?.message || 'Login failed. Please check your credentials.'
        };
      }
      
    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed. Please check credentials.';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Login request timed out. Please try again.';
      } else if (error.response) {
        // Handle specific error statuses
        if (error.response.status === 401) {
          errorMessage = 'Invalid credentials or account not approved.';
        } else if (error.response.status === 404) {
          errorMessage = 'Login endpoint not found. Please check backend configuration.';
        } else if (error.response.status === 500) {
          errorMessage = 'Server error. Please contact administrator.';
        } else {
          errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
        }
      } else if (error.request) {
        errorMessage = 'Cannot connect to server. Please check:\n1. Backend is running\n2. Network connection\n3. CORS configuration';
      } else {
        errorMessage = error.message || 'Login failed. Please try again.';
      }
      
      return { 
        success: false, 
        message: errorMessage
      };
    }
  };

  const forgotPassword = async (email) => {
    try {
      const response = await axios.post('/api/auth/forgot-password', { email }, {
        timeout: 10000
      });

      return { 
        success: true, 
        message: response.data.message || 'Password reset email sent'
      };
    } catch (error) {
      console.error('Forgot password error:', error);
      
      let errorMessage = 'Failed to process password reset request.';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.response) {
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        errorMessage = error.message || 'Failed to process request.';
      }
      
      return { 
        success: false, 
        message: errorMessage
      };
    }
  };

  const resetPassword = async (token, password) => {
    try {
      const response = await axios.post(`/api/auth/reset-password/${token}`, { password }, {
        timeout: 10000
      });

      return { 
        success: true, 
        message: response.data.message || 'Password reset successful'
      };
    } catch (error) {
      console.error('Reset password error:', error);
      
      let errorMessage = 'Failed to reset password.';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.response) {
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        errorMessage = error.message || 'Failed to reset password.';
      }
      
      return { 
        success: false, 
        message: errorMessage
      };
    }
  };

  const logout = async () => {
    // Call logout API to invalidate token and log session
    if (token) {
      try {
        await axios.post('/api/auth/logout', { token });
      } catch (error) {
        console.warn('Logout API call failed:', error);
      }
    }
    
    // Clear local storage
    localStorage.removeItem('pipeline_token');
    localStorage.removeItem('pipeline_user');
    
    // Clear axios headers
    delete axios.defaults.headers.common['Authorization'];
    
    // Reset state
    setToken(null);
    setUser(null);
    
    // Redirect to login
    window.location.href = '/login';
  };

  // Admin functions
  const getPendingUsers = async () => {
    try {
      const response = await axios.get('/api/admin/pending-users');
      return { success: true, users: response.data };
    } catch (error) {
      console.error('Get pending users error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to fetch pending users' 
      };
    }
  };

  const approveUser = async (userId, role = 'operator') => {
    try {
      const response = await axios.post(`/api/admin/approve-user/${userId}`, { role });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Approve user error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to approve user' 
      };
    }
  };

  const rejectUser = async (userId, reason = '') => {
    try {
      const response = await axios.post(`/api/admin/reject-user/${userId}`, { reason });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Reject user error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to reject user' 
      };
    }
  };

  // Generate a simple device fingerprint
  const generateDeviceFingerprint = () => {
    try {
      const navigatorInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screen: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        cookiesEnabled: navigator.cookieEnabled,
        hardwareConcurrency: navigator.hardwareConcurrency || 'unknown'
      };
      
      const infoString = JSON.stringify(navigatorInfo);
      return btoa(infoString).substring(0, 32);
    } catch (error) {
      console.warn('Could not generate device fingerprint:', error);
      return 'unknown-device-' + Date.now();
    }
  };

  // Test backend connection
  const testBackendConnection = async () => {
    try {
      const response = await axios.get('/health', {
        timeout: 5000,
        validateStatus: () => true // Accept all status codes
      });
      
      return {
        success: response.status === 200,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  };

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    token,
    loading,
    register,
    login,
    logout,
    forgotPassword,
    resetPassword,
    checkRegistrationStatus,
    getPendingUsers,
    approveUser,
    rejectUser,
    testBackendConnection,
    isAuthenticated: !!token
  }), [user, token, loading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
