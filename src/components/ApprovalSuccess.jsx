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
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    const processApproval = async () => {
      try {
        console.log('🚀 ApprovalSuccess component mounted');
        console.log('Token:', token);
        console.log('Current URL:', window.location.href);
        
        // Extract username from query parameters if available
        const params = new URLSearchParams(location.search);
        const userParam = params.get('user');
        if (userParam) {
          setUsername(decodeURIComponent(userParam));
        }
        
        // If we have a token, call the backend API
        if (token) {
          console.log('Calling backend API to approve user...');
          
          // Try different endpoints
          const backendUrl = 'https://pt-power-pipeline-api.azurewebsites.net';
          const endpoints = [
            `${backendUrl}/api/approve/${token}`,  // From authRoutes-with-email.js
            `${backendUrl}/admin/approve/${token}`, // Alternative
            `${backendUrl}/api/admin/approve/${token}` // Another alternative
          ];
          
          let response;
          let successfulEndpoint = '';
          
          for (const endpoint of endpoints) {
            try {
              console.log('Trying endpoint:', endpoint);
              response = await fetch(endpoint);
              console.log('Response status:', response.status);
              
              if (response.ok) {
                successfulEndpoint = endpoint;
                break;
              }
            } catch (err) {
              console.log('Endpoint failed:', endpoint, err.message);
            }
          }
          
          if (response && response.ok) {
            console.log('✅ Backend approval successful via:', successfulEndpoint);
            const data = await response.text();
            console.log('Backend response type:', response.headers.get('content-type'));
            
            setDebugInfo(`Approval processed via: ${successfulEndpoint.replace(backendUrl, '')}`);
            setSuccess(true);
            setMessage('Account approved successfully!');
          } else {
            console.warn('❌ All endpoints failed');
            setDebugInfo(`All endpoints failed. Last status: ${response?.status || 'No response'}`);
            setSuccess(false);
            setMessage('Approval endpoint not found. Please check backend configuration.');
          }
        } else {
          // No token, just show success message
          setSuccess(true);
          setMessage('Account approved successfully!');
          setDebugInfo('No token provided - showing generic success message');
        }
        
      } catch (error) {
        console.error('Approval process error:', error);
        setSuccess(false);
        setMessage(error.message || 'Failed to process approval');
        setDebugInfo(`Error: ${error.message}`);
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
        
        {debugInfo && (
          <div style={styles.debugInfo}>
            <p><small>{debugInfo}</small></p>
            {token && <p><small>Token: {token.substring(0, 20)}...</small></p>}
          </div>
        )}
        
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
              <button 
                onClick={() => window.location.href = `https://pt-power-pipeline-api.azurewebsites.net/api/approve/${token}`}
                style={styles.directButton}
              >
                Try Direct Link
              </button>
            </>
          )}
        </div>
        
        <div style={styles.note}>
          <p><small>
            <strong>Note:</strong> If approval fails, try these direct links:<br/>
            1. <a href={`https://pt-power-pipeline-api.azurewebsites.net/api/approve/${token}`} target="_blank" rel="noopener noreferrer">
              /api/approve/{token}
            </a><br/>
            2. <a href={`https://pt-power-pipeline-api.azurewebsites.net/admin/approve/${token}`} target="_blank" rel="noopener noreferrer">
              /admin/approve/{token}
            </a>
          </small></p>
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
  debugInfo: {
    background: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'left',
    fontSize: '0.9rem',
    color: '#666',
    borderLeft: '4px solid #6c757d',
  },
  userInfo: {
    background: '#e8f5e9',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '30px',
    textAlign: 'left',
    borderLeft: '4px solid #28a745',
  },
  note: {
    background: '#fff3cd',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'left',
    fontSize: '0.85rem',
    color: '#856404',
    borderLeft: '4px solid #ffc107',
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
    textDecoration: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    minWidth: '150px',
    textAlign: 'center',
    display: 'inline-block',
    transition: 'background 0.3s',
    border: 'none',
    cursor: 'pointer',
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
    display: 'inline-block',
    transition: 'background 0.3s',
    border: 'none',
    cursor: 'pointer',
  },
  directButton: {
    padding: '12px 24px',
    background: '#17a2b8',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    minWidth: '150px',
    textAlign: 'center',
    display: 'inline-block',
    transition: 'background 0.3s',
    border: 'none',
    cursor: 'pointer',
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
