import api from './api';

const authService = {
  login: async (credentials) => {
    // For demo - replace with actual API call
    const mockUsers = {
      'operator': { role: 'operator', name: 'Control Room Operator', permissions: ['view', 'basic_controls'] },
      'engineer': { role: 'engineer', name: 'Systems Engineer', permissions: ['view', 'advanced_params', 'history'] },
      'admin': { role: 'admin', name: 'Administrator', permissions: ['all'] }
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    if (credentials.username in mockUsers && credentials.password === 'PipelineSecure2024!') {
      const user = mockUsers[credentials.username];
      return {
        token: `mock-jwt-token-${Date.now()}`,
        user: {
          ...user,
          id: Math.random().toString(36).substr(2, 9)
        }
      };
    }
    
    throw new Error('Invalid credentials');
  },

  verifyToken: async (token) => {
    // Token verification logic
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      role: 'operator',
      name: 'Control Room Operator',
      permissions: ['view', 'basic_controls']
    };
  },

  requestPasswordReset: async (email) => {
    // Implement password reset
    return { success: true };
  }
};

export default authService;