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

  // API base URL
  const API_URL = import.meta.env.VITE_API_URL || '/api';

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
          // Verify token with backend
          const response = await axios.post('/auth/verify', { token: storedToken });
          
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

 // In AuthContext.jsx, update the register function:

const register = async (userData) => {
  try {
    console.log('Registering user with approval flow:', userData);
    
    const response = await axios.post('/auth/register', {
      ...userData,
      status: 'pending_approval' // Ensure this is sent
    }, {
      timeout: 10000,
      validateStatus: function (status) {
        return status >= 200 && status < 300;
      }
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
      } else {
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      }
    } else if (error.request) {
      errorMessage = 'No response from server. Please check your connection.';
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
        const response = await axios.get(`/auth/registration-status/${encodeURIComponent(email)}`);
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
          validateStatus: function (status) {
            return status >= 200 && status < 300;
          }
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

      // Send login request with client info
      const response = await axios.post('/auth/login', {
        ...credentials,
        ...clientInfo
      }, {
        timeout: 10000,
        validateStatus: function (status) {
          return status >= 200 && status < 300;
        }
      });

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
        user: userData
      };
    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed. Please check credentials.';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Login request timed out. Please try again.';
      } else if (error.response) {
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
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
      const response = await axios.post('/auth/forgot-password', { email }, {
        timeout: 10000,
        validateStatus: function (status) {
          return status >= 200 && status < 300;
        }
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
      const response = await axios.post(`/auth/reset-password/${token}`, { password }, {
        timeout: 10000,
        validateStatus: function (status) {
          return status >= 200 && status < 300;
        }
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
        await axios.post('/auth/logout', { token });
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

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    token,
    register,
    login,
    logout,
    forgotPassword,
    resetPassword,
    loading
  }), [user, token, loading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};