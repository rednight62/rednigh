import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

export default function ProtectedRoute({ roles = [], children }) {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    // Redirect to login page, but save the current location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if route is role-protected and user has required role
  if (roles.length > 0 && !roles.some(role => currentUser?.role === role)) {
    // User is not authorized for this route
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  // If all checks pass, render the child routes
  return children || <Outlet />;
}
