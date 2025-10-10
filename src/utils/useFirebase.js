// File: utils/useFirebase.js

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  ref, 
  onValue, 
  push, 
  set, 
  update, 
  remove,
  onDisconnect,
  serverTimestamp,
  query,
  orderByChild,
  limitToLast,
  off
} from 'firebase/database';
import { database } from '../firebase';

// Hook for real-time data with automatic cleanup
export const useRealtimeData = (path, transform = (val) => val) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const dataRef = ref(database, path);
    
    const unsubscribe = onValue(
      dataRef,
      (snapshot) => {
        try {
          const val = snapshot.val();
          setData(transform(val));
          setError(null);
        } catch (err) {
          setError(err);
          console.error(`Error transforming data from ${path}:`, err);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError(err);
        setLoading(false);
        console.error(`Error subscribing to ${path}:`, err);
      }
    );

    return () => unsubscribe();
  }, [path, transform]);

  return { data, loading, error };
};

// Optimized hook with query support
export const useRealtimeQuery = (path, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { 
    orderBy, 
    limit, 
    transform = (val) => val,
    enabled = true 
  } = options;

  useEffect(() => {
    if (!path || !enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let dataRef = ref(database, path);
    
    // Apply query constraints
    if (orderBy && limit) {
      dataRef = query(dataRef, orderByChild(orderBy), limitToLast(limit));
    } else if (orderBy) {
      dataRef = query(dataRef, orderByChild(orderBy));
    } else if (limit) {
      dataRef = query(dataRef, limitToLast(limit));
    }
    
    const unsubscribe = onValue(
      dataRef,
      (snapshot) => {
        try {
          const val = snapshot.val();
          setData(transform(val));
          setError(null);
        } catch (err) {
          setError(err);
          console.error(`Error transforming data from ${path}:`, err);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError(err);
        setLoading(false);
        console.error(`Error subscribing to ${path}:`, err);
      }
    );

    return () => {
      off(dataRef);
      unsubscribe();
    };
  }, [path, orderBy, limit, transform, enabled]);

  return { data, loading, error };
};

// Hook for presence management
export const usePresence = (userId) => {
  useEffect(() => {
    if (!userId) return;

    const userStatusRef = ref(database, `presence/${userId}`);
    const connectedRef = ref(database, '.info/connected');

    const unsubscribe = onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === true) {
        // User is online
        const presenceData = {
          online: true,
          lastSeen: serverTimestamp()
        };

        // Set user as online
        set(userStatusRef, presenceData).catch(err => {
          console.error('Error setting presence:', err);
        });

        // Set up disconnect handler
        onDisconnect(userStatusRef).set({
          online: false,
          lastSeen: serverTimestamp()
        }).catch(err => {
          console.error('Error setting onDisconnect:', err);
        });
      }
    });

    return () => {
      // Clean up on unmount
      set(userStatusRef, {
        online: false,
        lastSeen: serverTimestamp()
      }).catch(err => {
        console.error('Error cleaning up presence:', err);
      });
      unsubscribe();
    };
  }, [userId]);
};

// Connection state hook
export const useConnectionState = () => {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const connectedRef = ref(database, '.info/connected');
    
    const unsubscribe = onValue(connectedRef, (snapshot) => {
      setIsConnected(snapshot.val() === true);
    });

    return () => unsubscribe();
  }, []);

  return isConnected;
};

// Hook for typing indicators
export const useTypingIndicator = (userId, channel = 'chat') => {
  const [typingUsers, setTypingUsers] = useState({});

  useEffect(() => {
    if (!userId || !channel) return;

    const typingRef = ref(database, `typing/${channel}`);
    const unsubscribe = onValue(typingRef, (snapshot) => {
      const val = snapshot.val() || {};
      // Filter out current user
      const others = Object.entries(val)
        .filter(([uid]) => uid !== userId)
        .reduce((acc, [uid, data]) => ({ ...acc, [uid]: data }), {});
      setTypingUsers(others);
    }, (error) => {
      console.error('Error listening to typing indicator:', error);
    });

    return () => unsubscribe();
  }, [userId, channel]);

  const setTyping = useCallback(async (isTyping) => {
    if (!userId || !channel) return;

    const typingRef = ref(database, `typing/${channel}/${userId}`);
    
    try {
      if (isTyping) {
        await set(typingRef, {
          timestamp: Date.now(),
          username: userId
        });
        onDisconnect(typingRef).remove();
      } else {
        await remove(typingRef);
      }
    } catch (error) {
      console.error('Error setting typing status:', error);
    }
  }, [userId, channel]);

  const isAnyoneTyping = useMemo(() => {
    return Object.keys(typingUsers).length > 0;
  }, [typingUsers]);

  return { typingUsers, setTyping, isAnyoneTyping };
};

// Debounced write hook
export const useDebouncedWrite = (delay = 500) => {
  const timeoutRef = useRef(null);
  const pendingWrites = useRef(new Map());

  const debouncedWrite = useCallback((path, data) => {
    pendingWrites.current.set(path, data);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      const writes = Array.from(pendingWrites.current.entries());
      pendingWrites.current.clear();

      try {
        await Promise.all(
          writes.map(([writePath, writeData]) => 
            set(ref(database, writePath), writeData)
          )
        );
      } catch (error) {
        console.error('Debounced write error:', error);
      }
    }, delay);
  }, [delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedWrite;
};

export default {
  useRealtimeData,
  useRealtimeQuery,
  usePresence,
  useConnectionState,
  useTypingIndicator,
  useDebouncedWrite
};