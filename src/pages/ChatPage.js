// File: pages/ChatPage.js

import React from 'react';
import ChatRoom from '../components/ChatRoom';
import { useAuth } from '../contexts/AuthContext';
import { useCouple } from '../contexts/CoupleContext'; // Import the new hook

const ChatPage = ({ darkMode }) => {
  const { currentUser } = useAuth();
  const { coupleId, partnerId } = useCouple(); // Use the hook

  // Don't render if the data isn't ready
  if (!currentUser || !coupleId || !partnerId) {
    return null; // Or a loading indicator
  }

  return (
    <div className={`h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <ChatRoom
        userId={currentUser.uid}
        partnerId={partnerId}
        coupleId={coupleId}
        darkMode={darkMode}
      />
    </div>
  );
};

export default ChatPage;