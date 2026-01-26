import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import axios from 'axios';

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
         const response = await axios.get(`/admin/approve/${token}`);
          console.log('Approval processed:', response.data);
          
          // Extract username from redirect URL if available
          const params = new URLSearchParams(location.search);
          const userParam = params.get('user') || 'the user';
          setUsername(userParam);
        } else {
          // If no token, check for query parameters
          const params = new URLSearchParams(location.search);
          const userParam = params.get('user');
          if (userParam) {
            setUsername(decodeURIComponent(userParam));
          }
        }
        
        setSuccess(true);
        setMessage('Account approved successfully!');
      } catch (error) {
        console.error('Approval error:', error);
        setSuccess(false);
        setMessage(error.response?.data?.message || 'Failed to process approval');
      } finally {
        setLoading(false);
      }
    };

    processApproval();
  }, [token, location]);

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
          {success ? (
            <>
              <Link to="/login" style={styles.primaryButton}>
                Go to Login
              </Link>
              <Link to="/admin/approvals" style={styles.secondaryButton}>
                Admin Panel
              </Link>
            </>
          ) : (
            <>
              <Link to="/admin/approvals" style={styles.primaryButton}>
                Go to Admin Panel
              </Link>
              <Link to="/login" style={styles.secondaryButton}>
                Back to Login
              </Link>
            </>
          )}
        </div>
        
        <div style={styles.footer}>
          <p>Powered by Power Transitions Platform</p>
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
    background: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '30px',
    textAlign: 'left',
  },
  actions: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  primaryButton: {
    padding: '12px 24px',
    background: '#28a745',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    minWidth: '150px',
    textAlign: 'center',
  },
  secondaryButton: {
    padding: '12px 24px',
    background: '#6c757d',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    minWidth: '150px',
    textAlign: 'center',
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
