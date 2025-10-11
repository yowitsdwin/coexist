import { useState, useEffect } from 'react';
import { useRealtimeQuery } from '../utils/useFirebase';
import { initDB } from '../utils/db';

export const useCachedRealtimeQuery = ({ storeName, cacheKey, path, options }) => {
  const [cachedData, setCachedData] = useState(null);
  
  // This is the original hook that fetches live data from Firebase
  const { data: liveData, loading: liveLoading, error } = useRealtimeQuery(path, options);

  useEffect(() => {
    let db;
    
    // This function runs when the component first mounts
    const loadFromCache = async () => {
      try {
        db = await initDB();
        const data = await db.get(storeName, cacheKey);
        if (data) {
          setCachedData(data); // Immediately show cached data
        }
      } catch (e) {
        console.error("Failed to load data from IndexedDB", e);
      }
    };

    loadFromCache();

  }, [storeName, cacheKey]); // Run only once on mount


  useEffect(() => {
    // This function runs whenever new data arrives from Firebase
    const updateCache = async () => {
      if (liveData && !liveLoading) {
        try {
          const db = await initDB();
          await db.put(storeName, liveData, cacheKey); // Save the fresh data to the cache
        } catch (e) {
          console.error("Failed to save data to IndexedDB", e);
        }
      }
    };

    updateCache();
  }, [liveData, liveLoading, storeName, cacheKey]);

  // The hook returns the live data if available, otherwise falls back to the cached data.
  // It returns the 'liveLoading' status, but the UI will already be populated with cachedData.
  return { data: liveData || cachedData, loading: liveLoading, error };
};