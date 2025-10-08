import React, { useState, useEffect, useRef } from 'react';
import { Send, Heart, Moon, Sun, Smile, LogOut, Camera, Check, CheckCheck, Palette, Download, Image as ImageIcon, BookHeart, User, MessageCircle, Pencil, Eraser, Type, Menu, X } from 'lucide-react';
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
  remove,
  query,
  orderByChild,
  limitToLast
} from 'firebase/database';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';

// Firebase Auth/DB/Storage helpers
const signUpWithEmail = async (email, password, username) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const user = cred.user;
  try {
    await updateProfile(user, { displayName: username });
  } catch (e) {
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
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#ec4899');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const canvasRef = useRef(null);
  const [ctx, setCtx] = useState(null);
  const drawingRef = useRef(null);
  const lastWriteRef = useRef(0);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = Math.min(window.innerWidth - 40, 1200);
      canvas.height = Math.min(window.innerHeight - 200, 600);
      const context = canvas.getContext('2d');
      context.lineCap = 'round';
      context.lineJoin = 'round';
      setCtx(context);
    }
    const onResize = () => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const imageData = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);
      canvas.width = Math.min(window.innerWidth - 40, 1200);
      canvas.height = Math.min(window.innerHeight - 200, 600);
      canvas.getContext('2d').putImageData(imageData,0,0);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!user || !ctx) return;

    const strokesRef = ref(database, 'canvas/strokes');
    const liveRef = ref(database, 'canvas/live');

    const renderAll = async () => {
      try {
        const [stSnap, liveSnap] = await Promise.all([
          get(strokesRef),
          get(liveRef)
        ]);
        const strokes = stSnap.val() || {};
        const live = liveSnap.val() || {};
        const all = { ...strokes, ...live };

        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        Object.values(all).forEach((stroke) => {
          if (!stroke || !stroke.points) return;
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = stroke.width;
          ctx.beginPath();
          stroke.points.forEach((point, i) => {
            if (i === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
          });
          ctx.stroke();
        });
      } catch (e) {
        console.error('Error rendering canvas:', e);
      }
    };

    renderAll();

    const unsubSt = onValue(strokesRef, renderAll);
    const unsubLive = onValue(liveRef, renderAll);

    return () => {
      unsubSt();
      unsubLive();
    };
  }, [user, ctx]);

  const startDrawing = (e) => {
    if (!ctx || !canvasRef.current) return;
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    drawingRef.current = {
      id: `${user.uid}_${Date.now()}`,
      color: tool === 'eraser' ? '#ffffff' : color,
      width: tool === 'eraser' ? 20 : strokeWidth,
      points: [{ x, y }]
    };

    try {
      set(ref(database, `canvas/live/${drawingRef.current.id}`), drawingRef.current);
    } catch (err) {
      console.error('Live stroke write error:', err);
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing || !drawingRef.current || !ctx || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    drawingRef.current.points.push({ x, y });

    ctx.strokeStyle = drawingRef.current.color;
    ctx.lineWidth = drawingRef.current.width;
    ctx.lineTo(x, y);
    ctx.stroke();

    const now = Date.now();
    if (now - lastWriteRef.current > 100) {
      lastWriteRef.current = now;
      try {
        set(ref(database, `canvas/live/${drawingRef.current.id}`), drawingRef.current);
      } catch (err) {
        console.error('Live stroke update error:', err);
      }
    }
  };

  const stopDrawing = async () => {
    if (!isDrawing || !drawingRef.current) return;
    setIsDrawing(false);
    try {
      ctx.closePath();
    } catch {}

    try {
      const id = drawingRef.current.id;
      await set(ref(database, `canvas/strokes/${id}`), drawingRef.current);
      await remove(ref(database, `canvas/live/${id}`));
    } catch (error) {
      console.error('Error saving stroke:', error);
    }

    drawingRef.current = null;
  };

  const handleClear = async () => {
    if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    try {
      await remove(ref(database, 'canvas/strokes'));
      await remove(ref(database, 'canvas/live'));
    } catch (error) {
      console.error('Error clearing canvas:', error);
    }
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
        <button onClick={handleClear} className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all ml-auto">
          Clear All
        </button>
      </div>
      <div className="flex-1 overflow-hidden p-4 flex items-center justify-center">
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
  const [countdown, setCountdown] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const photosRef = ref(database, 'dailyPhotos');
    const unsub = onValue(photosRef, (snap) => {
      const val = snap.val() || {};
      const entries = Object.entries(val);
      const mine = entries.find(([k, p]) => p.uid === user.uid);
      const partner = entries.find(([k, p]) => p.uid !== user.uid);
      
      setMyPhoto(mine ? { id: mine[0], ...mine[1] } : null);
      setPartnerPhoto(partner ? { id: partner[0], ...partner[1] } : null);

      if (mine && partner) {
        const bothUploadTime = Math.max(mine[1].timestamp, partner[1].timestamp);
        const expiresAt = bothUploadTime + (24 * 60 * 60 * 1000);
        const timeLeft = expiresAt - Date.now();
        
        if (timeLeft <= 0) {
          remove(ref(database, `dailyPhotos/${mine[0]}`));
          remove(ref(database, `dailyPhotos/${partner[0]}`));
        } else {
          setCountdown(timeLeft);
        }
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!countdown) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1000) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: false 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (error) {
      console.error('Camera error:', error);
      alert('Cannot access camera');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const handleUpload = async () => {
    if (!capturedImage) return;
    setUploading(true);
    try {
      const path = `dailyPhotos/${user.uid}/${Date.now()}.jpg`;
      const downloadUrl = await uploadDataUrlImage(path, capturedImage);
      const newRef = push(ref(database, 'dailyPhotos'));
      await set(newRef, {
        uid: user.uid,
        photoURL: downloadUrl,
        timestamp: Date.now()
      });
      setCapturedImage(null);
      setUploading(false);
    } catch (error) {
      console.error('Upload error:', error);
      setUploading(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleDownload = (photoURL) => {
    const link = document.createElement('a');
    link.href = photoURL;
    link.download = `daily-photo-${new Date().toLocaleDateString()}.jpg`;
    link.click();
  };

  const bothUploaded = myPhoto && partnerPhoto;

  const formatCountdown = (ms) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="flex flex-col h-full p-4 bg-gradient-to-br from-pink-50 to-purple-50 overflow-y-auto">
      <div className="text-center mb-6 animate-fade-in">
        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
          📸 Today's Photo Exchange
        </h2>
        <p className="text-sm text-gray-600">Photos reveal after both upload</p>
        {countdown && bothUploaded && (
          <p className="text-sm text-red-500 font-semibold mt-2">⏰ Expires in: {formatCountdown(countdown)}</p>
        )}
      </div>

      {!myPhoto && !capturedImage && (
        <div className="max-w-2xl mx-auto w-full mb-6">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            {showCamera ? (
              <>
                <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg mb-4" />
                <div className="flex gap-3 justify-center">
                  <button onClick={stopCamera}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all">
                    Cancel
                  </button>
                  <button onClick={capturePhoto}
                    className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg hover:from-pink-600 hover:to-rose-600 transition-all flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Capture
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Camera className="w-20 h-20 mx-auto mb-4 text-pink-300" />
                <button onClick={startCamera}
                  className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all text-lg font-semibold">
                  Open Camera
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {capturedImage && !myPhoto && (
        <div className="max-w-2xl mx-auto w-full mb-6">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <img src={capturedImage} alt="Preview" className="w-full rounded-lg mb-4" />
            <div className="flex gap-3 justify-center">
              <button onClick={handleRetake}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all">
                Retake
              </button>
              <button onClick={handleUpload} disabled={uploading}
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 transition-all">
                {uploading ? 'Uploading...' : 'Upload Photo'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-xl p-6 transform transition-all hover:scale-105">
          <h3 className="font-semibold text-lg mb-4 text-pink-500">Your Photo</h3>
          {myPhoto && bothUploaded ? (
            <img src={myPhoto.photoURL} alt="My daily" className="w-full rounded-lg shadow-md mb-3" />
          ) : myPhoto && !bothUploaded ? (
            <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
              <div className="text-center">
                <Check className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p className="text-green-600 font-semibold">Uploaded!</p>
                <p className="text-sm text-gray-500 mt-2">Waiting for partner...</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg text-gray-400">
              No photo uploaded today
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
                <Download className="w-5 h-5" /> Download Photo
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg text-gray-400 text-lg">
              {partnerPhoto ? '🔒 Upload your photo to reveal' : '⏳ Waiting for partner...'}
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
    if (!user) return;
    const journalRef = ref(database, 'journal');
    const unsub = onValue(journalRef, (snap) => {
      const val = snap.val() || {};
      const entriesArray = Object.entries(val).map(([id, entry]) => ({ id, ...entry }));
      entriesArray.sort((a, b) => a.timestamp - b.timestamp);
      setEntries(entriesArray);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  const handleSubmit = async () => {
    if (!newEntry.trim()) return;
    const entry = {
      text: newEntry,
      userId: user.uid,
      author: user.displayName || user.email.split('@')[0],
      timestamp: Date.now()
    };
    
    try {
      await push(ref(database, 'journal'), entry);
      setNewEntry('');
    } catch (error) {
      console.error('Error saving entry:', error);
    }
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
                // Continue from SharedJournal component
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
  const [partnerProfile, setPartnerProfile] = useState(null);
  const [partnerWeather, setPartnerWeather] = useState(null);
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
    if (!user) return;
    const usersRef = ref(database, 'users');
    const unsub = onValue(usersRef, (snap) => {
      const users = snap.val() || {};
      const partner = Object.values(users).find(u => u.uid !== user.uid);
      if (partner) {
        setPartnerProfile(partner);
        if (partner.timezone) {
          navigator.geolocation?.getCurrentPosition(async (pos) => {
            const w = await getWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
            setPartnerWeather(w);
          });
        }
      }
    });
    return () => unsub();
  }, [user]);

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

  const getGenderColor = (gender) => {
    if (gender === 'male') return 'from-blue-400 to-indigo-400';
    if (gender === 'female') return 'from-pink-400 to-rose-400';
    return 'from-purple-400 to-indigo-400';
  };

  const getGenderBg = (gender) => {
    if (gender === 'male') return 'from-blue-50 to-indigo-50';
    if (gender === 'female') return 'from-pink-50 to-rose-50';
    return 'from-purple-50 to-indigo-50';
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="max-w-6xl mx-auto w-full">
        
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 animate-fade-in">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            <span>🌍</span> Our Weather
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`text-center p-6 bg-gradient-to-br ${getGenderBg(formData.gender)} rounded-xl`}>
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
            
            <div className={`text-center p-6 bg-gradient-to-br ${getGenderBg(partnerProfile?.gender)} rounded-xl`}>
              <p className="text-sm font-semibold mb-3">Partner</p>
              {partnerWeather && partnerProfile ? (
                <div>
                  <div className="text-5xl mb-3">{getWeatherEmoji(partnerWeather.code)}</div>
                  <p className="text-4xl font-bold text-gray-800">{partnerWeather.temperature}°C</p>
                  <p className="text-sm text-gray-600 mt-3 font-medium">
                    {getLocalTime(partnerProfile.timezone)} {getTimeEmoji(partnerProfile.timezone)}
                  </p>
                </div>
              ) : (
                <p className="text-gray-400">Waiting for partner...</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="bg-white rounded-2xl shadow-xl p-6 animate-slide-up">
            <h2 className={`text-2xl font-bold mb-6 bg-gradient-to-r ${getGenderColor(partnerProfile?.gender)} bg-clip-text text-transparent`}>
              Partner's Profile
            </h2>
            
            {partnerProfile ? (
              <div className="space-y-4">
                <div className="flex justify-center mb-6">
                  <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${getGenderColor(partnerProfile.gender)} flex items-center justify-center overflow-hidden ring-4 ring-opacity-30`}>
                    {partnerProfile.photoURL ? (
                      <img src={partnerProfile.photoURL} alt="Partner" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl text-white">{partnerProfile.username?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 bg-gradient-to-br ${getGenderBg(partnerProfile.gender)} rounded-lg`}>
                    <p className="text-sm text-gray-500 mb-1">Full Name</p>
                    <p className="font-semibold">{partnerProfile.fullName || 'Not set'}</p>
                  </div>
                  <div className={`p-4 bg-gradient-to-br ${getGenderBg(partnerProfile.gender)} rounded-lg`}>
                    <p className="text-sm text-gray-500 mb-1">Gender</p>
                    <p className="font-semibold capitalize">{partnerProfile.gender || 'Not set'}</p>
                  </div>
                  <div className={`p-4 bg-gradient-to-br ${getGenderBg(partnerProfile.gender)} rounded-lg`}>
                    <p className="text-sm text-gray-500 mb-1">Age</p>
                    <p className="font-semibold">{calculateAge(partnerProfile.birthdate)} years</p>
                  </div>
                  <div className={`p-4 bg-gradient-to-br ${getGenderBg(partnerProfile.gender)} rounded-lg`}>
                    <p className="text-sm text-gray-500 mb-1">Timezone</p>
                    <p className="font-semibold text-xs">{partnerProfile.timezone || 'Not set'}</p>
                  </div>
                </div>
                
                {partnerProfile.interests && (
                  <div className={`p-4 bg-gradient-to-br ${getGenderBg(partnerProfile.gender)} rounded-lg`}>
                    <p className="text-sm text-gray-500 mb-2 font-medium">Interests & Hobbies</p>
                    <p className="text-gray-700">{partnerProfile.interests}</p>
                  </div>
                )}
                
                {(partnerProfile.facebook || partnerProfile.instagram || partnerProfile.tiktok) && (
                  <div>
                    <p className="text-sm text-gray-500 mb-3 font-medium">Social Links</p>
                    <div className="flex gap-3 flex-wrap">
                      {partnerProfile.facebook && (
                        <a href={partnerProfile.facebook} target="_blank" rel="noopener noreferrer"
                          className="px-5 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all hover:scale-105">
                          Facebook
                        </a>
                      )}
                      {partnerProfile.instagram && (
                        <a href={partnerProfile.instagram} target="_blank" rel="noopener noreferrer"
                          className="px-5 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-all hover:scale-105">
                          Instagram
                        </a>
                      )}
                      {partnerProfile.tiktok && (
                        <a href={partnerProfile.tiktok} target="_blank" rel="noopener noreferrer"
                          className="px-5 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all hover:scale-105">
                          TikTok
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16">
                <User className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-400 text-lg">Waiting for partner...</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-bold bg-gradient-to-r ${getGenderColor(formData.gender)} bg-clip-text text-transparent`}>
                Your Profile
              </h2>
              <button onClick={() => setEditing(!editing)}
                className={`px-6 py-2 bg-gradient-to-r ${getGenderColor(formData.gender)} text-white rounded-lg hover:opacity-90 transition-all hover:scale-105`}>
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
                  className={`w-full py-3 bg-gradient-to-r ${getGenderColor(formData.gender)} text-white rounded-lg hover:opacity-90 font-semibold transition-all hover:scale-105`}>
                  Save Changes
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center mb-6">
                  <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${getGenderColor(formData.gender)} flex items-center justify-center overflow-hidden ring-4 ring-opacity-30`}>
                    {userProfile?.photoURL ? (
                      <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl text-white">{user.email[0].toUpperCase()}</span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 bg-gradient-to-br ${getGenderBg(formData.gender)} rounded-lg`}>
                    <p className="text-sm text-gray-500 mb-1">Full Name</p>
                    <p className="font-semibold">{formData.fullName || 'Not set'}</p>
                  </div>
                  <div className={`p-4 bg-gradient-to-br ${getGenderBg(formData.gender)} rounded-lg`}>
                    <p className="text-sm text-gray-500 mb-1">Gender</p>
                    <p className="font-semibold capitalize">{formData.gender || 'Not set'}</p>
                  </div>
                  <div className={`p-4 bg-gradient-to-br ${getGenderBg(formData.gender)} rounded-lg`}>
                    <p className="text-sm text-gray-500 mb-1">Age</p>
                    <p className="font-semibold">{calculateAge(formData.birthdate)} years</p>
                  </div>
                  <div className={`p-4 bg-gradient-to-br ${getGenderBg(formData.gender)} rounded-lg`}>
                    <p className="text-sm text-gray-500 mb-1">Timezone</p>
                    <p className="font-semibold text-xs">{formData.timezone}</p>
                  </div>
                </div>
                
                {formData.interests && (
                  <div className={`p-4 bg-gradient-to-br ${getGenderBg(formData.gender)} rounded-lg`}>
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
    </div>
  );
};
// Main App Component
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
    if (darkMode) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  }, [darkMode]);

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
    if (!user) return;
    const messagesRef = query(ref(database, 'messages'), orderByChild('timestamp'));
    const unsub = onValue(messagesRef, (snap) => {
      const val = snap.val() || {};
      const messagesArray = Object.entries(val).map(([id, msg]) => ({ id, ...msg }));
      messagesArray.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setMessages(messagesArray);
    });
    return () => unsub();
  }, [user]);

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
      } else {
        const { user: signedUser, profile } = await signInWithEmail(email, password);
        setUser(signedUser);
        if (profile) setUserProfile(profile);
      }
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
      text: inputText,
      sender: userProfile.username || user.email.split('@')[0],
      userId: user.uid,
      timestamp: Date.now(),
      type: 'text',
      delivered: false,
      seen: false,
      reactions: {}
    };
    
    try {
      await push(ref(database, 'messages'), newMessage);
      setInputText('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const sendHeartbeat = async () => {
    if (!user) return;
    const newMessage = {
      text: '💗',
      sender: userProfile.username || user.email.split('@')[0],
      userId: user.uid,
      timestamp: Date.now(),
      type: 'heartbeat',
      delivered: false,
      seen: false,
      reactions: {}
    };
    
    try {
      await push(ref(database, 'messages'), newMessage);
    } catch (error) {
      console.error('Error sending heartbeat:', error);
    }
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
    try {
      const messageRef = ref(database, `messages/${messageId}/reactions/${user.uid}`);
      await set(messageRef, emoji);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
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

  const handlePhotoUpdate = async (photoURL) => {
    const path = `profilePhotos/${user.uid}/${Date.now()}.jpg`;
    const downloadUrl = await uploadDataUrlImage(path, photoURL);
    setUserProfile({ ...userProfile, photoURL: downloadUrl });
    if (user?.uid) {
      await set(ref(database, `users/${user.uid}/photoURL`), downloadUrl);
      try {
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, { photoURL: downloadUrl });
        }
      } catch (e) {
        console.error('Error updating auth profile:', e);
      }
    }
  };

  const handleProfileUpdate = async (updatedProfile) => {
    const merged = { ...userProfile, ...updatedProfile };
    setUserProfile(merged);
    if (user?.uid) {
      await update(ref(database, `users/${user.uid}`), merged);
      try {
        if (updatedProfile.username && auth.currentUser) {
          await updateProfile(auth.currentUser, { displayName: updatedProfile.username });
        }
      } catch (e) {
        console.error('Error updating auth profile:', e);
      }
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
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full animate-slide-up">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Heart className="w-20 h-20 text-pink-500 animate-pulse" />
            </div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              Couple Chat
            </h1>
            <p className="text-gray-600">Connect with your loved one ❤️</p>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {authError}
            </div>
          )}

          <div className="space-y-4">
            {isSignUp && (
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            />
            <button
              onClick={handleAuth}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 transition-all font-semibold text-lg hover:scale-105"
            >
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setAuthError('');
              }}
              className="w-full text-pink-500 hover:text-pink-600 transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'canvas', label: 'Canvas', icon: Palette },
    { id: 'photos', label: 'Photos', icon: Camera },
    { id: 'journal', label: 'Journal', icon: BookHeart },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-pink-50 to-purple-50'} flex flex-col`}>
      {/* Header */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              >
                {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <Heart className="w-8 h-8 text-pink-500 animate-pulse" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                Couple Chat
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-100 text-gray-700'} hover:scale-110 transition-all`}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setShowProfileModal(true)}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center overflow-hidden ring-2 ring-pink-200 hover:scale-110 transition-all"
              >
                {userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold">{user.email[0].toUpperCase()}</span>
                )}
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all hover:scale-110"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2 mt-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white scale-105'
                      : darkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile Navigation */}
          {showMobileMenu && (
            <div className="md:hidden flex flex-col gap-2 mt-4 animate-slide-down">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setShowMobileMenu(false);
                    }}
                    className={`flex items-center gap-3 px-6 py-3 rounded-lg transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                        : darkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full">
            <div className={`flex-1 overflow-y-auto p-4 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-pink-50 to-purple-50'}`}>
              <div className="max-w-4xl mx-auto space-y-4">
                {messages.map((msg) => {
                  const isOwn = msg.userId === user?.uid;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-slide-up`}
                      onMouseDown={(e) => handleMessagePress(msg.id, e)}
                      onMouseUp={handleMessageRelease}
                      onTouchStart={(e) => handleMessagePress(msg.id, e)}
                      onTouchEnd={handleMessageRelease}
                    >
                      <div
                        className={`max-w-xs md:max-w-md rounded-2xl px-5 py-3 shadow-lg transform transition-all hover:scale-105 ${
                          msg.type === 'heartbeat'
                            ? 'bg-gradient-to-r from-red-400 to-pink-400 text-6xl'
                            : isOwn
                            ? darkMode
                              ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white'
                              : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                            : darkMode
                            ? 'bg-gray-700 text-white'
                            : 'bg-white text-gray-800'
                        }`}
                      >
                        {msg.type !== 'heartbeat' && (
                          <div className={`text-xs font-semibold mb-1 ${isOwn ? 'text-pink-100' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {msg.sender}
                          </div>
                        )}
                        <div className={msg.type === 'heartbeat' ? 'text-center animate-pulse' : ''}>
                          {msg.text}
                        </div>
                        <div className={`flex items-center justify-between mt-2 gap-2 text-xs ${isOwn ? 'text-pink-100' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          <span>{formatTime(msg.timestamp)}</span>
                          {getMessageStatus(msg)}
                        </div>
                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div className="flex gap-1 mt-2">
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
                    <div className={`rounded-2xl px-5 py-3 ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow-lg`}>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Chat Input */}
            <div className={`p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t`}>
              <div className="max-w-4xl mx-auto flex gap-2 items-center">
                <button
                  onClick={sendHeartbeat}
                  className="p-3 rounded-full bg-gradient-to-r from-red-400 to-pink-400 text-white hover:from-red-500 hover:to-pink-500 transition-all hover:scale-110"
                >
                  <Heart className="w-6 h-6" />
                </button>
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className={`w-full px-5 py-3 rounded-full pr-12 ${
                      darkMode
                        ? 'bg-gray-700 text-white border-gray-600'
                        : 'bg-gray-100 text-gray-800 border-gray-300'
                    } border-2 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all`}
                  />
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                  {showEmojiPicker && (
                    <EmojiPicker
                      onSelect={(emoji) => setInputText(inputText + emoji)}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  )}
                </div>
                <button
                  onClick={handleSendMessage}
                  className="p-3 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 transition-all hover:scale-110"
                >
                  <Send className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'canvas' && <CoupleCanvas user={user} darkMode={darkMode} />}
        {activeTab === 'photos' && <DailyPhotos user={user} darkMode={darkMode} />}
        {activeTab === 'journal' && <SharedJournal user={user} darkMode={darkMode} />}
        {activeTab === 'profile' && (
          <CoupleProfile 
            user={user} 
            userProfile={userProfile} 
            onProfileUpdate={handleProfileUpdate}
          />
        )}
      </div>

      {/* Modals */}
      {showProfileModal && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfileModal(false)}
          currentPhotoURL={userProfile?.photoURL}
          onPhotoUpdate={handlePhotoUpdate}
        />
      )}

      {showReactionPicker && (
        <ReactionPicker
          onSelect={(emoji) => addReaction(showReactionPicker.messageId, emoji)}
          onClose={() => setShowReactionPicker(null)}
          position={showReactionPicker}
        />
      )}

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes bounce-in {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
        .animate-bounce-in {
          animation: bounce-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default App;