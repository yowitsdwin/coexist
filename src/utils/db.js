import { openDB } from 'idb';

const DB_NAME = 'coexist-db';
const DB_VERSION = 1;

export const initDB = async () => {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create a 'store' for each type of data we want to cache
      if (!db.objectStoreNames.contains('messages')) {
        db.createObjectStore('messages');
      }
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos');
      }
      if (!db.objectStoreNames.contains('profiles')) {
        db.createObjectStore('profiles');
      }
    },
  });
  return db;
};