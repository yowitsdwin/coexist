import React, { lazy, Suspense, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './utils/Toast';
import { LoadingScreen } from './components/Loading';
import { usePresence, useConnectionState } from './utils/useFirebase';
import { initCleanup } from './utils/cleanup';

// Lazy load heavy components
const CoupleCanvas = lazy(() => import('./components/OptimizedCanvas'));
const DailyPhotos = lazy(() => import('./components/DailyPhotos'));
const ChatRoom = lazy(() => import('./components/ChatRoom'));

function App() {
  const currentUserId = 'user1'; // Replace with actual auth
  const isConnected = useConnectionState();
  
  // Setup presence tracking
  usePresence(currentUserId);

  // Initialize cleanup on mount
  useEffect(() => {
    const cleanupId = initCleanup();
    return () => clearInterval(cleanupId);
  }, []);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
          {/* Connection indicator */}
          {!isConnected && (
            <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center py-2 z-50">
              Reconnecting...
            </div>
          )}

          <Suspense fallback={<LoadingScreen message="Loading app..." />}>
            <div className="container mx-auto p-4">
              {/* Your app content here */}
              <ChatRoom userId={currentUserId} />
              <CoupleCanvas coupleId="couple1" userId={currentUserId} darkMode={false} />
              <DailyPhotos coupleId="couple1" userId={currentUserId} />
            </div>
          </Suspense>
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;