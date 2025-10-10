// File: components/PublicRoute.js

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from './Loading';

export const PublicRoute = ({ children, darkMode = false }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingScreen darkMode={darkMode} message="Loading..." />;
  }

  if (currentUser) {
    return <Navigate to="/home" replace />;
  }

  return children;
};

export default PublicRoute;