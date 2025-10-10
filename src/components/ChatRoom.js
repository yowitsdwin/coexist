// File: components/ChatRoom.js

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, Image as ImageIcon, Smile } from 'lucide-react';
import { ref, push, set } from 'firebase/database';
import { database } from '../firebase';
import { useRealtimeQuery } from '../utils/useFirebase';
import { useTypingHandler } from './TypingIndicator';
import TypingIndicator from './TypingIndicator';
import ChatMessage from './ChatMessage';
import ImageUpload from './ImageUpload';
import PresenceIndicator from './PresenceIndicator';
import { useToast } from '../utils/Toast';
import { sanitizeInput } from '../utils/helpers';
import { MessageSkeleton } from './Loading';

const ChatRoom = ({ userId, partnerId, coupleId, darkMode = false }) => {
  const [message, setMessage] = useState('');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const toast = useToast();

  // Fetch messages with query optimization
  const { data: messages, loading } = useRealtimeQuery(
    `messages/${coupleId}`,
    {
      orderBy: 'timestamp',
      limit: 100,
      transform: (val) => {
        if (!val) return [];
        return Object.entries(val)
          .map(([id, msg]) => ({ id, ...msg }))
          .sort((a, b) => a.timestamp - b.timestamp);
      }
    }
  );

  // Typing indicator
  const { handleTyping, stopTyping } = useTypingHandler(userId, coupleId);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Send message
  const sendMessage = useCallback(async (imageData = null) => {
    const trimmedMessage = message.trim();
    
    if (!trimmedMessage && !imageData) return;

    const sanitized = sanitizeInput(trimmedMessage, 1000);
    
    try {
      const messagesRef = ref(database, `messages/${coupleId}`);
      const newMessageRef = push(messagesRef);
      
      await set(newMessageRef, {
        text: sanitized,
        userId,
        timestamp: Date.now(),
        ...(imageData && { imageData })
      });

      setMessage('');
      setShowImageUpload(false);
      stopTyping();
      inputRef.current?.focus();
      
      toast.success('Message sent');
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Failed to send message');
    }
  }, [message, userId, coupleId, stopTyping, toast]);

  // Handle input change
  const handleInputChange = useCallback((e) => {
    setMessage(e.target.value);
    handleTyping();
  }, [handleTyping]);

  // Handle key press
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // Handle image upload
  const handleImageUpload = useCallback((imageData) => {
    sendMessage(imageData);
  }, [sendMessage]);

  // Memoized message list
  const messageList = useMemo(() => {
    return messages?.map((msg) => (
      <ChatMessage
        key={msg.id}
        message={msg}
        isOwn={msg.userId === userId}
        userId={userId}
        darkMode={darkMode}
      />
    ));
  }, [messages, userId, darkMode]);

  return (
    <div className={`flex flex-col h-screen ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Header */}
      <div className={`p-4 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-sm`}>
        <div className="flex items-center justify-between">
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Chat
          </h2>
          <PresenceIndicator partnerId={partnerId} darkMode={darkMode} />
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <>
            <MessageSkeleton darkMode={darkMode} isOwn={false} />
            <MessageSkeleton darkMode={darkMode} isOwn={true} />
            <MessageSkeleton darkMode={darkMode} isOwn={false} />
          </>
        ) : messages?.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Smile className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No messages yet. Start the conversation!
              </p>
            </div>
          </div>
        ) : (
          messageList
        )}
        
        <TypingIndicator userId={userId} channel={coupleId} darkMode={darkMode} />
        <div ref={messagesEndRef} />
      </div>

      {/* Image upload modal */}
      {showImageUpload && (
        <div className="p-4 border-t border-gray-200">
          <ImageUpload
            onUpload={handleImageUpload}
            onCancel={() => setShowImageUpload(false)}
            darkMode={darkMode}
          />
        </div>
      )}

      {/* Input area - Fixed at bottom */}
      <div className={`p-4 border-t ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-lg`}>
        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowImageUpload(!showImageUpload)}
            className={`p-3 rounded-full ${
              showImageUpload 
                ? 'bg-pink-500 text-white' 
                : darkMode 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            } transition-colors`}
            aria-label="Attach image"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={message}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              rows="1"
              className={`w-full px-4 py-3 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                darkMode 
                  ? 'bg-gray-700 text-white placeholder-gray-400' 
                  : 'bg-gray-100 text-gray-800 placeholder-gray-500'
              }`}
              style={{ maxHeight: '120px' }}
            />
          </div>

          <button
            onClick={() => sendMessage()}
            disabled={!message.trim()}
            className={`p-3 rounded-full transition-all ${
              message.trim()
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 shadow-lg'
                : darkMode
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default ChatRoom;