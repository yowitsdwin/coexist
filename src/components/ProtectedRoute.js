// File: components/ProtectedRoute.js

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from './Loading';

export const ProtectedRoute = ({ children, darkMode = false }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingScreen darkMode={darkMode} message="Authenticating..." />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;