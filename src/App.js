import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Heart, Moon, Sun, Smile, LogOut, 
  Camera, Menu, X, MessageCircle 
} from 'lucide-react';
import { auth, database, storage } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { 
  ref, 
  push, 
  onValue, 
  set,
  update,
  get,
  onDisconnect,
  serverTimestamp
} from 'firebase/database';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';

// Hooks
import { usePresence, useTypingIndicator, useRealtimeData } from './hooks/useFirebase';

// Utilities
import { 
  sanitizeInput, 
  compressImage, 
  handleFirebaseError,
  formatTime,
  getGenderColor
} from './utils/helpers';

// Components
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider, useToast } from './components/Toast';
import { LoadingScreen, LoadingSpinner, MessageSkeleton } from './components/Loading';

// Lazy load heavy components
const CoupleCanvas = lazy(() => import('./components/CoupleCanvas'));
const DailyPhotos = lazy(() => import('./components/DailyPhotos'));
const SharedJournal = lazy(() => import('./components/SharedJournal'));
const CoupleProfile = lazy(() => import('./components/CoupleProfile'));

// ============================================
// AUTH HELPER FUNCTIONS (Optimized)
// ============================================

const signUpWithEmail = async (email, password, username) => {
  const sanitizedUsername = sanitizeInput(username, 50);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const user = cred.user;
  
  await updateProfile(user, { displayName: sanitizedUsername });
  
  await set(ref(database, `users/${user.uid}`), {
    uid: user.uid,
    email,
    username: sanitizedUsername,
    photoURL: null,
    createdAt: serverTimestamp()
  });
  
  return user;
};

const signInWithEmail = async (email, password) => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const user = cred.user;
  const snap = await get(ref(database, `users/${user.uid}`));
  const profile = snap.exists() 
    ? snap.val() 
    : { 
        username: user.displayName || user.email.split('@')[0], 
        email: user.email, 
        photoURL: user.photoURL || null 
      };
  return { user, profile };
};

const signOutUser = async (userId) => {
  // Clean up presence before signing out
  if (userId) {
    await set(ref(database, `presence/${userId}`), {
      online: false,
      lastSeen: serverTimestamp()
    });
  }
  await signOut(auth);
};

// ============================================
// AUTH STATE MANAGEMENT
// ============================================

const useAuthState = () => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        const snap = await get(ref(database, `users/${authUser.uid}`));
        const profile = snap.exists() ? snap.val() : null;
        setUser(authUser);
        setUserProfile(profile);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, userProfile, setUserProfile, loading };
};

// ============================================
// SMALL REUSABLE COMPONENTS
// ============================================

