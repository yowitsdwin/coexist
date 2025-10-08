import React, { useState, useEffect, useRef } from 'react';
import { Send, Heart, Moon, Sun, Smile, LogOut, Camera, Check, CheckCheck, Palette, Download, Image as ImageIcon, BookHeart, User, MessageCircle, Pencil, Eraser, Type, Menu, X } from 'lucide-react';
import { initCleanup } from './utils/cleanup';
import { auth, database, storage } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { 
  ref, 
  push, 
  onValue, 
  serverTimestamp,
  set,
  update,
  get,
  remove
} from 'firebase/database';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';

// Firebase Auth/DB/Storage helpers
const signUpWithEmail = async (email, password, username) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const user = cred.user;
  try {
    await updateProfile(user, { displayName: username });
  } catch (e) {
    // non-fatal
    console.warn('updateProfile failed', e);
  }
  await set(ref(database, `users/${user.uid}`), {
    uid: user.uid,
    email,
    username,
    photoURL: null,
    createdAt: Date.now()
  });
  return user;
};

const signInWithEmail = async (email, password) => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const user = cred.user;
  const snap = await get(ref(database, `users/${user.uid}`));
  const profile = snap.exists() ? snap.val() : { username: user.displayName || user.email.split('@')[0], email: user.email, photoURL: user.photoURL || null };
  return { user, profile };
};

const signOutUser = async () => {
  await signOut(auth);
};

const onAuthChanged = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const snap = await get(ref(database, `users/${user.uid}`));
      const profile = snap.exists() ? snap.val() : null;
      callback({ user, profile });
    } else {
      callback(null);
    }
  });
};

const uploadDataUrlImage = async (path, dataUrl) => {
  const sRef = storageRef(storage, path);
  await uploadString(sRef, dataUrl, 'data_url');
  return await getDownloadURL(sRef);
};



// Utility Functions
const compressImage = (file, maxWidth = 800, quality = 0.7) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          const reader2 = new FileReader();
          reader2.onloadend = () => resolve(reader2.result);
          reader2.readAsDataURL(blob);
        }, 'image/jpeg', quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

const getWeatherByCoords = async (lat, lon) => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
    );
    const data = await response.json();
    return {
      temperature: Math.round(data.current_weather.temperature),
      code: data.current_weather.weathercode
    };
  } catch (error) {
    return null;
  }
};

const getWeatherEmoji = (code) => {
  if (code === 0) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '🌨️';
  return '⛈️';
};

// Components
const EmojiPicker = ({ onSelect, onClose }) => {
  const emojis = ['❤️', '😊', '😂', '🥰', '😘', '🤗', '👍', '🎉', '✨', '🌟', '💕', '💖'];
  return (
    <div className="absolute bottom-full mb-2 bg-white rounded-lg shadow-xl p-3 grid grid-cols-6 gap-2 z-50">
      {emojis.map((emoji, i) => (
        <button key={i} onClick={() => { onSelect(emoji); onClose(); }}
          className="text-2xl hover:bg-gray-100 rounded p-1 transition-all hover:scale-110">
          {emoji}
        </button>
      ))}
    </div>
  );
};

const ReactionPicker = ({ onSelect, onClose, position }) => {
  const reactions = ['❤️', '😂', '😢', '😮', '😡', '👍'];
  return (
    <div className="fixed bg-white rounded-full shadow-2xl p-2 flex gap-1 z-50 animate-bounce-in"
      style={{ top: position.y - 60, left: Math.max(10, position.x - 100) }}>
      {reactions.map((emoji, i) => (
        <button key={i} onClick={() => { onSelect(emoji); onClose(); }}
          className="text-2xl hover:bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center hover:scale-125 transition-transform">
          {emoji}
        </button>
      ))}
    </div>
  );
};

