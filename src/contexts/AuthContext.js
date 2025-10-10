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
            ...userData
          });
        } catch (err) {
          console.error('Error fetching user data:', err);
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName
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

  // Update user profile
  const updateUserProfile = async (updates) => {
    try {
      setError(null);
      
      if (!currentUser) throw new Error('No user logged in');

      // Update in Firebase Auth if displayName is changing
      if (updates.displayName && auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: updates.displayName
        });
      }

      // Update in Realtime Database
      const userRef = ref(database, `users/${currentUser.uid}`);
      const existingData = (await get(userRef)).val() || {};
      
      await set(userRef, {
        ...existingData,
        ...updates,
        updatedAt: serverTimestamp()
      });

      // Update local state
      setCurrentUser(prev => ({ ...prev, ...updates }));
    } catch (err) {
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