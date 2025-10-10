// File: pages/CanvasPage.js

import React from 'react';
import OptimizedCanvas from '../components/OptimizedCanvas';
import { useAuth } from '../contexts/AuthContext';

const CanvasPage = ({ darkMode }) => {
  const { currentUser } = useAuth();

  return (
    <div className={`min-h-screen ${
      darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-pink-50 to-purple-50'
    } py-8`}>
      <div className="container mx-auto px-4">
        <div className={`${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } rounded-2xl shadow-xl p-6`}>
          <h1 className={`text-2xl font-bold mb-6 ${
            darkMode ? 'text-white' : 'text-gray-800'
          }`}>
            🎨 Shared Canvas
          </h1>
          <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Draw together in real-time! Everything you create is instantly visible to your partner.
          </p>
          <OptimizedCanvas
            coupleId="couple-id"
            userId={currentUser?.uid}
            darkMode={darkMode}
          />
        </div>
      </div>
    </div>
  );
};

export default CanvasPage;