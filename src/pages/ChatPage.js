// File: pages/ChatPage.js

import React from 'react';
import ChatRoom from '../components/ChatRoom';
import { useAuth } from '../contexts/AuthContext';

const ChatPage = ({ darkMode }) => {
  const { currentUser } = useAuth();

  return (
    <div className={`h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <ChatRoom
        userId={currentUser?.uid}
        partnerId="partner-id" // Should come from couple relationship
        coupleId="couple-id"
        darkMode={darkMode}
      />
    </div>
  );
};

export default ChatPage;