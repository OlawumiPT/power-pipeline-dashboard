import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import DashboardContent from './DashboardContent';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingScreen from './components/LoadingScreen';
import ApprovalSuccess from './components/ApprovalSuccess';
import AdminApproval from './components/AdminApproval';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>

// Main App component
function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/admin/approve/:token" element={<ApprovalSuccess />} />
          <Route path="/approval-success" element={<ApprovalSuccess />} />
          
          {/* Admin Routes (require admin role) */}
          <Route 
            path="/admin/approvals" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminApproval />
              </ProtectedRoute>
            } 
          />
          
          {/* Protected Routes (any authenticated user) */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardContent />
              </ProtectedRoute>
            } 
          />
          
          {/* Default Route */}
          <Route 
            path="/" 
            element={<Navigate to="/dashboard" replace />} 
          />
          
          {/* Fallback Route */}
          <Route 
            path="*" 
            element={<Navigate to="/dashboard" replace />} 
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
