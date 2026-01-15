import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from './LoadingScreen';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    // Redirect to login if not authenticated
    console.log('ProtectedRoute: No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Check if admin access is required
  if (requireAdmin && user.role !== 'admin') {
    console.log(`ProtectedRoute: User role ${user.role} is not admin, redirecting to dashboard`);
    return <Navigate to="/dashboard" replace />;
  }

  console.log(`ProtectedRoute: User authenticated (${user.role}), showing page`);
  return children;
};

export default ProtectedRoute;