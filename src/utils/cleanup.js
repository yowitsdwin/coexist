import { ref, get, remove } from 'firebase/database';
import { database } from '../firebase';

export const cleanupOldPhotos = async () => {
  try {
    const photosRef = ref(database, 'dailyPhotos');
    const snapshot = await get(photosRef);
    if (!snapshot.exists()) return;

    const photos = snapshot.val();
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

    const deletions = [];
    for (const [key, photo] of Object.entries(photos)) {
      if (photo && photo.timestamp && photo.timestamp < oneDayAgo) {
        deletions.push(remove(ref(database, `dailyPhotos/${key}`)));
      }
    }

    if (deletions.length) await Promise.all(deletions);
  } catch (err) {
    // don't crash the app if cleanup fails
    // eslint-disable-next-line no-console
    console.warn('cleanupOldPhotos error:', err);
  }
};

// Run cleanup on app load. Returns interval id so caller can clear it if needed.
export const initCleanup = () => {
  // run once now
  cleanupOldPhotos().catch((e) => console.warn(e));
  // Run every hour
  const id = setInterval(() => cleanupOldPhotos().catch((e) => console.warn(e)), 60 * 60 * 1000);
  return id;
};