const ProfileModal = ({ user, onClose, currentPhotoURL, onPhotoUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      onPhotoUpdate(compressed);
      setUploading(false);
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full animate-slide-up">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          Profile Picture
        </h2>
        <div className="flex flex-col items-center gap-4">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center overflow-hidden ring-4 ring-pink-200">
            {currentPhotoURL ? (
              <img src={currentPhotoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl text-white">{user.email[0].toUpperCase()}</span>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 transition-all hover:scale-105">
            <Camera className="w-5 h-5" />
            {uploading ? 'Uploading...' : 'Change Picture'}
          </button>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800 transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
};

const CoupleCanvas = ({ user, darkMode }) => {
  const [lines, setLines] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#ec4899');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const canvasRef = useRef(null);
  const [ctx, setCtx] = useState(null);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = window.innerWidth - 40;
      canvas.height = window.innerHeight - 250;
      const context = canvas.getContext('2d');
      context.lineCap = 'round';
      context.lineJoin = 'round';
      setCtx(context);
    }
  }, []);

  const startDrawing = (e) => {
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? 20 : strokeWidth;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    ctx.closePath();
    // Save to database in production
  };

  const handleClear = () => {
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const handleUndo = () => {
    // Implement undo logic
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="flex items-center gap-2 p-4 bg-white border-b flex-wrap">
        <button onClick={() => setTool('pen')} 
          className={`p-2 rounded-lg transition-all ${tool === 'pen' ? 'bg-pink-500 text-white scale-110' : 'bg-gray-200 hover:bg-gray-300'}`}>
          <Pencil className="w-5 h-5" />
        </button>
        <button onClick={() => setTool('eraser')}
          className={`p-2 rounded-lg transition-all ${tool === 'eraser' ? 'bg-pink-500 text-white scale-110' : 'bg-gray-200 hover:bg-gray-300'}`}>
          <Eraser className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
            className="w-12 h-10 rounded border-2 border-gray-300 cursor-pointer" />
          <input type="range" min="1" max="20" value={strokeWidth} 
            onChange={(e) => setStrokeWidth(e.target.value)}
            className="w-24" />
        </div>
        <button onClick={handleUndo} className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 ml-auto transition-all">
          Undo
        </button>
        <button onClick={handleClear} className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all">
          Clear
        </button>
      </div>
      <div className="flex-1 overflow-hidden p-4">
        <canvas 
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="bg-white rounded-lg shadow-lg cursor-crosshair"
        />
      </div>
    </div>
  );
};

const DailyPhotos = ({ user, darkMode }) => {
  const [myPhoto, setMyPhoto] = useState(null);
  const [partnerPhoto, setPartnerPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const photosRefPath = 'dailyPhotos';

  useEffect(() => {
    if (!user) return;
    // subscribe to dailyPhotos and pick partner's latest photo
    const dbRefAll = ref(database, photosRefPath);
    const unsub = onValue(dbRefAll, (snap) => {
      const val = snap.val() || {};
      const entries = Object.values(val).filter((p) => p.uid !== user.uid).sort((a,b)=>b.timestamp-a.timestamp);
      const mine = Object.values(val).filter((p) => p.uid === user.uid).sort((a,b)=>b.timestamp-a.timestamp);
      if (entries.length > 0) setPartnerPhoto(entries[0]);
      else setPartnerPhoto(null);
      if (mine.length > 0) setMyPhoto(mine[0]);
    });
    return () => unsub();
  }, [user]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file, 1200, 0.75);
      // upload to Firebase Storage and save record in Realtime DB
      const path = `dailyPhotos/${user.uid}/${Date.now()}.jpg`;
      const downloadUrl = await uploadDataUrlImage(path, compressed);
      const newRef = push(ref(database, photosRefPath));
      await set(newRef, {
        uid: user.uid,
        photoURL: downloadUrl,
        timestamp: Date.now()
      });
      setUploading(false);
    } catch (error) {
      console.error('Upload error:', error);
      setUploading(false);
    }
  };

  const handleDownload = (photoURL) => {
    const link = document.createElement('a');
    link.href = photoURL;
    link.download = `daily-photo-${new Date().toLocaleDateString()}.jpg`;
    link.click();
  };

  const bothUploaded = myPhoto && partnerPhoto;

  return (
    <div className="flex flex-col h-full p-4 bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="text-center mb-6 animate-fade-in">
        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          📸 Today's Photo Exchange
        </h2>
        <p className="text-sm text-gray-600">Photos reveal after both upload • Deleted after 24h ⏰</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 max-w-4xl mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-xl p-6 transform transition-all hover:scale-105">
          <h3 className="font-semibold text-lg mb-4 text-pink-500">Your Photo</h3>
          {myPhoto ? (
            <div className="space-y-3">
              {bothUploaded && (
                <img src={myPhoto.photoURL} alt="My daily" className="w-full rounded-lg shadow-md" />
              )}
              <div className="text-center text-green-600 font-semibold flex items-center justify-center gap-2">
                <Check className="w-5 h-5" /> Uploaded
              </div>
            </div>
          ) : (
            <div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="w-full py-12 border-2 border-dashed border-gray-300 rounded-lg hover:border-pink-500 transition-all hover:bg-pink-50 flex flex-col items-center gap-2">
                <Camera className="w-12 h-12 text-gray-400" />
                <span className="text-gray-600">{uploading ? 'Uploading...' : '+ Upload Photo'}</span>
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 transform transition-all hover:scale-105">
          <h3 className="font-semibold text-lg mb-4 text-purple-500">Partner's Photo</h3>
          {partnerPhoto && bothUploaded ? (
            <div className="space-y-3">
              <img src={partnerPhoto.photoURL} alt="Partner daily" className="w-full rounded-lg shadow-md" />
              <button onClick={() => handleDownload(partnerPhoto.photoURL)}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 flex items-center justify-center gap-2 transition-all">
                <Download className="w-5 h-5" /> Download
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400 text-lg">
              {partnerPhoto ? '🔒 Waiting for your photo' : '⏳ Waiting...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SharedJournal = ({ user, darkMode }) => {
  const [entries, setEntries] = useState([]);
  const [newEntry, setNewEntry] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  const handleSubmit = async () => {
    if (!newEntry.trim()) return;
    const entry = {
      id: Date.now(),
      text: newEntry,
      userId: user.uid,
      author: user.email.split('@')[0],
      timestamp: Date.now()
    };
    setEntries([...entries, entry]);
    setNewEntry('');
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      <div className="text-center p-6 bg-white bg-opacity-90 backdrop-blur-sm">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          📖 Our Love Story
        </h2>
        <p className="text-sm text-gray-600 mt-2">Every moment, forever remembered ✨</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {entries.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <BookHeart className="w-20 h-20 mx-auto mb-4 text-pink-300" />
            <p className="text-gray-400 text-lg">Start your journey together...</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl mx-auto">
            {entries.map((entry) => {
              const isOwn = entry.userId === user.uid;
              const date = new Date(entry.timestamp);
              return (
                <div key={entry.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                  <div className={`max-w-md rounded-2xl p-5 shadow-xl transform transition-all hover:scale-105 ${
                    isOwn ? 'bg-gradient-to-r from-pink-400 to-rose-400 text-white' 
                    : 'bg-gradient-to-r from-purple-400 to-indigo-400 text-white'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold">{entry.author}</span>
                      <span className="text-xs opacity-75">•</span>
                      <span className="text-xs opacity-75">{date.toLocaleDateString()}</span>
                    </div>
                    <p className="text-white leading-relaxed">{entry.text}</p>
                    <p className="text-xs opacity-75 mt-2">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="p-4 bg-white bg-opacity-90 backdrop-blur-sm border-t">
        <div className="max-w-2xl mx-auto flex gap-2">
          <input value={newEntry} onChange={(e) => setNewEntry(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Write your heart out..."
            className="flex-1 px-5 py-3 rounded-full border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" />
          <button onClick={handleSubmit}
            className="p-3 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 transition-all hover:scale-110">
            <Send className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

const CoupleProfile = ({ user, userProfile, onProfileUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [weather, setWeather] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    gender: '',
    birthdate: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    interests: '',
    facebook: '',
    instagram: '',
    tiktok: ''
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({ ...formData, ...userProfile });
    }
  }, [userProfile]);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(async (pos) => {
      const w = await getWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
      setWeather(w);
    });
  }, []);

  const handleSave = () => {
    onProfileUpdate(formData);
    setEditing(false);
  };

  const getLocalTime = (timezone) => {
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

  const getTimeEmoji = (timezone) => {
    try {
      const hour = parseInt(new Date().toLocaleString('en-US', { timeZone: timezone, hour: 'numeric', hour12: false }));
      if (hour >= 6 && hour < 12) return '🌅';
      if (hour >= 12 && hour < 17) return '☀️';
      if (hour >= 17 && hour < 20) return '🌇';
      return '🌃';
    } catch {
      return '🕐';
    }
  };

  const calculateAge = (birthdate) => {
    if (!birthdate) return 'N/A';
    const diff = Date.now() - new Date(birthdate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        
        {/* Weather Widget */}
        <div className="bg-white rounded-2xl shadow-xl p-6 animate-fade-in">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            <span>🌍</span> Our Weather
          </h2>
          <div className="text-center p-6 bg-gradient-to-br from-pink-100 to-rose-100 rounded-xl">
            <p className="text-sm font-semibold mb-3">You</p>
            {weather ? (
              <div>
                <div className="text-5xl mb-3">{getWeatherEmoji(weather.code)}</div>
                <p className="text-4xl font-bold text-gray-800">{weather.temperature}°C</p>
                <p className="text-sm text-gray-600 mt-3 font-medium">
                  {getLocalTime(formData.timezone)} {getTimeEmoji(formData.timezone)}
                </p>
              </div>
            ) : (
              <p className="text-gray-400">Loading weather...</p>
            )}
          </div>
        </div>

        {/* User Profile */}
        <div className="bg-white rounded-2xl shadow-xl p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              Your Profile
            </h2>
            <button onClick={() => setEditing(!editing)}
              className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all hover:scale-105">
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {editing ? (
            <div className="space-y-4">
              <input value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Full Name" className="w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" />
              <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all">
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <input type="date" value={formData.birthdate} 
                onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                className="w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" />
              <textarea value={formData.interests} 
                onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                placeholder="Interests & Hobbies" rows="3" 
                className="w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" />
              <input value={formData.facebook} onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                placeholder="Facebook Profile URL" className="w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" />
              <input value={formData.instagram} onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                placeholder="Instagram Profile URL" className="w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" />
              <input value={formData.tiktok} onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
                placeholder="TikTok Profile URL" className="w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" />
              <button onClick={handleSave}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 font-semibold transition-all hover:scale-105">
                Save Changes
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-pink-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Full Name</p>
                  <p className="font-semibold">{formData.fullName || 'Not set'}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Gender</p>
                  <p className="font-semibold capitalize">{formData.gender || 'Not set'}</p>
                </div>
                <div className="p-4 bg-pink-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Age</p>
                  <p className="font-semibold">{calculateAge(formData.birthdate)} years</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Timezone</p>
                  <p className="font-semibold text-sm">{formData.timezone}</p>
                </div>
              </div>
              {formData.interests && (
                <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2 font-medium">Interests & Hobbies</p>
                  <p className="text-gray-700">{formData.interests}</p>
                </div>
              )}
              {(formData.facebook || formData.instagram || formData.tiktok) && (
                <div>
                  <p className="text-sm text-gray-500 mb-3 font-medium">Social Links</p>
                  <div className="flex gap-3 flex-wrap">
                    {formData.facebook && (
                      <a href={formData.facebook} target="_blank" rel="noopener noreferrer"
                        className="px-5 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all hover:scale-105">
                        Facebook
                      </a>
                    )}
                    {formData.instagram && (
                      <a href={formData.instagram} target="_blank" rel="noopener noreferrer"
                        className="px-5 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-all hover:scale-105">
                        Instagram
                      </a>
                    )}
                    {formData.tiktok && (
                      <a href={formData.tiktok} target="_blank" rel="noopener noreferrer"
                        className="px-5 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all hover:scale-105">
                        TikTok
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function App() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userProfile, setUserProfile] = useState({ username: 'You' });
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    initCleanup();
  }, []);

  // Apply a page-level attribute so we can write a few dark-mode CSS overrides
  useEffect(() => {
    if (darkMode) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  }, [darkMode]);

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsub = onAuthChanged((authState) => {
      if (authState) {
        setUser(authState.user);
        if (authState.profile) setUserProfile(authState.profile);
      } else {
        setUser(null);
        setUserProfile({ username: 'You' });
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  const handleAuth = async () => {
    setAuthError('');
    setLoading(true);
    try {
      if (isSignUp) {
        if (!username.trim()) {
          setAuthError('Please enter a username');
          setLoading(false);
          return;
        }
        await signUpWithEmail(email, password, username);
        // onAuthChanged will set user/profile
      } else {
        const { user: signedUser, profile } = await signInWithEmail(email, password);
        setUser(signedUser);
        if (profile) setUserProfile(profile);
      }
      // user set above or via listener
    } catch (error) {
      setAuthError(error.message);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOutUser();
    setUser(null);
    setMessages([]);
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !user) return;
    setIsTyping(false);

    const newMessage = {
      id: Date.now(),
      text: inputText,
      sender: userProfile.username || user.email.split('@')[0],
      userId: user.uid,
      timestamp: Date.now(),
      type: 'text',
      delivered: false,
      seen: false,
      reactions: {}
    };
    
    setMessages([...messages, newMessage]);
    setInputText('');
    inputRef.current?.focus();
    
    // Simulate delivery
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === newMessage.id ? { ...m, delivered: true } : m));
    }, 1000);
  };

  const sendHeartbeat = async () => {
    if (!user) return;
    const newMessage = {
      id: Date.now(),
      text: '💗',
      sender: userProfile.username || user.email.split('@')[0],
      userId: user.uid,
      timestamp: Date.now(),
      type: 'heartbeat',
      delivered: false,
      seen: false,
      reactions: {}
    };
    setMessages([...messages, newMessage]);
  };

  const handleMessagePress = (messageId, e) => {
    const timer = setTimeout(() => {
      setShowReactionPicker({
        messageId,
        x: e.clientX || e.touches?.[0]?.clientX || 0,
        y: e.clientY || e.touches?.[0]?.clientY || 0
      });
    }, 500);
    setLongPressTimer(timer);
  };

  const handleMessageRelease = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const addReaction = async (messageId, emoji) => {
    setMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        return { ...m, reactions: { ...m.reactions, [user.uid]: emoji } };
      }
      return m;
    }));
    setShowReactionPicker(null);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!user) handleAuth();
      else handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageStatus = (msg) => {
    if (msg.userId !== user?.uid) return null;
    if (msg.seen) return <CheckCheck className="w-4 h-4 text-blue-400" />;
    if (msg.delivered) return <CheckCheck className="w-4 h-4 text-gray-400" />;
    return <Check className="w-4 h-4 text-gray-400" />;
  };

  const handlePhotoUpdate = (photoURL) => {
    setUserProfile({ ...userProfile, photoURL });
    if (user?.uid) {
      set(ref(database, `users/${user.uid}/photoURL`), photoURL).catch((e) => console.warn(e));
      try {
        // update auth profile if possible
        if (auth.currentUser) {
          updateProfile(auth.currentUser, { photoURL }).catch(() => {});
        }
      } catch (e) {}
    }
  };

  const handleProfileUpdate = (updatedProfile) => {
    const merged = { ...userProfile, ...updatedProfile };
    setUserProfile(merged);
    if (user?.uid) {
      update(ref(database, `users/${user.uid}`), merged).catch((e) => console.warn(e));
      try {
        if (updatedProfile.username && auth.currentUser) {
          updateProfile(auth.currentUser, { displayName: updatedProfile.username }).catch(() => {});
        }
      } catch (e) {}
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <Heart className="w-20 h-20 mx-auto mb-4 text-pink-500 animate-pulse" />
          <p className="text-gray-600 text-lg">Connecting hearts...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md animate-slide-up">
          <div className="text-center mb-8">
            <Heart className="w-20 h-20 mx-auto mb-4 text-pink-500 animate-pulse" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent mb-2">
              Stay Connected
            </h1>
            <p className="text-gray-500">{isSignUp ? 'Create your account' : 'Sign in to continue'}</p>
          </div>
          <div className="space-y-4">
            {isSignUp && (
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="Username" className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" />
            )}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email" className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress} placeholder="Password" 
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all" />
            {authError && <p className="text-red-500 text-sm text-center">{authError}</p>}
            <button onClick={handleAuth}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-600 transition-all hover:scale-105 shadow-lg">
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
            <button onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); }}
              className="w-full text-gray-600 hover:text-gray-800 text-sm transition-colors">
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
        .animate-slide-up { animation: slide-up 0.5s ease-out; }
        .animate-bounce-in { animation: bounce-in 0.5s ease-out; }
        /* Dark mode overrides when data-theme="dark" is present on <html> */
        :root[data-theme='dark'] .bg-white { background-color: #0f172a !important; }
        :root[data-theme='dark'] .text-gray-800 { color: #e6edf3 !important; }
        :root[data-theme='dark'] .text-gray-600 { color: #cbd5e1 !important; }
        :root[data-theme='dark'] .bg-gradient-to-br.from-pink-50 { background: linear-gradient(135deg,#2b1b2b,#3a2b3f) !important; }
        :root[data-theme='dark'] .bg-gradient-to-br.from-pink-50.to-purple-50 { background: linear-gradient(135deg,#111827,#1f2937) !important; }
        :root[data-theme='dark'] .bg-gray-100 { background-color: #0b1220 !important; }
        :root[data-theme='dark'] .border-gray-300 { border-color: #2b3440 !important; }
        :root[data-theme='dark'] .bg-white.bg-opacity-90 { background-color: rgba(15,23,42,0.9) !important; }
        :root[data-theme='dark'] .bg-white.bg-opacity-50 { background-color: rgba(15,23,42,0.5) !important; }
        :root[data-theme='dark'] .ring-white { box-shadow: 0 0 0 4px rgba(255,255,255,0.03) !important; }
        :root[data-theme='dark'] .shadow-lg { box-shadow: 0 10px 25px rgba(2,6,23,0.6) !important; }
      `}</style>

      {showProfileModal && (
        <ProfileModal user={user} onClose={() => setShowProfileModal(false)}
          currentPhotoURL={userProfile?.photoURL} onPhotoUpdate={handlePhotoUpdate} />
      )}
      {showReactionPicker && (
        <ReactionPicker onSelect={(emoji) => addReaction(showReactionPicker.messageId, emoji)}
          onClose={() => setShowReactionPicker(null)} position={{ x: showReactionPicker.x, y: showReactionPicker.y }} />
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-500 shadow-lg">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowProfileModal(true)}
              className="w-12 h-12 rounded-full bg-white flex items-center justify-center overflow-hidden ring-4 ring-white ring-opacity-30 transition-all hover:scale-110">
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-pink-500 font-bold text-lg">{user.email[0].toUpperCase()}</span>
              )}
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Our Space</h1>
              <p className="text-sm text-pink-100">{userProfile?.username || user.email.split('@')[0]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(!darkMode)} 
              className="p-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-all">
              {darkMode ? <Sun className="w-5 h-5 text-white" /> : <Moon className="w-5 h-5 text-white" />}
            </button>
            <button onClick={handleLogout} 
              className="p-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-all">
              <LogOut className="w-5 h-5 text-white" />
            </button>
            <button onClick={() => setShowMobileMenu(!showMobileMenu)} 
              className="p-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-all md:hidden">
              {showMobileMenu ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b shadow-sm overflow-x-auto">
        <div className="flex gap-1 px-4 py-2">
          {[
            { id: 'chat', icon: MessageCircle, label: 'Chat' },
            { id: 'canvas', icon: Palette, label: 'Canvas' },
            { id: 'photos', icon: Camera, label: 'Photos' },
            { id: 'journal', icon: BookHeart, label: 'Journal' },
            { id: 'profile', icon: User, label: 'Profile' }
          ].map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setShowMobileMenu(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg scale-105' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              <tab.icon className="w-5 h-5" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full bg-gradient-to-br from-pink-50 to-purple-50">
            <div className="flex-1 overflow-y-auto px-4 py-6">
              {messages.length === 0 ? (
                <div className="text-center py-16 animate-fade-in">
                  <Heart className="w-20 h-20 mx-auto mb-4 text-pink-300" />
                  <p className="text-gray-400 text-lg">No messages yet. Say hi! 👋</p>
                </div>
              ) : (
                <div className="space-y-4 max-w-2xl mx-auto">
                  {messages.map((msg) => {
                    const isOwn = msg.userId === user.uid;
                    return (
                      <div key={msg.id} 
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-slide-up`}
                        onMouseDown={(e) => handleMessagePress(msg.id, e)}
                        onMouseUp={handleMessageRelease}
                        onTouchStart={(e) => handleMessagePress(msg.id, e)}
                        onTouchEnd={handleMessageRelease}>
                        <div className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl shadow-lg transition-all hover:scale-105 ${
                          msg.type === 'heartbeat' 
                            ? 'bg-gradient-to-r from-red-400 to-pink-400 text-white text-4xl'
                            : isOwn 
                              ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white' 
                              : 'bg-white text-gray-800'
                        }`}>
                          <p className={msg.type === 'heartbeat' ? 'text-center' : ''}>{msg.text}</p>
                          <div className="flex items-center justify-between mt-2 text-xs opacity-75">
                            <span>{formatTime(msg.timestamp)}</span>
                            {getMessageStatus(msg)}
                          </div>
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div className="mt-2 flex gap-1">
                              {Object.values(msg.reactions).map((emoji, i) => (
                                <span key={i} className="text-lg">{emoji}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {partnerTyping && (
                    <div className="flex justify-start animate-fade-in">
                      <div className="bg-white px-4 py-3 rounded-2xl shadow-lg">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t">
              <div className="max-w-2xl mx-auto flex gap-2 items-end">
                <button onClick={sendHeartbeat}
                  className="p-3 rounded-full bg-gradient-to-r from-red-400 to-pink-400 text-white hover:from-red-500 hover:to-pink-500 transition-all hover:scale-110 shadow-lg">
                  <Heart className="w-6 h-6" />
                </button>
                <div className="flex-1 relative">
                  {showEmojiPicker && <EmojiPicker onSelect={(e) => setInputText(inputText + e)} onClose={() => setShowEmojiPicker(false)} />}
                  <textarea ref={inputRef} value={inputText} onChange={handleInputChange}
                    onKeyPress={handleKeyPress} placeholder="Type your message..."
                    rows="1"
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none transition-all" />
                </div>
                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-3 rounded-full bg-gray-200 hover:bg-gray-300 transition-all hover:scale-110">
                  <Smile className="w-6 h-6 text-gray-600" />
                </button>
                <button onClick={handleSendMessage}
                  className="p-3 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 transition-all hover:scale-110 shadow-lg">
                  <Send className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'canvas' && <CoupleCanvas user={user} darkMode={darkMode} />}
        {activeTab === 'photos' && <DailyPhotos user={user} darkMode={darkMode} />}
        {activeTab === 'journal' && <SharedJournal user={user} darkMode={darkMode} />}
        {activeTab === 'profile' && <CoupleProfile user={user} userProfile={userProfile} onProfileUpdate={handleProfileUpdate} />}
      </div>
    </div>
  );
}

export default App;