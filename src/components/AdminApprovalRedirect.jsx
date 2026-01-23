// src/components/AdminApprovalRedirect.jsx
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

function AdminApprovalRedirect() {
  const { token } = useParams();
  
  useEffect(() => {
    // Show loading message
    console.log('Admin approval redirect with token:', token);
    
    // Redirect to backend API
    const backendUrl = process.env.REACT_APP_API_URL || 'https://pt-power-pipeline-api.azurewebsites.net';
    window.location.href = `${backendUrl}/api/admin/approve/${token}`;
  }, [token]);

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h2>Processing Approval...</h2>
      <p>Redirecting to the approval system. Please wait...</p>
    </div>
  );
}

export default AdminApprovalRedirect;
