import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Smile, MoreVertical, Reply, Copy, Trash2, Check, CheckCheck } from 'lucide-react';
import { formatTime } from '../utils/helpers';
import { ref, set, remove } from 'firebase/database';
import { database } from '../firebase';

const ChatMessage = memo(({ 
  message, 
  isOwn, 
  userId, 
  darkMode,
  onReply,
  onDelete 
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);
  const reactionRef = useRef(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
      if (reactionRef.current && !reactionRef.current.contains(event.target)) {
        setShowReactions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setShowMenu(false);
    }, 1500);
  }, [message.text]);

  const reactionCounts = Object.values(message.reactions || {}).reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  const reactionEmojis = ['❤️', '😂', '😮', '😢', '😍', '👍'];

  return (
    <div 
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3 px-2 md:px-4 group`}
      data-message-id={message.id}
    >
      <div className="relative max-w-[75%] sm:max-w-[65%] md:max-w-md lg:max-w-lg">
        <div
          className={`rounded-2xl px-4 py-2.5 shadow-sm transition-all ${
            isOwn
              ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-br-md'
              : darkMode
              ? 'bg-gray-800 text-white rounded-bl-md border border-gray-700/50'
              : 'bg-white text-gray-800 rounded-bl-md border border-gray-200'
          }`}
        >
          {/* Message Image */}
          {message.imageData && (
            <div className="mb-2 -mx-1">
              <img 
                src={message.imageData} 
                alt="Shared" 
                className="rounded-xl max-w-full max-h-[300px] object-cover cursor-pointer hover:opacity-95 transition-opacity"
                loading="lazy"
                onClick={() => window.open(message.imageData, '_blank')}
              />
            </div>
          )}
          
          {/* Message Text */}
          {message.text && (
            <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">
              {message.text}
            </p>
          )}
          
          {/* Timestamp and Read Status */}
          <div className={`flex items-center gap-1.5 mt-1.5 ${
            isOwn ? 'justify-end' : 'justify-start'
          }`}>
            <p className={`text-[11px] ${
              isOwn 
                ? 'text-white/70' 
                : darkMode 
                ? 'text-gray-400' 
                : 'text-gray-500'
            }`}>
              {formatTime(message.timestamp)}
            </p>
            {isOwn && (
              message.read ? (
                <CheckCheck className="w-3.5 h-3.5 text-blue-300" />
              ) : (
                <Check className="w-3.5 h-3.5 text-white/70" />
              )
            )}
          </div>
        </div>

        {/* Reactions Display */}
        {Object.keys(reactionCounts).length > 0 && (
          <div className={`flex gap-1 mt-1.5 flex-wrap ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <button 
                key={emoji}
                className={`text-xs px-2.5 py-1 rounded-full transition-all hover:scale-110 ${
                  darkMode 
                    ? 'bg-gray-800 border border-gray-700' 
                    : 'bg-white border border-gray-200'
                } shadow-sm`}
                onClick={() => handleReaction(emoji)}
              >
                <span className="text-sm">{emoji}</span>
                {count > 1 && (
                  <span className={`ml-1 text-[10px] font-medium ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className={`absolute top-0 ${
          isOwn ? '-left-20' : '-right-20'
        } flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
          {/* Reaction Button */}
          <button
            onClick={() => setShowReactions(!showReactions)}
            className={`p-2 rounded-full transition-all hover:scale-110 ${
              darkMode 
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                : 'bg-white hover:bg-gray-50 text-gray-600'
            } shadow-md border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
            aria-label="Add reaction"
          >
            <Smile className="w-4 h-4" />
          </button>

          {/* More Options Button */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`p-2 rounded-full transition-all hover:scale-110 ${
              darkMode 
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                : 'bg-white hover:bg-gray-50 text-gray-600'
            } shadow-md border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
            aria-label="More options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Reaction Picker */}
        {showReactions && (
          <div 
            ref={reactionRef}
            className={`absolute ${isOwn ? 'right-0' : 'left-0'} ${
              Object.keys(reactionCounts).length > 0 ? 'bottom-full mb-2' : 'top-full mt-2'
            } flex gap-2 p-3 rounded-2xl shadow-xl border z-10 ${
              darkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}
          >
            {reactionEmojis.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className={`text-2xl hover:scale-125 transition-transform p-1 rounded-lg ${
                  message.reactions?.[userId] === emoji 
                    ? darkMode ? 'bg-gray-700' : 'bg-gray-100'
                    : ''
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Context Menu */}
        {showMenu && (
          <div 
            ref={menuRef}
            className={`absolute ${isOwn ? 'right-0' : 'left-0'} top-full mt-2 rounded-2xl shadow-xl border z-10 overflow-hidden min-w-[180px] ${
              darkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}
          >
            {onReply && (
              <button
                onClick={() => {
                  onReply(message);
                  setShowMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                  darkMode 
                    ? 'hover:bg-gray-700 text-gray-200' 
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <Reply className="w-4 h-4" />
                <span className="text-sm font-medium">Reply</span>
              </button>
            )}
            
            <button
              onClick={handleCopy}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                darkMode 
                  ? 'hover:bg-gray-700 text-gray-200' 
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <Copy className="w-4 h-4" />
              <span className="text-sm font-medium">
                {copied ? 'Copied!' : 'Copy'}
              </span>
            </button>

            {isOwn && onDelete && (
              <button
                onClick={() => {
                  onDelete(message.id);
                  setShowMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left border-t ${
                  darkMode 
                    ? 'hover:bg-red-900/20 text-red-400 border-gray-700' 
                    : 'hover:bg-red-50 text-red-600 border-gray-200'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-medium">Delete</span>
              </button>
            )}
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
    JSON.stringify(prevProps.message.reactions) === JSON.stringify(nextProps.message.reactions) &&
    prevProps.message.read === nextProps.message.read
  );
});

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;