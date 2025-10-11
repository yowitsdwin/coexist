import React from 'react';
import { Heart, Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  return (
    <Loader2 
      className={`${sizes[size]} animate-spin ${className}`}
      aria-label="Loading"
    />
  );
};

export const LoadingScreen = ({ darkMode = false, message = 'Connecting hearts...' }) => {
  return (
    <div 
      className={`min-h-screen ${
        darkMode 
          ? 'bg-gray-900' 
          : 'bg-gradient-to-br from-pink-50 to-purple-50'
      } flex items-center justify-center`}
    >
      <div className="text-center animate-fade-in">
        <Heart className="w-20 h-20 mx-auto mb-4 text-pink-500 animate-pulse" />
        <p className={`${
          darkMode ? 'text-gray-400' : 'text-gray-600'
        } text-lg`}>
          {message}
        </p>
        <div className="mt-4">
          <LoadingSpinner size="lg" className="mx-auto text-pink-500" />
        </div>
      </div>
    </div>
  );
};

export const SkeletonLoader = ({ darkMode = false, count = 3 }) => {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i}
          className={`h-20 ${
            darkMode ? 'bg-gray-700' : 'bg-gray-200'
          } rounded-lg`}
        />
      ))}
    </div>
  );
};

export const MessageSkeleton = ({ darkMode = false, isOwn = false }) => {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 animate-pulse`}>
      <div className={`max-w-xs md:max-w-md rounded-2xl p-4 ${
        darkMode ? 'bg-gray-700' : 'bg-gray-200'
      }`}>
        <div className={`h-3 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'} rounded w-16 mb-2`} />
        <div className={`h-4 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'} rounded w-40 mb-2`} />
        <div className={`h-3 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'} rounded w-12`} />
      </div>
    </div>
  );
};

export const CardSkeleton = ({ darkMode = false }) => {
  return (
    <div className={`${
      darkMode ? 'bg-gray-800' : 'bg-white'
    } rounded-2xl shadow-xl p-6 animate-pulse`}>
      <div className={`h-8 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded w-1/3 mb-6`} />
      <div className="space-y-4">
        <div className={`h-32 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded`} />
        <div className={`h-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded w-3/4`} />
        <div className={`h-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded w-1/2`} />
      </div>
    </div>
  );
};

const Loading = {
  LoadingSpinner,
  LoadingScreen,
  SkeletonLoader,
  MessageSkeleton,
  CardSkeleton
};

export default Loading;