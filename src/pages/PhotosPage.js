// File: pages/PhotosPage.js

import React from 'react';
import DailyPhotos from '../components/DailyPhotos';
import { useAuth } from '../contexts/AuthContext';

const PhotosPage = ({ darkMode }) => {
  const { currentUser } = useAuth();

  return (
    <div className={`min-h-screen ${
      darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-pink-50 to-purple-50'
    } py-8`}>
      <div className="container mx-auto px-4">
        <DailyPhotos
          coupleId="couple-id"
          userId={currentUser?.uid}
          userName={currentUser?.displayName}
          darkMode={darkMode}
        />
      </div>
    </div>
  );
};

export default PhotosPage;