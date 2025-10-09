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