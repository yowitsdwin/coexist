import React from 'react';
import ChatRoom from '../components/ChatRoom';
import { useAuth } from '../contexts/AuthContext';
import { useCouple } from '../contexts/CoupleContext';
import { Heart } from 'lucide-react';

const ChatPage = ({ darkMode }) => {
  const { currentUser } = useAuth();
  const { coupleId, partner } = useCouple(); 

  if (!currentUser || !coupleId || !partner) {
    return (
      <div className={`h-screen flex items-center justify-center ${
        darkMode 
          ? 'bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900' 
          : 'bg-gradient-to-br from-gray-50 via-pink-50 to-purple-50'
      }`}>
        <div className="text-center">
          <Heart className={`w-16 h-16 mx-auto mb-4 animate-pulse ${
            darkMode ? 'text-pink-400' : 'text-pink-500'
          }`} fill="currentColor" />
          <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Loading your conversation...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen transition-colors duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900' 
        : 'bg-gradient-to-br from-gray-50 via-pink-50/30 to-purple-50/30'
    }`}>
      <ChatRoom
        coupleId={coupleId}
        currentUser={currentUser}
        partner={partner}
        darkMode={darkMode}
      />
    </div>
  );
};

export default ChatPage;