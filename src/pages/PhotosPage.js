import React from 'react';
import DailyPhotos from '../components/DailyPhotos';
import { useAuth } from '../contexts/AuthContext';
import { useCouple } from '../contexts/CoupleContext'; // Import the couple hook

const PhotosPage = ({ darkMode }) => {
  const { currentUser } = useAuth();
  const { coupleId } = useCouple(); // Get the dynamic coupleId

  // Guard clause to prevent rendering before data is ready
  if (!currentUser || !coupleId) {
    return null; // Or a full-page loading skeleton
  }

  return (
    <div className={`min-h-screen ${
      darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-pink-50 to-purple-50'
    } py-8`}>
      <div className="container mx-auto px-4">
        <DailyPhotos
          coupleId={coupleId} // Pass the dynamic coupleId
          userId={currentUser.uid}
          userName={currentUser.displayName}
          darkMode={darkMode}
        />
      </div>
    </div>
  );
};

export default PhotosPage;