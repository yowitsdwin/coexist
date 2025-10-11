// File: contexts/AuthContext.js

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { ref, set, get, serverTimestamp } from 'firebase/database';
import { auth, database } from '../firebase';
import { usePresence } from '../utils/useFirebase';
import { handleFirebaseError } from '../utils/helpers';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Setup presence for current user
  usePresence(currentUser?.uid);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch additional user data from Realtime Database
        try {
          const userRef = ref(database, `users/${user.uid}`);
          const snapshot = await get(userRef);
          const userData = snapshot.val();
          
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL, // IMPORTANT: Include photoURL from auth
            ...userData,
            // Add getIdToken method to currentUser object
            getIdToken: () => user.getIdToken()
          });
        } catch (err) {
          console.error('Error fetching user data:', err);
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            getIdToken: () => user.getIdToken()
          });
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Sign up
  const signup = async (email, password, displayName, additionalData = {}) => {
    try {
      setError(null);
      
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name
      await updateProfile(user, { displayName });

      // Store user data in Realtime Database
      const userRef = ref(database, `users/${user.uid}`);
      await set(userRef, {
        email,
        displayName,
        createdAt: serverTimestamp(),
        ...additionalData
      });

      return user;
    } catch (err) {
      const errorMessage = handleFirebaseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Sign in
  const signin = async (email, password) => {
    try {
      setError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (err) {
      const errorMessage = handleFirebaseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Sign out
  const logout = async () => {
    try {
      setError(null);
      
      // Update presence before logging out
      if (currentUser) {
        const userStatusRef = ref(database, `presence/${currentUser.uid}`);
        await set(userStatusRef, {
          online: false,
          lastSeen: serverTimestamp()
        });
      }
      
      await signOut(auth);
    } catch (err) {
      const errorMessage = handleFirebaseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Update user profile - FIXED VERSION
  const updateUserProfile = async (updates) => {
    try {
      setError(null);
      if (!currentUser || !auth.currentUser) {
        throw new Error('No user is currently logged in.');
      }

      console.log('Updating profile with:', updates);

      // 1. Prepare updates for Firebase Auth profile
      const authProfileUpdates = {};
      if (updates.displayName !== undefined) {
        authProfileUpdates.displayName = updates.displayName;
      }
      if (updates.photoURL !== undefined) {
        authProfileUpdates.photoURL = updates.photoURL;
      }

      // 2. Update Firebase Auth profile if there are changes
      if (Object.keys(authProfileUpdates).length > 0) {
        await updateProfile(auth.currentUser, authProfileUpdates);
        console.log('Firebase Auth profile updated successfully');
      }

      // 3. Update Realtime Database
      const userRef = ref(database, `users/${currentUser.uid}`);
      const snapshot = await get(userRef);
      const existingData = snapshot.val() || {};
      
      const dbUpdates = {
        ...existingData,
        ...updates,
        updatedAt: serverTimestamp()
      };

      await set(userRef, dbUpdates);
      console.log('Realtime Database updated successfully');

      // 4. Force refresh the auth state to get updated photoURL
      await auth.currentUser.reload();

      // 5. Update local state with fresh data from auth
      setCurrentUser(prev => ({
        ...prev,
        ...updates,
        displayName: auth.currentUser.displayName || prev.displayName,
        photoURL: auth.currentUser.photoURL || updates.photoURL,
      }));

      console.log('Profile update completed successfully');
      return true;

    } catch (err) {
      console.error("Failed to update user profile:", err);
      const errorMessage = handleFirebaseError(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const value = {
    currentUser,
    loading,
    error,
    signup,
    signin,
    logout,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;