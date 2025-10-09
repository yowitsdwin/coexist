import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ref, 
  onValue, 
  push, 
  set, 
  update, 
  remove,
  onDisconnect,
  serverTimestamp
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
        set(userStatusRef, presenceData);

        // Set up disconnect handler
        onDisconnect(userStatusRef).set({
          online: false,
          lastSeen: serverTimestamp()
        });
      }
    });

    return () => {
      // Clean up on unmount
      set(userStatusRef, {
        online: false,
        lastSeen: serverTimestamp()
      });
      unsubscribe();
    };
  }, [userId]);
};

// Hook for batched writes
export const useBatchedWrites = (delay = 500) => {
  const [queue, setQueue] = useState([]);
  const [processing, setProcessing] = useState(false);

  const addToQueue = useCallback((operation) => {
    setQueue((prev) => [...prev, operation]);
  }, []);

  useEffect(() => {
    if (queue.length === 0 || processing) return;

    const timer = setTimeout(async () => {
      setProcessing(true);
      try {
        await Promise.all(queue.map(op => op()));
        setQueue([]);
      } catch (error) {
        console.error('Batch write error:', error);
      } finally {
        setProcessing(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [queue, processing, delay]);

  return { addToQueue, queueLength: queue.length };
};

// Hook for optimistic updates
export const useOptimisticUpdate = () => {
  const [pending, setPending] = useState(new Map());

  const performUpdate = useCallback(async (key, optimisticData, updateFn) => {
    // Store optimistic data
    setPending(prev => new Map(prev).set(key, optimisticData));

    try {
      await updateFn();
      // Remove from pending on success
      setPending(prev => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
    } catch (error) {
      // Revert on error
      setPending(prev => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
      throw error;
    }
  }, []);

  return { pending, performUpdate };
};

// Hook for typing indicators
export const useTypingIndicator = (userId, channel = 'chat') => {
  const [typingUsers, setTypingUsers] = useState({});

  useEffect(() => {
    if (!userId) return;

    const typingRef = ref(database, `typing/${channel}`);
    const unsubscribe = onValue(typingRef, (snapshot) => {
      const val = snapshot.val() || {};
      // Filter out current user
      const others = Object.entries(val)
        .filter(([uid]) => uid !== userId)
        .reduce((acc, [uid, data]) => ({ ...acc, [uid]: data }), {});
      setTypingUsers(others);
    });

    return () => unsubscribe();
  }, [userId, channel]);

  const setTyping = useCallback(async (isTyping) => {
    if (!userId) return;

    const typingRef = ref(database, `typing/${channel}/${userId}`);
    
    if (isTyping) {
      await set(typingRef, {
        timestamp: Date.now(),
        username: userId
      });
      onDisconnect(typingRef).remove();
    } else {
      await remove(typingRef);
    }
  }, [userId, channel]);

  const isAnyoneTyping = useMemo(() => {
    return Object.keys(typingUsers).length > 0;
  }, [typingUsers]);

  return { typingUsers, setTyping, isAnyoneTyping };
};

// Hook for message delivery/read status
export const useMessageStatus = (messageId, userId) => {
  useEffect(() => {
    if (!messageId || !userId) return;

    const statusRef = ref(database, `messages/${messageId}/status/${userId}`);
    
    // Mark as delivered when component mounts
    set(statusRef, {
      delivered: true,
      deliveredAt: serverTimestamp()
    });

    // Set up intersection observer to mark as read when visible
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            update(statusRef, {
              seen: true,
              seenAt: serverTimestamp()
            });
          }
        });
      },
      { threshold: 0.5 }
    );

    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
      observer.observe(messageElement);
    }

    return () => {
      observer.disconnect();
    };
  }, [messageId, userId]);
};

export default {
  useRealtimeData,
  usePresence,
  useBatchedWrites,
  useOptimisticUpdate,
  useTypingIndicator,
  useMessageStatus
};