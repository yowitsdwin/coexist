// File: pages/HomePage.js

import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Camera, Heart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCouple } from '../contexts/CoupleContext'; // 1. Import the new hook
import PresenceIndicator from '../components/PresenceIndicator';
import { useTodayStats } from '../hooks/useTodayStats'; // 1. Import the new hook

const HomePage = ({ darkMode }) => {
  const { currentUser } = useAuth();
  const { partnerId, partner } = useCouple(); // 2. Get partner data from the context
  const { stats, loading } = useTodayStats();

  // Prevents rendering before essential data is loaded
  if (!currentUser || !partnerId) {
    return null; 
  }

  const features = [
    {
      icon: MessageCircle,
      title: 'Chat Together',
      description: 'Stay connected with real-time messaging',
      color: 'from-blue-400 to-blue-600',
      link: '/chat'
    },
    {
      icon: Camera,
      title: 'Share Moments',
      description: 'Capture and share daily photos',
      color: 'from-pink-400 to-pink-600',
      link: '/photos'
    }
  ];

  return (
    <div className={`min-h-screen ${
      darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-pink-50 to-purple-50'
    }`}>
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className={`${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } rounded-2xl shadow-xl p-8 mb-8`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className={`text-3xl font-bold mb-2 ${
                darkMode ? 'text-white' : 'text-gray-800'
              }`}>
                Welcome back, {currentUser?.displayName || 'User'}! 💕
              </h1>
              <p className={`mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {partner?.displayName || 'Your partner'}'s status
              </p>
              <div className="mt-2">
                {/* 3. Use the dynamic partnerId from the hook */}
                <PresenceIndicator partnerId={partnerId} darkMode={darkMode} />
              </div>
            </div>
            <Heart className="w-20 h-20 text-pink-500 animate-pulse" />
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Link
                key={index}
                to={feature.link}
                className={`${
                  darkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:shadow-2xl'
                } rounded-2xl shadow-xl p-6 transition-all duration-300 transform hover:-translate-y-2`}
              >
                <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h2 className={`text-xl font-bold mb-2 ${
                  darkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  {feature.title}
                </h2>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {feature.description}
                </p>
              </Link>
            );
          })}
        </div>

        {/* Quick Stats (Note: These are still hardcoded and would need real data) */}
        <div className="container mx-auto px-4 py-8">
        {/* ... */}
        {/* Quick Stats section is now dynamic */}
        <div className={`${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } rounded-2xl shadow-xl p-6`}>
          <h2 className={`text-xl font-bold mb-4 ${
            darkMode ? 'text-white' : 'text-gray-800'
          }`}>
            Today's Activity
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                {/* 3. Replace hardcoded "0" with real data */}
                {loading ? '...' : stats.messageCount}
              </div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Messages
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-pink-600 bg-clip-text text-transparent">
                {/* 3. Replace hardcoded "0" with real data */}
                {loading ? '...' : stats.photoCount}
              </div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Photos
              </div>
            </div>
          </div>
        </div>
    </div>
      </div>
    </div>
  );
};

export default HomePage;