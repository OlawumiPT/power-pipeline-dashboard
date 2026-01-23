// src/components/ApprovalRedirect.jsx
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

function ApprovalRedirect() {
  const { token } = useParams();
  
  useEffect(() => {
    // Construct the correct backend URL
    const backendUrl = 'https://pt-power-pipeline-api.azurewebsites.net';
    const correctUrl = `${backendUrl}/api/admin/approve/${token}`;
    
    console.log('🔄 Redirecting from wrong frontend link to:', correctUrl);
    
    // Redirect immediately
    window.location.href = correctUrl;
  }, [token]);
  
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h2>Processing Approval...</h2>
      <p>Redirecting to the backend approval system. Please wait...</p>
      <p>If you are not redirected automatically, <a href={`https://pt-power-pipeline-api.azurewebsites.net/api/admin/approve/${token}`}>click here</a>.</p>
    </div>
  );
}

export default ApprovalRedirect;
