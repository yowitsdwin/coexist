import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { compressImageForDatabase, validateImageSize } from '../utils/helpers';
import { useToast } from '../utils/Toast';

export const ImageUpload = ({ onUpload, onCancel, darkMode = false }) => {
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const compressed = await compressImageForDatabase(file);
      const validation = validateImageSize(compressed);
      
      if (!validation.isValid) {
        toast.error(`Image too large (${validation.size}KB). Max ${validation.maxSize}KB`);
        setUploading(false);
        return;
      }

      setPreview(compressed);
      setUploading(false);
    } catch (error) {
      toast.error(error.message || 'Failed to process image');
      setUploading(false);
    }
  };

  const handleUpload = () => {
    if (preview) {
      onUpload(preview);
      setPreview(null);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    if (onCancel) onCancel();
  };

  return (
    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
      {!preview ? (
        <label className="flex flex-col items-center justify-center cursor-pointer">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <div className={`p-8 border-2 border-dashed rounded-lg ${
            darkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400'
          } transition-colors`}>
            {uploading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-2" />
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Compressing...
                </p>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 mx-auto mb-2 text-pink-500" />
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Click to upload image
                </p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Max 1MB (will be compressed)
                </p>
              </>
            )}
          </div>
        </label>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <img 
              src={preview} 
              alt="Preview" 
              className="w-full h-48 object-cover rounded-lg"
            />
            <button
              onClick={() => setPreview(null)}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600"
            >
              Upload
            </button>
            <button
              onClick={handleCancel}
              className={`px-4 py-2 rounded-lg ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;