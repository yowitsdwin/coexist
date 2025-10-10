import { useState, useEffect } from 'react';
import { useCouple } from '../contexts/CoupleContext';
import { database } from '../firebase';
import { ref, query, orderByChild, startAt, get } from 'firebase/database';

export const useTodayStats = () => {
  const { coupleId } = useCouple();
  const [stats, setStats] = useState({
    messageCount: 0,
    photoCount: 0,
    strokeCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!coupleId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      // Get the timestamp for 24 hours ago
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

      try {
        // --- Query for Messages ---
        const messagesRef = ref(database, `messages/${coupleId}`);
        const messagesQuery = query(messagesRef, orderByChild('timestamp'), startAt(oneDayAgo));
        const messagesSnapshot = await get(messagesQuery);
        const messageCount = messagesSnapshot.exists() ? Object.keys(messagesSnapshot.val()).length : 0;

        // --- Query for Photos ---
        const photosRef = ref(database, `dailyPhotos/${coupleId}`);
        const photosQuery = query(photosRef, orderByChild('timestamp'), startAt(oneDayAgo));
        const photosSnapshot = await get(photosQuery);
        const photoCount = photosSnapshot.exists() ? Object.keys(photosSnapshot.val()).length : 0;

        // --- Query for Canvas Strokes ---
        const strokesRef = ref(database, `canvasStrokes/${coupleId}`);
        const strokesQuery = query(strokesRef, orderByChild('timestamp'), startAt(oneDayAgo));
        const strokesSnapshot = await get(strokesQuery);
        const strokeCount = strokesSnapshot.exists() ? Object.keys(strokesSnapshot.val()).length : 0;

        setStats({ messageCount, photoCount, strokeCount });

      } catch (error) {
        console.error("Failed to fetch today's stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [coupleId]);

  return { stats, loading };
};