import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

function ApprovalRedirect() {
  const { token } = useParams();
  
  useEffect(() => {
    const backendUrl = 'https://pt-power-pipeline-api.azurewebsites.net';
    const correctUrl = `${backendUrl}/api/admin/approve/${token}`;
    
    console.log('🔄 Redirecting from frontend to:', correctUrl);
    window.location.href = correctUrl;
  }, [token]);
  
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h2>Redirecting to Approval System...</h2>
      <p>Please wait while we redirect you to the correct approval page.</p>
    </div>
  );
}

export default ApprovalRedirect;
