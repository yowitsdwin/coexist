// File: pages/ProfilePage.js

import React, { useState } from 'react';
import { User, Mail, Calendar, MapPin, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../utils/Toast';
import { LoadingSpinner } from '../components/Loading';

const ProfilePage = ({ darkMode }) => {
  const { currentUser, updateUserProfile } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: currentUser?.displayName || '',
    birthdate: currentUser?.birthdate || '',
    location: currentUser?.location || '',
    timezone: currentUser?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    bio: currentUser?.bio || ''
  });

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateUserProfile(formData);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${
      darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-pink-50 to-purple-50'
    } py-8`}>
      <div className="container mx-auto px-4 max-w-2xl">
        <div className={`${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } rounded-2xl shadow-xl p-8`}>
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center">
              <User className="w-12 h-12 text-white" />
            </div>
            <h1 className={`text-2xl font-bold ${
              darkMode ? 'text-white' : 'text-gray-800'
            }`}>
              Your Profile
            </h1>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              {currentUser?.email}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Display Name */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Display Name
                </div>
              </label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-800'
                }`}
                disabled={loading}
              />
            </div>

            {/* Birthdate */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Birthdate
                </div>
              </label>
              <input
                type="date"
                name="birthdate"
                value={formData.birthdate}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-800'
                }`}
                disabled={loading}
              />
            </div>

            {/* Location */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </div>
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="City, Country"
                className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
                }`}
                disabled={loading}
              />
            </div>

            {/* Bio */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Bio
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows="4"
                placeholder="Tell your partner something special..."
                className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'
                }`}
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                loading
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 shadow-lg hover:shadow-xl'
              } text-white`}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </form>

          {/* Account Info */}
          <div className={`mt-8 pt-6 border-t ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${
              darkMode ? 'text-white' : 'text-gray-800'
            }`}>
              Account Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {currentUser?.email}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Member since {new Date(currentUser?.createdAt || Date.now()).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;