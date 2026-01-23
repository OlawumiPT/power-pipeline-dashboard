import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

function ApprovalRedirect() {
  const { token } = useParams();
  
  useEffect(() => {
    const backendUrl = 'https://pt-power-pipeline-api.azurewebsites.net';
    const correctUrl = `${backendUrl}/api/admin/approve/${token}`;
    
    console.log('🔄 Redirecting from frontend to backend:', correctUrl);
    window.location.href = correctUrl;
  }, [token]);
  
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h2>Processing Approval...</h2>
      <p>Redirecting to the backend approval system. Please wait.</p>
    </div>
  );
}

export default ApprovalRedirect;