const EmojiPicker = React.memo(({ onSelect, onClose, darkMode }) => {
  const emojis = ['❤️', '😊', '😂', '🥰', '😘', '🤗', '👍', '🎉', '✨', '🌟', '💕', '💖'];
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`absolute bottom-full mb-2 ${
        darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
      } rounded-lg shadow-xl p-3 grid grid-cols-6 gap-2 z-50`}
    >
      {emojis.map((emoji, i) => (
        <button 
          key={i} 
          onClick={() => { 
            onSelect(emoji); 
            onClose(); 
          }}
          className={`text-2xl ${
            darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
          } rounded p-1 transition-all hover:scale-110`}
          aria-label={`Select emoji ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </motion.div>
  );
});

const ProfileModal = React.memo(({ user, onClose, currentPhotoURL, onPhotoUpdate, darkMode }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const toast = useToast();

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const compressed = await compressImage(file);
      await onPhotoUpdate(compressed);
      toast.success('Profile picture updated!');
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className={`${
          darkMode ? 'bg-gray-800 text-white' : 'bg-white'
        } rounded-2xl p-6 max-w-md w-full`}
      >
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          Profile Picture
        </h2>
        <div className="flex flex-col items-center gap-4">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center overflow-hidden ring-4 ring-pink-200">
            {currentPhotoURL ? (
              <img src={currentPhotoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl text-white">{user.email[0].toUpperCase()}</span>
            )}
          </div>
          <input 
            ref={fileInputRef} 
            type="file" 
            accept="image/*" 
            onChange={handleFileSelect} 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={uploading}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 transition-all hover:scale-105"
          >
            {uploading ? (
              <>
                <LoadingSpinner size="sm" className="text-white" />
                Uploading...
              </>
            ) : (
              <>
                <Camera className="w-5 h-5" />
                Change Picture
              </>
            )}
          </button>
          <button 
            onClick={onClose} 
            className={`${
              darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'
            } transition-colors`}
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
});

// Export for use in other files
export { signUpWithEmail, signInWithEmail, signOutUser };

// Continuing from Part 1...

// ============================================
// MAIN APP COMPONENT
// ============================================

function AppContent() {
  const { user, userProfile, setUserProfile, loading: authLoading } = useAuthState();
  const toast = useToast();
  
  // State management
  const [inputText, setInputText] = useState('');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading2, setAuthLoading2] = useState(false);
  
  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Custom hooks
  usePresence(user?.uid);
  const { typingUsers, setTyping, isAnyoneTyping } = useTypingIndicator(user?.uid, 'chat');
  
  // Fetch messages with optimized transform
  const messagesTransform = useCallback((val) => {
    if (!val) return [];
    const messagesArray = Object.entries(val).map(([id, msg]) => ({ id, ...msg }));
    messagesArray.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    return messagesArray;
  }, []);
  
  const { data: messages, loading: messagesLoading } = useRealtimeData(
    user ? 'messages' : null,
    messagesTransform
  );

  // Persist dark mode
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAnyoneTyping]);

  // ============================================
  // AUTH HANDLERS
  // ============================================

  const handleAuth = useCallback(async () => {
    setAuthError('');
    setAuthLoading2(true);
    
    try {
      if (isSignUp) {
        if (!username.trim()) {
          throw new Error('Please enter a username');
        }
        await signUpWithEmail(email, password, username);
        toast.success('Account created successfully!');
      } else {
        await signInWithEmail(email, password);
        toast.success('Welcome back!');
      }
    } catch (error) {
      const errorMessage = handleFirebaseError(error);
      setAuthError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setAuthLoading2(false);
    }
  }, [isSignUp, email, password, username, toast]);

  const handleLogout = useCallback(async () => {
    try {
      await signOutUser(user?.uid);
      toast.info('Logged out successfully');
    } catch (error) {
      toast.error('Failed to logout');
    }
  }, [user, toast]);

  // ============================================
  // MESSAGE HANDLERS
  // ============================================

  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setInputText(value);
    
    if (value.trim()) {
      setTyping(true);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, 1000);
    } else {
      setTyping(false);
    }
  }, [setTyping]);

  const handleSendMessage = useCallback(async () => {
    const sanitizedText = sanitizeInput(inputText);
    if (!sanitizedText || !user) return;

    setTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const newMessage = {
      text: sanitizedText,
      sender: userProfile?.username || user.email.split('@')[0],
      userId: user.uid,
      timestamp: serverTimestamp(),
      type: 'text',
      reactions: {}
    };
    
    // Optimistic update
    setInputText('');
    
    try {
      await push(ref(database, 'messages'), newMessage);
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setInputText(sanitizedText); // Restore text on error
    }
  }, [inputText, user, userProfile, setTyping, toast]);

  const sendHeartbeat = useCallback(async () => {
    if (!user) return;
    
    const newMessage = {
      text: '💗',
      sender: userProfile?.username || user.email.split('@')[0],
      userId: user.uid,
      timestamp: serverTimestamp(),
      type: 'heartbeat',
      reactions: {}
    };
    
    try {
      await push(ref(database, 'messages'), newMessage);
      toast.success('Heartbeat sent!', 1000);
    } catch (error) {
      console.error('Error sending heartbeat:', error);
      toast.error('Failed to send heartbeat');
    }
  }, [user, userProfile, toast]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!user) {
        handleAuth();
      } else {
        handleSendMessage();
      }
    }
  }, [user, handleAuth, handleSendMessage]);

  // ============================================
  // PROFILE HANDLERS
  // ============================================

  const handlePhotoUpdate = useCallback(async (photoDataUrl) => {
    try {
      const path = `profilePhotos/${user.uid}/${Date.now()}.jpg`;
      const sRef = storageRef(storage, path);
      await uploadString(sRef, photoDataUrl, 'data_url');
      const downloadUrl = await getDownloadURL(sRef);
      
      const updatedProfile = { ...userProfile, photoURL: downloadUrl };
      setUserProfile(updatedProfile);
      
      await set(ref(database, `users/${user.uid}/photoURL`), downloadUrl);
      
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: downloadUrl });
      }
      
      toast.success('Profile picture updated!');
    } catch (error) {
      console.error('Error updating photo:', error);
      toast.error('Failed to update profile picture');
    }
  }, [user, userProfile, setUserProfile, toast]);

  const handleProfileUpdate = useCallback(async (updatedData) => {
    const sanitizedData = {
      ...updatedData,
      fullName: sanitizeInput(updatedData.fullName, 100),
      interests: sanitizeInput(updatedData.interests, 500)
    };
    
    const merged = { ...userProfile, ...sanitizedData };
    setUserProfile(merged);
    
    try {
      await update(ref(database, `users/${user.uid}`), sanitizedData);
      
      if (sanitizedData.username && auth.currentUser) {
        await updateProfile(auth.currentUser, { 
          displayName: sanitizeInput(sanitizedData.username, 50) 
        });
      }
      
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  }, [user, userProfile, setUserProfile, toast]);

  // ============================================
  // RENDER: LOADING STATE
  // ============================================

  if (authLoading) {
    return <LoadingScreen darkMode={darkMode} />;
  }

  // ============================================
  // RENDER: AUTH SCREEN
  // ============================================

  if (!user) {
    return (
      <div className={`min-h-screen ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900' 
          : 'bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100'
      } flex items-center justify-center p-4`}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${
            darkMode ? 'bg-gray-800' : 'bg-white'
          } rounded-3xl shadow-2xl p-8 max-w-md w-full`}
        >
          <div className="text-center mb-8">
            <motion.div 
              className="flex justify-center mb-4"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Heart className="w-20 h-20 text-pink-500" />
            </motion.div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              Couple Chat
            </h1>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Connect with your loved one ❤️
            </p>
          </div>

          <AnimatePresence mode="wait">
            {authError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm"
                role="alert"
              >
                {authError}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={(e) => { e.preventDefault(); handleAuth(); }} className="space-y-4">
            <AnimatePresence mode="wait">
              {isSignUp && (
                <motion.input
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`w-full px-4 py-3 border-2 ${
                    darkMode 
                      ? 'bg-gray-700 text-white border-gray-600' 
                      : 'border-gray-300'
                  } rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all`}
                  aria-label="Username"
                  required={isSignUp}
                />
              )}
            </AnimatePresence>
            
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 border-2 ${
                darkMode 
                  ? 'bg-gray-700 text-white border-gray-600' 
                  : 'border-gray-300'
              } rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all`}
              aria-label="Email"
              required
            />
            
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              className={`w-full px-4 py-3 border-2 ${
                darkMode 
                  ? 'bg-gray-700 text-white border-gray-600' 
                  : 'border-gray-300'
              } rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all`}
              aria-label="Password"
              required
              minLength={6}
            />
            
            <button
              type="submit"
              disabled={authLoading2}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 transition-all font-semibold text-lg hover:scale-105"
            >
              {authLoading2 ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="sm" className="text-white" />
                  {isSignUp ? 'Creating Account...' : 'Signing In...'}
                </span>
              ) : (
                isSignUp ? 'Sign Up' : 'Sign In'
              )}
            </button>
            
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setAuthError('');
              }}
              className={`w-full ${
                darkMode ? 'text-pink-400 hover:text-pink-300' : 'text-pink-500 hover:text-pink-600'
              } transition-colors`}
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // ============================================
  // RENDER: MAIN APP UI
  // ============================================

  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'canvas', label: 'Canvas', icon: () => <span>🎨</span> },
    { id: 'photos', label: 'Photos', icon: Camera },
    { id: 'journal', label: 'Journal', icon: () => <span>📖</span> },
    { id: 'profile', label: 'Profile', icon: () => <span>👤</span> }
  ];

  return (
    <div className={`flex flex-col h-screen ${
      darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-pink-50 to-purple-50'
    }`}>
      {/* Fixed Header */}
      <header className={`${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } shadow-lg border-b fixed top-0 left-0 right-0 z-40`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className={`md:hidden p-2 rounded-lg ${
                  darkMode ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-100'
                } transition-all`}
                aria-label="Toggle menu"
              >
                {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <Heart className="w-8 h-8 text-pink-500 animate-pulse" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                Couple Chat
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg ${
                  darkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-100 text-gray-700'
                } hover:scale-110 transition-all`}
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              <button
                onClick={() => setShowProfileModal(true)}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center overflow-hidden ring-2 ring-pink-200 hover:scale-110 transition-all"
                aria-label="Open profile"
              >
                {userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold">{user.email[0].toUpperCase()}</span>
                )}
              </button>
              
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all hover:scale-110"
                aria-label="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2 mt-4" role="navigation">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white scale-105'
                      : darkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                  {typeof Icon === 'function' ? <Icon className="w-5 h-5" /> : <Icon />}
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Mobile Navigation */}
          <AnimatePresence>
            {showMobileMenu && (
              <motion.nav 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="md:hidden flex flex-col gap-2 mt-4 overflow-hidden"
                role="navigation"
              >
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setShowMobileMenu(false);
                      }}
                      className={`flex items-center gap-3 px-6 py-3 rounded-lg transition-all ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                          : darkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {typeof Icon === 'function' ? <Icon className="w-5 h-5" /> : <Icon />}
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </motion.nav>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Content */}
      <main 
        className="flex-1 overflow-hidden" 
        style={{ marginTop: showMobileMenu ? '280px' : '140px' }}
      >
        <Suspense fallback={<LoadingScreen darkMode={darkMode} message="Loading..." />}>
          {activeTab === 'chat' && (
            <ChatView
              messages={messages}
              messagesLoading={messagesLoading}
              user={user}
              userProfile={userProfile}
              darkMode={darkMode}
              inputText={inputText}
              inputRef={inputRef}
              showEmojiPicker={showEmojiPicker}
              isAnyoneTyping={isAnyoneTyping}
              messagesEndRef={messagesEndRef}
              handleInputChange={handleInputChange}
              handleSendMessage={handleSendMessage}
              sendHeartbeat={sendHeartbeat}
              handleKeyPress={handleKeyPress}
              setShowEmojiPicker={setShowEmojiPicker}
              setInputText={setInputText}
            />
          )}
          {activeTab === 'canvas' && <CoupleCanvas user={user} darkMode={darkMode} />}
          {activeTab === 'photos' && <DailyPhotos user={user} darkMode={darkMode} />}
          {activeTab === 'journal' && <SharedJournal user={user} darkMode={darkMode} />}
          {activeTab === 'profile' && (
            <CoupleProfile 
              user={user} 
              userProfile={userProfile} 
              onProfileUpdate={handleProfileUpdate}
              darkMode={darkMode}
            />
          )}
        </Suspense>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showProfileModal && (
          <ProfileModal
            user={user}
            onClose={() => setShowProfileModal(false)}
            currentPhotoURL={userProfile?.photoURL}
            onPhotoUpdate={handlePhotoUpdate}
            darkMode={darkMode}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// CHAT VIEW COMPONENT
// ============================================

const ChatView = React.memo(({
  messages,
  messagesLoading,
  user,
  userProfile,
  darkMode,
  inputText,
  inputRef,
  showEmojiPicker,
  isAnyoneTyping,
  messagesEndRef,
  handleInputChange,
  handleSendMessage,
  sendHeartbeat,
  handleKeyPress,
  setShowEmojiPicker,
  setInputText
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className={`flex-1 overflow-y-auto p-4 ${
        darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-pink-50 to-purple-50'
      }`}>
        <div className="max-w-4xl mx-auto space-y-4">
          {messagesLoading ? (
            <>
              <MessageSkeleton darkMode={darkMode} isOwn={false} />
              <MessageSkeleton darkMode={darkMode} isOwn={true} />
              <MessageSkeleton darkMode={darkMode} isOwn={false} />
            </>
          ) : messages && messages.length > 0 ? (
            messages.map((msg) => {
              const isOwn = msg.userId === user?.uid;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  data-message-id={msg.id}
                >
                  <div
                    className={`max-w-xs md:max-w-md rounded-2xl px-5 py-3 shadow-lg transform transition-all hover:scale-105 ${
                      msg.type === 'heartbeat'
                        ? 'bg-gradient-to-r from-red-400 to-pink-400 text-6xl'
                        : isOwn
                        ? darkMode
                          ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                          : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                        : darkMode
                        ? 'bg-gray-700 text-white'
                        : 'bg-white text-gray-800'
                    }`}
                  >
                    {msg.type !== 'heartbeat' && (
                      <div className={`text-xs font-semibold mb-1 ${
                        isOwn ? 'text-pink-100' : darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {msg.sender}
                      </div>
                    )}
                    <div className={msg.type === 'heartbeat' ? 'text-center animate-pulse' : ''}>
                      {msg.text}
                    </div>
                    <div className={`flex items-center justify-between mt-2 gap-2 text-xs ${
                      isOwn ? 'text-pink-100' : darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      <span>{formatTime(msg.timestamp)}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-center py-16">
              <Heart className="w-20 h-20 mx-auto mb-4 text-pink-300" />
              <p className={`${darkMode ? 'text-gray-500' : 'text-gray-400'} text-lg`}>
                Start your conversation...
              </p>
            </div>
          )}
          
          {isAnyoneTyping && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className={`rounded-2xl px-5 py-3 ${
                darkMode ? 'bg-gray-700' : 'bg-white'
              } shadow-lg`}>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Chat Input */}
      <div className={`p-4 ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } border-t fixed bottom-0 left-0 right-0 z-30`}>
        <div className="max-w-4xl mx-auto flex gap-2 items-center">
          <button
            onClick={sendHeartbeat}
            className="p-3 rounded-full bg-gradient-to-r from-red-400 to-pink-400 text-white hover:from-red-500 hover:to-pink-500 transition-all hover:scale-110"
            aria-label="Send heartbeat"
          >
            <Heart className="w-6 h-6" />
          </button>
          
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className={`w-full px-5 py-3 rounded-full pr-12 ${
                darkMode
                  ? 'bg-gray-700 text-white border-gray-600'
                  : 'bg-gray-100 text-gray-800 border-gray-300'
              } border-2 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all`}
              aria-label="Message input"
            />
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
              } transition-colors`}
              aria-label="Open emoji picker"
            >
              <Smile className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {showEmojiPicker && (
                <EmojiPicker
                  onSelect={(emoji) => setInputText(inputText + emoji)}
                  onClose={() => setShowEmojiPicker(false)}
                  darkMode={darkMode}
                />
              )}
            </AnimatePresence>
          </div>
          
          <button
            onClick={handleSendMessage}
            className="p-3 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 transition-all hover:scale-110"
            aria-label="Send message"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
});

// ============================================
// EXPORT WITH PROVIDERS
// ============================================

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;