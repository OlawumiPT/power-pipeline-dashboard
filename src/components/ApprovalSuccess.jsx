import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

const ApprovalSuccess = () => {
  const { token } = useParams(); 
  const location = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Processing approval...');
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [userInfo, setUserInfo] = useState({
    username: '',
    email: '',
    fullName: ''
  });

  useEffect(() => {
    const processApproval = async () => {
      try {
        if (token) {
          const backendUrl = 'https://pt-power-pipeline-api.azurewebsites.net';
          const response = await fetch(`${backendUrl}/api/admin/approve/${token}`);
          
          if (response.ok) {
            setSuccess(true);
            setMessage('Account approved successfully!');
            
            // Try to get user info from response
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const data = await response.json();
              if (data.user) {
                setUserInfo({
                  username: data.user.username || '',
                  email: data.user.email || '',
                  fullName: data.user.full_name || data.user.fullName || ''
                });
              }
            }
          } else {
            setSuccess(false);
            setMessage('Approval failed. Please try again or contact support.');
          }
        }
        
        // Also check URL query parameters for user info
        const params = new URLSearchParams(location.search);
        const urlUser = params.get('user');
        const urlEmail = params.get('email');
        const urlName = params.get('name');
        
        if (urlUser && !userInfo.username) {
          setUserInfo(prev => ({
            ...prev,
            username: decodeURIComponent(urlUser)
          }));
        }
        if (urlEmail && !userInfo.email) {
          setUserInfo(prev => ({
            ...prev,
            email: decodeURIComponent(urlEmail)
          }));
        }
        if (urlName && !userInfo.fullName) {
          setUserInfo(prev => ({
            ...prev,
            fullName: decodeURIComponent(urlName)
          }));
        }
        
      } catch (error) {
        console.error('Approval error:', error);
        setSuccess(false);
        setMessage('An error occurred during approval.');
      } finally {
        setLoading(false);
      }
    };

    processApproval();
  }, [token, location]);

  // Render user information
  const renderUserInfo = () => {
    if (!userInfo.username && !userInfo.email && !userInfo.fullName) {
      return null;
    }
    
    return (
      <div style={styles.userInfo}>
        <h3 style={styles.userInfoTitle}>Approved User:</h3>
        {userInfo.username && (
          <p style={styles.userInfoItem}>
            <strong>Username:</strong> {userInfo.username}
          </p>
        )}
        {userInfo.email && (
          <p style={styles.userInfoItem}>
            <strong>Email:</strong> {userInfo.email}
          </p>
        )}
        {userInfo.fullName && (
          <p style={styles.userInfoItem}>
            <strong>Full Name:</strong> {userInfo.fullName}
          </p>
        )}
        <p style={styles.userInfoNote}>
          This user can now log in with their credentials.
        </p>
      </div>
    );
  };

  const handleGoToAdminPanel = () => {
    navigate('/admin/approvals');
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>
          {loading ? '⏳' : (success ? '✅' : '❌')}
        </div>
        
        <h1>{loading ? 'Processing Approval...' : (success ? 'Account Approved!' : 'Approval Failed')}</h1>
        
        <p style={styles.message}>{message}</p>
        
        {success && renderUserInfo()}
        
        <div style={styles.actions}>
          <button 
            onClick={handleBackToLogin} 
            style={styles.primaryButton}
            disabled={loading}
          >
            Go to Login
          </button>
          
          <button 
            onClick={handleGoToAdminPanel} 
            style={styles.secondaryButton}
            disabled={loading}
          >
            Admin Panel
          </button>
        </div>
        
        <div style={styles.footer}>
          <p>Power Transitions Platform</p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
  },
  card: {
    background: 'white',
    padding: '40px',
    borderRadius: '15px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    textAlign: 'center',
    maxWidth: '500px',
    width: '100%',
  },
  icon: {
    fontSize: '4rem',
    marginBottom: '20px',
  },
  message: {
    fontSize: '1.1rem',
    color: '#555',
    marginBottom: '30px',
    lineHeight: '1.6',
  },
  userInfo: {
    background: '#e8f5e9',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '30px',
    textAlign: 'left',
    borderLeft: '4px solid #28a745',
  },
  userInfoTitle: {
    marginTop: '0',
    marginBottom: '15px',
    color: '#155724',
    fontSize: '1.2rem',
  },
  userInfoItem: {
    margin: '8px 0',
    color: '#333',
  },
  userInfoNote: {
    marginTop: '15px',
    paddingTop: '15px',
    borderTop: '1px solid #c3e6cb',
    color: '#155724',
    fontStyle: 'italic',
  },
  actions: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: '20px',
  },
  primaryButton: {
    padding: '12px 24px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    minWidth: '150px',
    textAlign: 'center',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.3s ease',
  },
  secondaryButton: {
    padding: '12px 24px',
    background: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    minWidth: '150px',
    textAlign: 'center',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.3s ease',
  },
  footer: {
    marginTop: '30px',
    paddingTop: '20px',
    borderTop: '1px solid #eee',
    color: '#777',
    fontSize: '0.9rem',
  },
};

export default ApprovalSuccess;
