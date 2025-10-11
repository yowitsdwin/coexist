import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, Image, Smile, Loader2, Phone, Video, MoreVertical, X, ArrowDown, Heart, Sparkles } from 'lucide-react';
import { ref, push, set, remove } from 'firebase/database';
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

const ChatRoom = ({ currentUser, partner, coupleId, darkMode = false }) => {
  const [message, setMessage] = useState('');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [messageLimit, setMessageLimit] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const inputRef = useRef(null);
  const toast = useToast();

  const transformMessages = useCallback((val) => {
    if (!val) return [];
    const messageArray = Object.entries(val).map(([id, msg]) => ({ id, ...msg }));
    
    if (messageArray.length < messageLimit) {
      setHasMoreMessages(false);
    } else {
      setHasMoreMessages(true);
    }
    
    return messageArray.sort((a, b) => a.timestamp - b.timestamp);
  }, [messageLimit]);

  const { data: messages, loading } = useRealtimeQuery(
    `messages/${coupleId}`,
    {
      orderBy: 'timestamp',
      limit: messageLimit,
      transform: transformMessages,
      enabled: !!coupleId,
    }
  );

  const { handleTyping, stopTyping } = useTypingHandler(currentUser?.uid, coupleId);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (container.scrollTop === 0 && !loading && !isLoadingMore && hasMoreMessages) {
      setIsLoadingMore(true);
      setMessageLimit(prevLimit => prevLimit + 20);
    }

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  }, [loading, isLoadingMore, hasMoreMessages]);
  
  const [prevScrollHeight, setPrevScrollHeight] = useState(null);

  useEffect(() => {
    if (isLoadingMore) {
      setPrevScrollHeight(scrollContainerRef.current?.scrollHeight);
    }
  }, [isLoadingMore]);

  useEffect(() => {
    if (isLoadingMore && prevScrollHeight && messages) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight - prevScrollHeight;
      setIsLoadingMore(false);
    } else if (!isLoadingMore) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoadingMore, prevScrollHeight]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const sendMessage = useCallback(async (imageData = null) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage && !imageData) return;

    const sanitized = sanitizeInput(trimmedMessage, 1000);
    
    try {
      const messagesRef = ref(database, `messages/${coupleId}`);
      const newMessageRef = push(messagesRef);
      
      await set(newMessageRef, {
        text: sanitized,
        userId: currentUser?.uid,
        timestamp: Date.now(),
        ...(imageData && { imageData }),
        ...(replyTo && { replyTo: { id: replyTo.id, text: replyTo.text, userId: replyTo.userId } })
      });

      setMessage('');
      setShowImageUpload(false);
      setReplyTo(null);
      stopTyping();
      inputRef.current?.focus();
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Failed to send message');
    }
  }, [message, currentUser?.uid, coupleId, stopTyping, toast, replyTo, scrollToBottom]);

  const handleInputChange = useCallback((e) => {
    setMessage(e.target.value);
    handleTyping();
  }, [handleTyping]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const handleImageUpload = useCallback((imageData) => {
    sendMessage(imageData);
  }, [sendMessage]);

  const handleReply = useCallback((msg) => {
    setReplyTo(msg);
    inputRef.current?.focus();
  }, []);

  const handleDelete = useCallback(async (messageId) => {
    if (!window.confirm('Delete this message?')) return;
    
    try {
      const messageRef = ref(database, `messages/${coupleId}/${messageId}`);
      await remove(messageRef);
      toast.success('Message deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete message');
    }
  }, [coupleId, toast]);

  const insertEmoji = useCallback((emoji) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  }, []);

  const quickEmojis = ['❤️', '😊', '😂', '😍', '🥰', '😘', '💕', '✨', '🎉', '👍', '🙏', '😢'];

  const messageList = useMemo(() => {
    return messages?.map((msg) => (
      <ChatMessage
        key={msg.id}
        message={msg}
        isOwn={msg.userId === currentUser?.uid}
        userId={currentUser?.uid}
        darkMode={darkMode}
        onReply={handleReply}
        onDelete={handleDelete}
      />
    ));
  }, [messages, currentUser?.uid, darkMode, handleReply, handleDelete]);

  return (
    <div className={`flex flex-col h-screen ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
      {/* Header */}
      <div className={`relative px-4 py-3 border-b shadow-sm backdrop-blur-lg z-10 ${
        darkMode 
          ? 'bg-gray-800/95 border-gray-700' 
          : 'bg-white/95 border-gray-200'
      }`}>
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-pink-400/50 shadow-lg">
                {partner?.photoURL ? (
                  <img src={partner.photoURL} alt={partner.displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-white" fill="currentColor" />
                  </div>
                )}
              </div>
              <PresenceIndicator partnerId={partner?.uid} darkMode={darkMode} className="absolute -bottom-0.5 -right-0.5" />
            </div>
            
            <div>
              <h2 className={`font-semibold text-base ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {partner?.displayName || 'Partner'}
              </h2>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Active now
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className={`p-2 rounded-full transition-all hover:scale-110 ${
              darkMode 
                ? 'text-gray-300 hover:bg-gray-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`} aria-label="Voice call">
              <Phone className="w-5 h-5" />
            </button>
            <button className={`p-2 rounded-full transition-all hover:scale-110 ${
              darkMode 
                ? 'text-gray-300 hover:bg-gray-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`} aria-label="Video call">
              <Video className="w-5 h-5" />
            </button>
            <button className={`p-2 rounded-full transition-all hover:scale-110 ${
              darkMode 
                ? 'text-gray-300 hover:bg-gray-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`} aria-label="More options">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div 
        ref={scrollContainerRef} 
        onScroll={handleScroll} 
        className="flex-1 overflow-y-auto py-4 relative"
        style={{
          backgroundImage: darkMode 
            ? 'radial-gradient(circle at 20% 50%, rgba(236, 72, 153, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.03) 0%, transparent 50%)'
            : 'radial-gradient(circle at 20% 50%, rgba(236, 72, 153, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.05) 0%, transparent 50%)'
        }}
      >
        {isLoadingMore && (
          <div className="flex justify-center items-center p-4">
            <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
          </div>
        )}
        
        {loading && !messages ? (
          <div className="space-y-4 px-2">
            <MessageSkeleton darkMode={darkMode} isOwn={false} />
            <MessageSkeleton darkMode={darkMode} isOwn={true} />
            <MessageSkeleton darkMode={darkMode} isOwn={false} />
          </div>
        ) : messages?.length === 0 ? (
          <div className="flex items-center justify-center h-full px-4">
            <div className="text-center max-w-sm">
              <div className="relative mb-6">
                <Heart className={`w-20 h-20 mx-auto ${darkMode ? 'text-pink-400/20' : 'text-pink-400/30'}`} fill="currentColor" />
                <Sparkles className={`w-8 h-8 absolute top-0 right-1/3 ${darkMode ? 'text-purple-400/20' : 'text-purple-400/30'} animate-pulse`} />
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                No messages yet
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Start the conversation and share your day with {partner?.displayName || 'your partner'}! 💕
              </p>
            </div>
          </div>
        ) : (
          messageList
        )}
        
        <TypingIndicator userId={currentUser?.uid} channel={coupleId} darkMode={darkMode} />
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className={`absolute bottom-24 right-6 p-3 rounded-full shadow-lg transition-all hover:scale-110 z-10 ${
            darkMode 
              ? 'bg-gray-700 text-white hover:bg-gray-600' 
              : 'bg-white text-gray-700 hover:bg-gray-50'
          } border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="w-5 h-5" />
        </button>
      )}

      {/* Reply Preview */}
      {replyTo && (
        <div className={`px-4 py-3 border-t ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-start gap-3 max-w-4xl mx-auto">
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-pink-400' : 'text-pink-600'}`}>
                Replying to {replyTo.userId === currentUser?.uid ? 'yourself' : partner?.displayName}
              </p>
              <p className={`text-sm truncate ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {replyTo.text}
              </p>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className={`p-1 rounded-full transition-colors ${
                darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Image Upload */}
      {showImageUpload && (
        <div className={`px-4 py-3 border-t ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <div className="max-w-4xl mx-auto">
            <ImageUpload 
              onUpload={handleImageUpload} 
              onCancel={() => setShowImageUpload(false)} 
              darkMode={darkMode} 
            />
          </div>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className={`px-4 py-3 border-t ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex flex-wrap gap-2 justify-center max-w-4xl mx-auto">
            {quickEmojis.map(emoji => (
              <button
                key={emoji}
                onClick={() => insertEmoji(emoji)}
                className={`text-2xl p-2 rounded-lg transition-all hover:scale-125 ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Input Area */}
      <div className={`px-4 py-3 border-t backdrop-blur-lg ${
        darkMode 
          ? 'bg-gray-800/95 border-gray-700' 
          : 'bg-white/95 border-gray-200'
      } shadow-lg`}>
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <button
            onClick={() => setShowImageUpload(!showImageUpload)}
            className={`p-2.5 rounded-full transition-all hover:scale-110 ${
              showImageUpload 
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg' 
                : darkMode 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            aria-label="Attach image"
          >
            <Image className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2.5 rounded-full transition-all hover:scale-110 ${
              showEmojiPicker
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
                : darkMode 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            aria-label="Add emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={message}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${partner?.displayName || 'partner'}...`}
              rows="1"
              className={`w-full px-4 py-3 pr-12 rounded-3xl resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all ${
                darkMode 
                  ? 'bg-gray-700 text-white placeholder-gray-400' 
                  : 'bg-gray-100 text-gray-900 placeholder-gray-500'
              }`}
              style={{ 
                maxHeight: '120px',
                minHeight: '44px'
              }}
            />
          </div>

          <button
            onClick={() => sendMessage()}
            disabled={!message.trim() && !showImageUpload}
            className={`p-2.5 rounded-full transition-all ${
              message.trim()
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:scale-110 hover:shadow-lg shadow-md'
                : darkMode
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        <p className={`text-[10px] mt-2 text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default ChatRoom;