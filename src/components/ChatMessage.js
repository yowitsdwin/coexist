import React, { memo, useState, useCallback } from 'react';
import { Heart, Smile, ThumbsUp } from 'lucide-react';
import { formatTime } from '../utils/helpers';
import { ref, set, remove } from 'firebase/database';
import { database } from '../firebase';

const ChatMessage = memo(({ 
  message, 
  isOwn, 
  userId, 
  darkMode 
}) => {
  const [showReactions, setShowReactions] = useState(false);

  const handleReaction = useCallback(async (emoji) => {
    const reactionRef = ref(database, `reactions/${message.id}/${userId}`);
    
    try {
      if (message.reactions?.[userId] === emoji) {
        await remove(reactionRef);
      } else {
        await set(reactionRef, {
          emoji,
          timestamp: Date.now()
        });
      }
      setShowReactions(false);
    } catch (error) {
      console.error('Reaction error:', error);
    }
  }, [message.id, message.reactions, userId]);

  const reactionCounts = Object.values(message.reactions || {}).reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  return (
    <div 
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 group`}
      data-message-id={message.id}
    >
      <div className="relative max-w-xs md:max-w-md">
        <div
          className={`rounded-2xl px-4 py-3 ${
            isOwn
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
              : darkMode
              ? 'bg-gray-700 text-white'
              : 'bg-gray-200 text-gray-800'
          } shadow-md`}
        >
          {message.imageData && (
            <img 
              src={message.imageData} 
              alt="Shared" 
              className="rounded-lg mb-2 max-w-full"
              loading="lazy"
            />
          )}
          <p className="text-sm break-words">{message.text}</p>
          <p className={`text-xs mt-1 ${isOwn ? 'text-white/70' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {formatTime(message.timestamp)}
          </p>
        </div>

        {/* Reactions */}
        {Object.keys(reactionCounts).length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <span 
                key={emoji}
                className={`text-xs px-2 py-1 rounded-full ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-100'
                } cursor-pointer hover:scale-110 transition-transform`}
                onClick={() => handleReaction(emoji)}
              >
                {emoji} {count}
              </span>
            ))}
          </div>
        )}

        {/* Reaction picker */}
        <button
          onClick={() => setShowReactions(!showReactions)}
          className="absolute -bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-gray-500 rounded-full text-white hover:bg-gray-600"
        >
          <Smile className="w-3 h-3" />
        </button>

        {showReactions && (
          <div className={`absolute bottom-full right-0 mb-2 flex gap-2 p-2 rounded-lg shadow-lg ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            {['❤️', '👍', '😂', '😮', '😢'].map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="text-2xl hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.text === nextProps.message.text &&
    prevProps.isOwn === nextProps.isOwn &&
    prevProps.darkMode === nextProps.darkMode &&
    JSON.stringify(prevProps.message.reactions) === JSON.stringify(nextProps.message.reactions)
  );
});

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;