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
        
        // Check if we're on frontend or backend
        const isFrontend = window.location.hostname.includes('platform.power-transitions.com');
        const isBackend = window.location.hostname.includes('pt-power-pipeline-api');
        
        console.log('Is Frontend:', isFrontend);
        console.log('Is Backend:', isBackend);
        
        if (isFrontend) {
          // We're on the FRONTEND React app
          // This means admin clicked a link that went to frontend instead of backend
          setDebugInfo('Frontend React app loaded. The approval should have been processed by backend when admin clicked the email link.');
          
          // Extract username from query parameters if available
          const params = new URLSearchParams(location.search);
          const userParam = params.get('user');
          if (userParam) {
            setUsername(decodeURIComponent(userParam));
          }
          
          // If we have a token, we could call the backend API
          if (token) {
            console.log('Calling backend API to approve user...');
            try {
              // Call the actual BACKEND API (not frontend)
              const backendUrl = 'https://pt-power-pipeline-api.azurewebsites.net';
              const response = await fetch(`${backendUrl}/admin/approve/${token}`);
              
              if (response.ok) {
                console.log('Backend approval successful');
                const data = await response.text();
                console.log('Backend response (first 200 chars):', data.substring(0, 200));
                
                // If backend returns HTML, it means approval was processed
                setSuccess(true);
                setMessage('Account approved successfully via backend!');
              } else {
                console.warn('Backend returned error status:', response.status);
                setSuccess(false);
                setMessage(`Backend error: ${response.status}. The approval link might be invalid.`);
              }
            } catch (apiError) {
              console.error('Error calling backend API:', apiError);
              setDebugInfo(`API Error: ${apiError.message}. The backend might be unavailable.`);
              setSuccess(false);
              setMessage('Could not connect to approval service. Please contact administrator.');
            }
          } else {
            // No token, just show success message
            setSuccess(true);
            setMessage('Account approved successfully!');
          }
        } else if (isBackend) {
          // We're on the BACKEND - this shouldn't happen in React component
          setDebugInfo('Directly on backend - approval should be processed automatically');
          setSuccess(true);
          setMessage('Backend approval page loaded');
        } else {
          setDebugInfo(`Unknown host: ${window.location.hostname}`);
          setSuccess(true);
          setMessage('Approval processed');
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
            </>
          )}
        </div>
        
        <div style={styles.note}>
          <p><small>
            <strong>Note:</strong> The approval link in emails should go directly to:<br/>
            <code>https://pt-power-pipeline-api.azurewebsites.net/admin/approve/&#123;token&#125;</code>
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
styles.primaryButton[':hover'] = { background: '#218838' };
styles.secondaryButton[':hover'] = { background: '#5a6268' };

export default ApprovalSuccess;
