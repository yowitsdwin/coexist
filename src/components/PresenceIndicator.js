import React from 'react';
import { usePresence } from '../utils/useFirebase';
import { useRealtimeQuery } from '../utils/useFirebase';
import { formatRelativeTime } from '../utils/helpers';

export const PresenceIndicator = ({ partnerId, darkMode }) => {
  const { data: partnerPresence } = useRealtimeQuery(`presence/${partnerId}`);

  if (!partnerPresence) {
    return null;
  }

  const isOnline = partnerPresence.online;
  const lastSeen = partnerPresence.lastSeen;

  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'} ${isOnline ? 'animate-pulse' : ''}`} />
      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {isOnline ? 'Online' : `Last seen ${formatRelativeTime(lastSeen)}`}
      </span>
    </div>
  );
};

export default PresenceIndicator;