import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';

const ApprovalSuccess = () => {
  const { token } = useParams(); 
  const location = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Processing approval...');
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    const processApproval = async () => {
      try {
        if (token) {
          const backendUrl = 'https://pt-power-pipeline-api.azurewebsites.net';
          const response = await fetch(`${backendUrl}/api/admin/approve/${token}`);
          
          if (response.ok) {
            setSuccess(true);
            setMessage('Account approved successfully!');
          } else {
            setSuccess(false);
            setMessage('Approval failed. Please try again or contact support.');
          }
        } else {
          setSuccess(true);
          setMessage('Account approved successfully!');
        }

        const params = new URLSearchParams(location.search);
        const userParam = params.get('user');
        if (userParam) {
          setUsername(decodeURIComponent(userParam));
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
        
        {username && success && (
          <div style={styles.userInfo}>
            <p><strong>Username:</strong> {username}</p>
            <p>The user can now log in with their credentials.</p>
          </div>
        )}
        
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
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '30px',
    textAlign: 'left',
    borderLeft: '4px solid #28a745',
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

// Add hover effects
const addHoverStyles = () => {
  const styleSheet = document.styleSheets[0];
  styleSheet.insertRule(`
    .approval-button:hover {
      opacity: 0.9;
      transform: translateY(-2px);
    }
  `, styleSheet.cssRules.length);
  
  styleSheet.insertRule(`
    .approval-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `, styleSheet.cssRules.length);
};

// Initialize hover styles
if (typeof window !== 'undefined') {
  addHoverStyles();
  
  // Add class to buttons
  const primaryButton = document.querySelector('[style*="primaryButton"]');
  const secondaryButton = document.querySelector('[style*="secondaryButton"]');
  if (primaryButton) primaryButton.classList.add('approval-button');
  if (secondaryButton) secondaryButton.classList.add('approval-button');
}

export default ApprovalSuccess;
