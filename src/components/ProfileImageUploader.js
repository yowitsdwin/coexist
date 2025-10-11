import React, { useState, useRef } from 'react';
import { Upload, X, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from './Loading';
import { uploadToCloudinary } from '../utils/cloudinaryUploader';

export const ProfileImageUploader = ({ onUpload, onCancel, darkMode }) => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setError(null); // Clear any previous errors
    
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      // Basic size check (e.g., 2MB)
      if (selectedFile.size > 2 * 1024 * 1024) {
        setError("File is too large. Please select an image under 2MB.");
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setError("Please select a valid image file.");
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      
      console.log('Starting upload...');
      const publicUrl = await uploadToCloudinary(file);
      
      if (publicUrl) {
        console.log('Upload successful, URL:', publicUrl);
        onUpload(publicUrl); // Send the final URL back to the ProfileCard
      } else {
        throw new Error('Upload failed - no URL returned');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" 
      onClick={onCancel}
    >
      <div 
        className={`rounded-2xl shadow-xl p-6 w-full max-w-sm ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`} 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-bold ${
            darkMode ? 'text-white' : 'text-gray-800'
          }`}>
            Update Profile Picture
          </h2>
          <button 
            onClick={onCancel} 
            className={`p-1 rounded-full hover:bg-gray-200 ${
              darkMode ? 'hover:bg-gray-700' : ''
            }`}
            disabled={uploading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-100 border border-red-300 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* File Upload Area */}
          <div 
            className={`w-full aspect-square rounded-lg border-2 border-dashed ${
              darkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400'
            } flex items-center justify-center cursor-pointer transition-colors ${
              uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden"
              disabled={uploading}
            />
            {previewUrl ? (
              <div className="relative w-full h-full">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-full h-full object-cover rounded-lg" 
                />
                {!uploading && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <p className="text-white text-sm">Click to change</p>
                  </div>
                )}
              </div>
            ) : (
              <div className={`text-center ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <Upload className="w-12 h-12 mx-auto mb-2" />
                <p>Click to select an image</p>
                <p className="text-xs mt-1">Max 2MB • JPG, PNG, GIF</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button 
              onClick={onCancel} 
              disabled={uploading} 
              className={`w-full py-2 rounded-lg font-medium transition-colors ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Cancel
            </button>
            <button 
              onClick={handleUpload} 
              disabled={!file || uploading} 
              className="w-full py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              {uploading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Uploading...</span>
                </>
              ) : (
                'Upload'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};