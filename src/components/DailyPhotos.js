import React, { useState, useCallback, useMemo } from 'react';
import { Camera, Heart, Trash2, Download } from 'lucide-react';
import { ref, push, set, remove } from 'firebase/database';
import { database } from '../firebase';
import { useRealtimeQuery } from '../utils/useFirebase';
import { formatRelativeTime } from '../utils/helpers';
import { useToast } from '../utils/Toast';
import { useAuth } from '../contexts/AuthContext';
import { useCouple } from '../contexts/CoupleContext';
import { uploadToCloudinary } from '../utils/cloudinaryUploader'; // Import Cloudinary uploader
import { CardSkeleton } from './Loading';
//import { LoadingSpinner } from '../components/Loading';

const DailyPhotos = ({ darkMode = false }) => {
  const toast = useToast();
  const { currentUser } = useAuth();
  const { coupleId } = useCouple();
  const [uploading, setUploading] = useState(false);

  const transformPhotos = useCallback((val) => {
    if (!val) return [];
    return Object.entries(val)
      .map(([id, photo]) => ({ id, ...photo }))
      .sort((a, b) => b.timestamp - a.timestamp);
  }, []);

  const { data: photos, loading } = useRealtimeQuery(
    `dailyPhotos/${coupleId}`,
    {
      transform: transformPhotos,
      enabled: !!coupleId
    }
  );

  const recentPhotos = useMemo(() => {
    if (!photos) return [];
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    return photos.filter(photo => photo.timestamp > oneDayAgo);
  }, [photos]);

  // UPDATED: Now uses Cloudinary instead of Base64
  const handlePhotoCapture = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || !coupleId || !currentUser) return;

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File is too large. Please select an image under 2MB.");
      return;
    }

    setUploading(true);
    console.log('📸 Uploading photo to Cloudinary...');
    
    // Upload to Cloudinary (folder will be handled by the API)
    const publicUrl = await uploadToCloudinary(file, { folder: 'daily_photos' });
    
    if (publicUrl) {
      try {
        const photosRef = ref(database, `dailyPhotos/${coupleId}`);
        const newPhotoRef = push(photosRef);
        
        // Save the Cloudinary URL to Realtime Database
        await set(newPhotoRef, {
          imageUrl: publicUrl, // Store Cloudinary URL instead of Base64
          userId: currentUser.uid,
          userName: currentUser.displayName,
          timestamp: Date.now(),
          reactions: {},
        });

        console.log('✅ Photo saved to database');
        toast.success('Photo uploaded successfully!');
      } catch (error) {
        console.error('❌ Failed to save photo metadata:', error);
        toast.error('Failed to save photo metadata.');
      }
    } else {
      toast.error('Failed to upload photo.');
    }

    setUploading(false);
    e.target.value = ''; // Reset file input
  }, [coupleId, currentUser, toast]);
  
  const handleReaction = useCallback(async (photoId, currentReactions) => {
    if (!coupleId || !currentUser) return;
    const reactionRef = ref(database, `dailyPhotos/${coupleId}/${photoId}/reactions/${currentUser.uid}`);
    try {
      if (currentReactions?.[currentUser.uid]) {
        await remove(reactionRef);
      } else {
        await set(reactionRef, { timestamp: Date.now() });
      }
    } catch (error) {
      toast.error('Failed to add reaction');
    }
  }, [coupleId, currentUser, toast]);

  const handleDelete = useCallback(async (photoId, photoUserId) => {
    if (photoUserId !== currentUser?.uid) {
      toast.error('You can only delete your own photos');
      return;
    }
    if (!window.confirm('Delete this photo?')) return;
    try {
      const photoRef = ref(database, `dailyPhotos/${coupleId}/${photoId}`);
      await remove(photoRef);
      toast.success('Photo deleted');
    } catch (error) {
      toast.error('Failed to delete photo');
    }
  }, [coupleId, currentUser, toast]);

  // UPDATED: Now handles both imageUrl (new Cloudinary) and imageData (old Base64)
  const handleDownload = useCallback((photo, photoId) => {
    try {
      const imageSource = photo.imageUrl || photo.imageData; // Support both formats
      const link = document.createElement('a');
      link.href = imageSource;
      link.download = `photo-${photoId}.jpg`;
      link.target = '_blank'; // Open in new tab for Cloudinary URLs
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast.error('Failed to download photo');
    }
  }, [toast]);

  if (loading) {
    return <CardSkeleton darkMode={darkMode} />;
  }

  return (
    <div className={`rounded-2xl shadow-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
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
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600'
          } text-white transition-all`}>
            <Camera className="w-5 h-5" />
            {uploading ? 'Uploading...' : 'Add Photo'}
          </div>
        </label>
      </div>
      
      {recentPhotos.length === 0 ? (
        <div className="text-center py-12">
          <Camera className={`w-16 h-16 mx-auto mb-4 ${
            darkMode ? 'text-gray-600' : 'text-gray-300'
          }`} />
          <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            No photos today
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentPhotos.map((photo) => {
            const reactionCount = photo.reactions ? Object.keys(photo.reactions).length : 0;
            const hasReacted = photo.reactions?.[currentUser?.uid];
            const isOwnPhoto = photo.userId === currentUser?.uid;
            // Support both new (imageUrl) and old (imageData) format
            const imageSource = photo.imageUrl || photo.imageData;

            return (
              <div 
                key={photo.id} 
                className={`rounded-xl overflow-hidden shadow-lg ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-50'
                } hover:shadow-2xl transition-shadow`}
              >
                <div className="relative aspect-square">
                  <img 
                    src={imageSource} 
                    alt="Daily moment" 
                    className="w-full h-full object-cover" 
                    loading="lazy" 
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button 
                      onClick={() => handleDownload(photo, photo.id)} 
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
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${
                        darkMode ? 'text-white' : 'text-gray-800'
                      }`}>
                        {photo.userName || 'Unknown'}
                      </p>
                      <p className={`text-xs ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {formatRelativeTime(photo.timestamp)}
                      </p>
                    </div>
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
                      <Heart className={`w-4 h-4 ${hasReacted ? 'fill-current' : ''}`} />
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
      <p className={`text-xs mt-4 text-center ${
        darkMode ? 'text-gray-500' : 'text-gray-400'
      }`}>
        Photos automatically delete after 24 hours
      </p>
    </div>
  );
};

export default DailyPhotos;