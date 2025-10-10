// File: App.js

import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { useConnectionState } from './utils/useFirebase';
import { initCleanup } from './utils/cleanup';

// Route Components
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import MainLayout from './components/MainLayout';

// Pages
import HomePage from './pages/HomePage';
import ChatPage from './pages/ChatPage';
import PhotosPage from './pages/PhotosPage';
import CanvasPage from './pages/CanvasPage';
import ProfilePage from './pages/ProfilePage';
import AuthPage from './pages/AuthPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  const isConnected = useConnectionState();
  const [darkMode, setDarkMode] = useState(false);

  // Initialize cleanup on mount
  useEffect(() => {
    const cleanupId = initCleanup();
    return () => clearInterval(cleanupId);
  }, []);

  // Dark mode handler
  const handleToggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  return (
    <ErrorBoundary>
      {!isConnected && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center py-2 z-[999]">
          Reconnecting...
        </div>
      )}

      <Routes>
        {/* Protected Routes (Require Authentication) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout darkMode={darkMode} onToggleDarkMode={handleToggleDarkMode} />
            </ProtectedRoute>
          }
        >
          <Route path="home" element={<HomePage darkMode={darkMode} />} />
          <Route path="chat" element={<ChatPage darkMode={darkMode} />} />
          <Route path="photos" element={<PhotosPage darkMode={darkMode} />} />
          <Route path="canvas" element={<CanvasPage darkMode={darkMode} />} />
          <Route path="profile" element={<ProfilePage darkMode={darkMode} />} />
          <Route index element={<HomePage darkMode={darkMode} />} />
        </Route>

        {/* Public Routes (e.g., Login/Signup) */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <AuthPage darkMode={darkMode} />
            </PublicRoute>
          }
        />

        {/* Not Found Page */}
        <Route path="*" element={<NotFoundPage darkMode={darkMode} />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;