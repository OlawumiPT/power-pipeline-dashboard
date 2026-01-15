import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './AdminApproval.css';

const AdminApproval = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedRole, setSelectedRole] = useState('operator');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const { user, token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchPendingUsers();
    } else {
      navigate('/dashboard');
    }
  }, [user]);

  const fetchPendingUsers = async () => {
    try {
      //const response = await fetch('http://localhost:3001/api/admin/pending-users', {
      const response = await fetch('/api/admin/pending-users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch pending users');
      }
      
      const data = await response.json();
      setPendingUsers(data);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      setMessage({ type: 'error', text: 'Failed to load pending users' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/admin/approve-user/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: selectedRole })
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve user');
      }
      
      const data = await response.json();
      
      setMessage({ type: 'success', text: data.message });
      setPendingUsers(pendingUsers.filter(user => user.id !== userId));
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error approving user:', error);
      setMessage({ type: 'error', text: 'Failed to approve user' });
    }
  };

  const handleReject = async (userId, reason) => {
    try {
      const response = await fetch(`http://localhost:3001/api/admin/reject-user/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });
      
      if (!response.ok) {
        throw new Error('Failed to reject user');
      }
      
      const data = await response.json();
      
      setMessage({ type: 'success', text: data.message });
      setPendingUsers(pendingUsers.filter(user => user.id !== userId));
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedUser(null);
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error rejecting user:', error);
      setMessage({ type: 'error', text: 'Failed to reject user' });
    }
  };

  const openRejectModal = (user) => {
    setSelectedUser(user);
    setShowRejectModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You must be an administrator to access this page.</p>
      </div>
    );
  }

  return (
    <div className="admin-approval-container">
      <div className="admin-approval-header">
        <h1>User Approval Portal</h1>
        <p className="subtitle">Approve or reject new user registrations</p>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.type === 'success' ? '✅' : '⚠️'} {message.text}
        </div>
      )}

      <div className="approval-controls">
        <div className="role-selector">
          <label htmlFor="defaultRole">Default approval role:</label>
          <select
            id="defaultRole"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="role-select"
          >
            <option value="operator">Operator</option>
            <option value="engineer">Engineer</option>
            <option value="viewer">Viewer</option>
            <option value="admin">Administrator</option>
          </select>
          <span className="help-text">Selected role will be assigned to approved users</span>
        </div>
        
        <button 
          className="refresh-btn"
          onClick={fetchPendingUsers}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : '⟳ Refresh List'}
        </button>
      </div>

      {loading ? (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading pending users...</p>
        </div>
      ) : pendingUsers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No Pending Approvals</h3>
          <p>There are no users waiting for approval.</p>
        </div>
      ) : (
        <div className="pending-users-list">
          <div className="list-header">
            <div className="header-item user-info">User Information</div>
            <div className="header-item registration-date">Registration Date</div>
            <div className="header-item actions">Actions</div>
          </div>
          
          {pendingUsers.map((pendingUser) => (
            <div key={pendingUser.id} className="pending-user-card">
              <div className="user-info">
                <div className="user-name">
                  <strong>{pendingUser.full_name || 'No name provided'}</strong>
                  <span className="user-email">({pendingUser.email})</span>
                </div>
                <div className="user-details">
                  <span className="username">Username: {pendingUser.username}</span>
                </div>
              </div>
              
              <div className="registration-date">
                {formatDate(pendingUser.created_at)}
              </div>
              
              <div className="actions">
                <div className="role-selector-inline">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="role-select-small"
                  >
                    <option value="operator">Operator</option>
                    <option value="engineer">Engineer</option>
                    <option value="viewer">Viewer</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                
                <button
                  className="approve-btn"
                  onClick={() => handleApprove(pendingUser.id)}
                >
                  ✓ Approve
                </button>
                
                <button
                  className="reject-btn"
                  onClick={() => openRejectModal(pendingUser)}
                >
                  ✗ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Reject User Registration</h3>
            <p>
              Are you sure you want to reject <strong>{selectedUser?.full_name || selectedUser?.username}</strong>?
            </p>
            
            <div className="form-group">
              <label htmlFor="rejectionReason">Reason for rejection (optional):</label>
              <textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide a reason for rejection..."
                rows="3"
                className="reason-textarea"
              />
            </div>
            
            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedUser(null);
                }}
              >
                Cancel
              </button>
              <button
                className="confirm-reject-btn"
                onClick={() => handleReject(selectedUser.id, rejectionReason)}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-footer">
        <div className="stats">
          <span className="stat">
            <strong>{pendingUsers.length}</strong> pending approval
          </span>
          <span className="stat-separator">•</span>
          <span className="stat">
            Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        
        <div className="footer-links">
          <button className="footer-link" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
          <span className="separator">•</span>
          <button className="footer-link" onClick={() => navigate('/admin/users')}>
            Manage All Users
          </button>
        </div>
        
        <p className="security-notice">
          <strong>⚠️ Security Notice:</strong> All approval actions are logged and audited.
        </p>
      </div>
    </div>
  );
};

export default AdminApproval;