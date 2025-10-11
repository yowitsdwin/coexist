// Input sanitization
export const sanitizeInput = (input, maxLength = 1000) => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

export const sanitizeUrl = (url) => {
  if (!url) return '';
  
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.href;
  } catch {
    return '';
  }
};

// Image compression
// Enhanced image compression for Realtime Database
export const compressImageForDatabase = async (file, maxWidth = 400, quality = 0.6) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Invalid file type'));
      return;
    }

    // Check file size (max 1MB before compression)
    if (file.size > 1024 * 1024) {
      reject(new Error('File too large. Please choose an image under 1MB'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // More aggressive scaling for database storage
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Use image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Compression failed'));
              return;
            }
            
            // Check compressed size (should be < 100KB for Realtime Database)
            if (blob.size > 100 * 1024) {
              reject(new Error('Image still too large after compression. Try a smaller image.'));
              return;
            }
            
            const reader2 = new FileReader();
            reader2.onloadend = () => resolve(reader2.result);
            reader2.onerror = reject;
            reader2.readAsDataURL(blob);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Validate base64 image size
export const validateImageSize = (base64String, maxSizeKB = 100) => {
  const base64Length = base64String.length - (base64String.indexOf(',') + 1);
  const sizeInBytes = (base64Length * 3) / 4;
  const sizeInKB = sizeInBytes / 1024;
  
  return {
    isValid: sizeInKB <= maxSizeKB,
    size: Math.round(sizeInKB),
    maxSize: maxSizeKB
  };
};

// Weather utilities
export const getWeatherByCoords = async (lat, lon) => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
      { signal: AbortSignal.timeout(5000) } // 5 second timeout
    );
    
    if (!response.ok) {
      throw new Error('Weather API request failed');
    }
    
    const data = await response.json();
    return {
      temperature: Math.round(data.current_weather.temperature),
      code: data.current_weather.weathercode
    };
  } catch (error) {
    console.error('Weather fetch error:', error);
    return null;
  }
};

export const getWeatherEmoji = (code) => {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '🌨️';
  return '⛈️';
};

// Time formatting
export const formatTime = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch {
    return '';
  }
};

export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  
  const now = Date.now();
  const diff = now - timestamp;
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  
  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  
  return new Date(timestamp).toLocaleDateString();
};

// Profile utilities
export const calculateAge = (birthdate) => {
  if (!birthdate) return null;
  try {
    const diff = Date.now() - new Date(birthdate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
  } catch {
    return null;
  }
};

export const getLocalTime = (timezone) => {
  try {
    return new Date().toLocaleTimeString('en-US', { 
      timeZone: timezone || 'UTC', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch {
    return 'N/A';
  }
};

export const getTimeEmoji = (timezone) => {
  try {
    const hour = parseInt(
      new Date().toLocaleString('en-US', { 
        timeZone: timezone, 
        hour: 'numeric', 
        hour12: false 
      })
    );
    if (hour >= 6 && hour < 12) return '🌅';
    if (hour >= 12 && hour < 17) return '☀️';
    if (hour >= 17 && hour < 20) return '🌇';
    return '🌃';
  } catch {
    return '🕐';
  }
};

// Gender color utilities
export const getGenderColor = (gender) => {
  if (gender === 'male') return 'from-blue-400 to-indigo-400';
  if (gender === 'female') return 'from-pink-400 to-rose-400';
  return 'from-purple-400 to-indigo-400';
};

export const getGenderBg = (gender, darkMode) => {
  if (gender === 'male') {
    return darkMode ? 'from-blue-900 to-indigo-900' : 'from-blue-50 to-indigo-50';
  }
  if (gender === 'female') {
    return darkMode ? 'from-pink-900 to-rose-900' : 'from-pink-50 to-rose-50';
  }
  return darkMode ? 'from-purple-900 to-indigo-900' : 'from-purple-50 to-indigo-50';
};

// Debounce utility
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle utility
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Error handling
export const handleFirebaseError = (error) => {
  const errorMessages = {
    'auth/email-already-in-use': 'This email is already registered',
    'auth/invalid-email': 'Invalid email address',
    'auth/operation-not-allowed': 'Operation not allowed',
    'auth/weak-password': 'Password should be at least 6 characters',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/too-many-requests': 'Too many attempts. Please try again later',
    'permission-denied': 'Permission denied. Please check your access rights',
    'network-request-failed': 'Network error. Please check your connection'
  };

  return errorMessages[error.code] || error.message || 'An error occurred';
};

const helpers = {
  sanitizeInput,
  sanitizeUrl,
  compressImageForDatabase,
  validateImageSize,
  getWeatherByCoords,
  getWeatherEmoji,
  formatTime,
  formatRelativeTime,
  calculateAge,
  getLocalTime,
  getTimeEmoji,
  getGenderColor,
  getGenderBg,
  debounce,
  throttle,
  handleFirebaseError
};

export default helpers;