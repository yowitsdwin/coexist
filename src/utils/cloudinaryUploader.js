import { getAuth } from 'firebase/auth';

export const uploadToCloudinary = async (file) => {
  try {
    console.log('🚀 Starting Cloudinary upload process...');
    console.log('📁 File details:', {
      name: file.name,
      size: `${(file.size / 1024).toFixed(2)} KB`,
      type: file.type
    });

    // 1. Get Firebase authentication token
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.error('❌ No authenticated user found');
      throw new Error('User not authenticated');
    }
    
    console.log('✅ User authenticated:', user.uid);
    console.log('🔑 Getting Firebase ID token...');
    const token = await user.getIdToken();
    console.log('✅ Firebase token obtained');

    // 2. Request signature from our Vercel API
    console.log('📡 Requesting upload signature from API...');
    const signatureResponse = await fetch('/api/generate-signature', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📡 Signature response status:', signatureResponse.status);
    
    if (!signatureResponse.ok) {
      const errorText = await signatureResponse.text();
      console.error('❌ Signature request failed:', errorText);
      throw new Error(`Could not get upload signature: ${signatureResponse.status}`);
    }

    const { signature, timestamp, apiKey, cloudName, folder } = await signatureResponse.json();
    console.log('✅ Signature received successfully');
    console.log('☁️ Cloud Name:', cloudName);
    console.log('⏰ Timestamp:', timestamp);
    console.log('📁 Folder:', folder);

    // 3. Prepare form data for Cloudinary
    // IMPORTANT: Parameters must match those used to generate the signature
    console.log('📦 Preparing upload data...');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('folder', folder); // Use folder from API response

    // 4. Upload to Cloudinary
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    console.log('☁️ Uploading to Cloudinary:', cloudinaryUrl);
    
    const uploadResponse = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: formData,
    });

    console.log('☁️ Cloudinary response status:', uploadResponse.status);

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ Cloudinary upload failed:', errorText);
      throw new Error(`Cloudinary upload failed: ${uploadResponse.status}`);
    }

    const responseData = await uploadResponse.json();
    console.log('📥 Cloudinary response data:', responseData);
    
    // 5. Check for Cloudinary-specific errors
    if (responseData.error) {
      console.error('❌ Cloudinary Error:', responseData.error.message);
      throw new Error(responseData.error.message);
    }
    
    // 6. Verify secure_url exists
    if (!responseData.secure_url) {
      console.error('❌ No secure_url in response:', responseData);
      throw new Error('Upload succeeded but no URL was returned');
    }
    
    console.log('✅ Upload successful!');
    console.log('🔗 Image URL:', responseData.secure_url);
    console.log('🆔 Public ID:', responseData.public_id);
    
    return responseData.secure_url;

  } catch (error) {
    console.error('❌ Error uploading image:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack
    });
    return null; // Return null on any failure
  }
};

/**
 * Upload to Cloudinary with progress tracking
 * @param {File} file - The file to upload
 * @param {Function} onProgress - Callback function that receives progress percentage (0-100)
 * @returns {Promise<string|null>} The secure URL or null on failure
 */
export const uploadToCloudinaryWithProgress = async (file, onProgress) => {
  try {
    console.log('🚀 Starting upload with progress tracking...');
    
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const token = await user.getIdToken();

    // Get signature
    const signatureResponse = await fetch('/api/generate-signature', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!signatureResponse.ok) {
      throw new Error('Could not get upload signature');
    }

    const { signature, timestamp, apiKey, cloudName } = await signatureResponse.json();

    // Prepare form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('folder', 'profile_pictures');
    
    // Upload with XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          console.log(`📊 Upload progress: ${percentComplete}%`);
          onProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          
          if (response.error) {
            console.error('❌ Cloudinary Error:', response.error.message);
            reject(new Error(response.error.message));
          } else if (response.secure_url) {
            console.log('✅ Upload complete:', response.secure_url);
            resolve(response.secure_url);
          } else {
            console.error('❌ No secure_url in response');
            reject(new Error('No URL returned'));
          }
        } else {
          console.error('❌ Upload failed with status:', xhr.status);
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        console.error('❌ Network error during upload');
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        console.error('❌ Upload aborted');
        reject(new Error('Upload aborted'));
      });

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      xhr.open('POST', cloudinaryUrl);
      xhr.send(formData);
    });

  } catch (error) {
    console.error('❌ Error in uploadToCloudinaryWithProgress:', error);
    return null;
  }
};