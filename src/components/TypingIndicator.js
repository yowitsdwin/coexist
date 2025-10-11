// File: components/TypingIndicator.js

import React from 'react';
import { useTypingIndicator } from '../utils/useFirebase';

export const TypingIndicator = ({ userId, channel, darkMode }) => {
  const { typingUsers, isAnyoneTyping } = useTypingIndicator(userId, channel);

  if (!isAnyoneTyping) return null;

  const typingUsernames = Object.values(typingUsers).map(u => u.username || 'Someone');

  return (
    <div className={`px-4 py-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm italic`}>
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span>{typingUsernames[0]} is typing...</span>
      </div>
    </div>
  );
};

export const useTypingHandler = (userId, channel) => {
  const { setTyping } = useTypingIndicator(userId, channel);
  const timeoutRef = React.useRef(null);

  const handleTyping = React.useCallback(() => {
    if (setTyping) {
      setTyping(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, 3000);
    }
  }, [setTyping]);

  const stopTyping = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (setTyping) {
      setTyping(false);
    }
  }, [setTyping]);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (setTyping) {
        setTyping(false);
      }
    };
  }, [setTyping]);

  return { handleTyping, stopTyping };
};

export default TypingIndicator; 