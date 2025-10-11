import React, { useState } from 'react';
import { User, Save, Edit2, X, MapPin, Calendar, Facebook, Instagram, Twitter, Heart, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../utils/Toast';
import { LoadingSpinner } from './Loading';
import { calculateAge, getLocalTime, getTimeEmoji } from '../utils/helpers';
import { ProfileImageUploader } from './ProfileImageUploader';

const ProfileCard = ({ user, isOwnProfile, darkMode }) => {
  const { updateUserProfile } = useAuth();
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    birthdate: user?.birthdate || '',
    location: user?.location || '',
    bio: user?.bio || '',
    socials: {
      facebook: user?.socials?.facebook || '',
      instagram: user?.socials?.instagram || '',
      twitter: user?.socials?.twitter || '',
    }
  });

  const handleImageUpload = async (cloudinaryUrl) => {
    setLoading(true);
    try {
      await updateUserProfile({ photoURL: cloudinaryUrl });
      toast.success('Profile picture updated!');
      setShowUploader(false);
    } catch (error) {
      toast.error('Failed to update profile picture.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (['facebook', 'instagram', 'twitter'].includes(name)) {
      setFormData(prev => ({ ...prev, socials: { ...prev.socials, [name]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateUserProfile(formData);
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const age = calculateAge(user?.birthdate);
  const localTime = getLocalTime(user?.timezone);
  const timeEmoji = getTimeEmoji(user?.timezone);

  // Main Display View
  const DisplayView = () => (
    <>
      {showUploader && isOwnProfile && (
        <ProfileImageUploader onUpload={handleImageUpload} onCancel={() => setShowUploader(false)} darkMode={darkMode} />
      )}
      
      {/* BANNER */}
      <div className="relative h-28 md:h-32 overflow-hidden rounded-t-3xl">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-400/70 via-pink-400/70 to-rose-400/70 dark:from-purple-900/80 dark:via-pink-900/80 dark:to-rose-900/80">
          <Heart className="absolute top-4 left-8 w-6 h-6 text-white/20 dark:text-pink-300/10 animate-pulse" fill="currentColor" />
          <Sparkles className="absolute top-12 right-20 w-5 h-5 text-white/20 dark:text-purple-300/10 animate-pulse" style={{ animationDelay: '1s' }} />
          <Heart className="absolute bottom-6 left-16 w-5 h-5 text-white/20 dark:text-pink-400/10 animate-pulse" fill="currentColor" style={{ animationDelay: '1.5s' }} />
        </div>
        {isOwnProfile && (
          <button onClick={() => setIsEditing(true)} className="absolute top-4 right-4 p-2 rounded-full backdrop-blur-md transition-all hover:scale-110 shadow-lg bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-700/80 text-pink-600 dark:text-pink-300">
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* MAIN CONTENT AREA */}
      <div className="bg-slate-700 dark:bg-gray-800 rounded-b-3xl -mt-4 pt-2">
        {/* PROFILE PICTURE & NAME */}
        <div className="px-6 -mt-14">
          <button className="w-24 h-24 md:w-28 md:h-28 mx-auto rounded-full border-4 border-slate-700 dark:border-gray-800 overflow-hidden group relative disabled:cursor-default shadow-2xl transition-all"
            onClick={() => isOwnProfile && setShowUploader(true)} disabled={!isOwnProfile || loading}>
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-pink-500 via-rose-500 to-purple-500 flex items-center justify-center">
                <User className="w-12 h-12 text-white" />
              </div>
            )}
            {isOwnProfile && !loading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Edit2 className="w-6 h-6 text-white" />
              </div>
            )}
            {loading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <LoadingSpinner size="sm" />
              </div>
            )}
          </button>
          
          <div className="text-center mt-4 pb-4">
            <h1 className="text-2xl font-bold tracking-tight text-white">{user?.displayName}</h1>
            <p className="italic text-sm mt-2 leading-relaxed text-gray-400">{user?.bio || 'No bio yet.'}</p>
          </div>
        </div>
        
        {/* INFO STATS */}
        <div className="p-6 border-t border-slate-600/50 dark:border-gray-700/50">
          <div className="grid grid-cols-3 gap-3">
            <InfoItem label="Age" value={age || '--'} />
            <InfoItem label="Location" value={user?.location || '--'} />
            <InfoItem label="Local Time" value={<>{localTime} <span className="text-lg">{timeEmoji}</span></>} />
          </div>
        </div>

        {/* SOCIAL LINKS */}
        <div className="px-6 pb-6 pt-2">
          <div className="flex justify-center items-center gap-4">
            <SocialLink platform="facebook" url={user?.socials?.facebook} />
            <SocialLink platform="instagram" url={user?.socials?.instagram} />
            <SocialLink platform="twitter" url={user?.socials?.twitter} />
          </div>
        </div>
      </div>
    </>
  );

  // Edit Form View
  const EditView = () => (
    <div className="p-6 space-y-4 bg-gray-50 dark:bg-gray-900 rounded-3xl">
       <div className="text-center mb-6">
         <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Edit Profile</h2>
         <Heart className={`w-5 h-5 mx-auto mt-2 ${darkMode ? 'text-pink-400' : 'text-pink-500'}`} fill="currentColor" />
       </div>
       
       <FormInput name="displayName" label="Display Name" value={formData.displayName} onChange={handleChange} disabled={loading} Icon={User} darkMode={darkMode} />
       <FormInput name="birthdate" type="date" label="Birthdate" value={formData.birthdate} onChange={handleChange} disabled={loading} Icon={Calendar} darkMode={darkMode} />
       <FormInput name="location" label="Location" value={formData.location} onChange={handleChange} placeholder="City, Country" disabled={loading} Icon={MapPin} darkMode={darkMode} />
       <textarea name="bio" value={formData.bio} onChange={handleChange} rows="3" placeholder="Share something about yourself..." className={`w-full p-3 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent ${darkMode ? 'bg-gray-700/50 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} disabled={loading} />
       
       <div className="pt-2">
         <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
           <Sparkles className="w-4 h-4" />Social Links
         </h3>
         <div className="space-y-3">
           <FormInput name="facebook" placeholder="https://facebook.com/..." value={formData.socials.facebook} onChange={handleChange} disabled={loading} Icon={Facebook} darkMode={darkMode} />
           <FormInput name="instagram" placeholder="https://instagram.com/..." value={formData.socials.instagram} onChange={handleChange} disabled={loading} Icon={Instagram} darkMode={darkMode} />
           <FormInput name="twitter" placeholder="https://twitter.com/..." value={formData.socials.twitter} onChange={handleChange} disabled={loading} Icon={Twitter} darkMode={darkMode} />
         </div>
       </div>

       <div className="flex gap-3 pt-4">
        <button type="button" onClick={() => setIsEditing(false)} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`} disabled={loading}>
          <X className="w-4 h-4" /> Cancel
        </button>
        <button type="submit" onClick={handleSubmit} disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 transition-all shadow-lg">
          {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save className="w-4 h-4" /> Save</>}
        </button>
       </div>
    </div>
  );

  return (
    <div className="w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl transition-all duration-300">
      {isOwnProfile && isEditing ? <EditView /> : <DisplayView />}
    </div>
  );
};

const InfoItem = ({ label, value }) => (
  <div className="p-3 rounded-xl text-center transition-all bg-slate-600/30 dark:bg-gray-700/40 hover:bg-slate-600/50 dark:hover:bg-gray-700/60">
    <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-gray-400">{label}</p>
    <div className="font-semibold text-white text-lg flex items-center justify-center gap-1">{value}</div>
  </div>
);

const SocialLink = ({ platform, url }) => {
  if (!url) return null;
  const icons = {
    facebook: <Facebook className="w-5 h-5" />,
    instagram: <Instagram className="w-5 h-5" />,
    twitter: <Twitter className="w-5 h-5" />,
  };
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-400 transition-all hover:scale-125">
      {icons[platform]}
    </a>
  );
};

const FormInput = ({ name, label, Icon, darkMode, ...props }) => {
  return (
    <div>
      {label && (
        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{label}</label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400`} />
        )}
        <input className={`w-full ${Icon ? 'pl-10' : 'pl-3'} pr-3 py-3 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent ${darkMode ? 'bg-gray-700/50 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} {...props} name={name} />
      </div>
    </div>
  );
};

export default ProfileCard;