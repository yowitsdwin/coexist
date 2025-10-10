// File: components/DailyPhotos.js

import React, { useState, useCallback, useMemo } from 'react';
import { Camera, Heart, Trash2, Download } from 'lucide-react';
import { ref, push, set, remove } from 'firebase/database';
import { database } from '../firebase';
import { useRealtimeQuery } from '../utils/useFirebase';
import { compressImageForDatabase, validateImageSize, formatRelativeTime } from '../utils/helpers';
import { useToast } from '../utils/Toast';
import { CardSkeleton } from './Loading';

const DailyPhotos = ({ coupleId, userId, userName, darkMode = false }) => {
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  // Fetch photos
  const { data: photos, loading } = useRealtimeQuery(
    `dailyPhotos/${coupleId}`,
    (val) => {
      if (!val) return [];
      return Object.entries(val)
        .map(([id, photo]) => ({ id, ...photo }))
        .sort((a, b) => b.timestamp - a.timestamp);
    }
  );

  // Filter photos from last 24 hours
  const recentPhotos = useMemo(() => {
    if (!photos) return [];
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    return photos.filter(photo => photo.timestamp > oneDayAgo);
  }, [photos]);

  // Handle photo capture
  const handlePhotoCapture = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      // Compress image
      const compressed = await compressImageForDatabase(file, 400, 0.6);
      
      // Validate size
      const validation = validateImageSize(compressed, 100);
      if (!validation.isValid) {
        toast.error(`Image too large (${validation.size}KB). Max ${validation.maxSize}KB`);
        setUploading(false);
        return;
      }

      // Upload to Realtime Database
      const photosRef = ref(database, `dailyPhotos/${coupleId}`);
      const newPhotoRef = push(photosRef);
      
      await set(newPhotoRef, {
        imageData: compressed,
        userId,
        userName,
        timestamp: Date.now(),
        reactions: {}
      });

      toast.success('Photo uploaded successfully!');
      e.target.value = ''; // Reset input
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  }, [coupleId, userId, userName, toast]);

  // Handle reaction
  const handleReaction = useCallback(async (photoId, currentReactions) => {
    const reactionRef = ref(database, `dailyPhotos/${coupleId}/${photoId}/reactions/${userId}`);
    
    try {
      if (currentReactions?.[userId]) {
        // Remove reaction
        await remove(reactionRef);
      } else {
        // Add reaction
        await set(reactionRef, {
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Reaction error:', error);
      toast.error('Failed to add reaction');
    }
  }, [coupleId, userId, toast]);

  // Handle delete
  const handleDelete = useCallback(async (photoId, photoUserId) => {
    if (photoUserId !== userId) {
      toast.error('You can only delete your own photos');
      return;
    }

    if (!window.confirm('Delete this photo?')) return;

    try {
      const photoRef = ref(database, `dailyPhotos/${coupleId}/${photoId}`);
      await remove(photoRef);
      toast.success('Photo deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete photo');
    }
  }, [coupleId, userId, toast]);

  // Handle download
  const handleDownload = useCallback((imageData, photoId) => {
    try {
      const link = document.createElement('a');
      link.href = imageData;
      link.download = `photo-${photoId}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Photo downloaded');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download photo');
    }
  }, [toast]);

  if (loading) {
    return <CardSkeleton darkMode={darkMode} />;
  }

  return (
    <div className={`rounded-2xl shadow-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          📸 Today's Moments
        </h2>
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoCapture}
            className="hidden"
            disabled={uploading}
          />
          <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            uploading
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600'
          } text-white transition-all`}>
            <Camera className="w-5 h-5" />
            {uploading ? 'Uploading...' : 'Add Photo'}
          </div>
        </label>
      </div>

      {/* Photos grid */}
      {recentPhotos.length === 0 ? (
        <div className="text-center py-12">
          <Camera className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
          <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            No photos today
          </p>
          <p className={`text-sm mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Capture your first moment together!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentPhotos.map((photo) => {
            const reactionCount = photo.reactions ? Object.keys(photo.reactions).length : 0;
            const hasReacted = photo.reactions?.[userId];
            const isOwnPhoto = photo.userId === userId;

            return (
              <div
                key={photo.id}
                className={`rounded-xl overflow-hidden shadow-lg ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-50'
                } hover:shadow-2xl transition-shadow`}
              >
                {/* Image */}
                <div className="relative aspect-square">
                  <img
                    src={photo.imageData}
                    alt="Daily moment"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  
                  {/* Action buttons overlay */}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button
                      onClick={() => handleDownload(photo.imageData, photo.id)}
                      className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-lg"
                      aria-label="Download photo"
                    >
                      <Download className="w-4 h-4 text-gray-700" />
                    </button>
                    {isOwnPhoto && (
                      <button
                        onClick={() => handleDelete(photo.id, photo.userId)}
                        className="p-2 bg-red-500/90 backdrop-blur-sm rounded-full hover:bg-red-500 transition-colors shadow-lg"
                        aria-label="Delete photo"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {photo.userName || 'Unknown'}
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatRelativeTime(photo.timestamp)}
                      </p>
                    </div>
                    
                    {/* Heart reaction */}
                    <button
                      onClick={() => handleReaction(photo.id, photo.reactions)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full transition-all ${
                        hasReacted
                          ? 'bg-pink-500 text-white'
                          : darkMode
                          ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      <Heart 
                        className={`w-4 h-4 ${hasReacted ? 'fill-current' : ''}`}
                      />
                      {reactionCount > 0 && (
                        <span className="text-sm font-medium">{reactionCount}</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info text */}
      <p className={`text-xs mt-4 text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        Photos automatically delete after 24 hours
      </p>
    </div>
  );
};

export default DailyPhotos;