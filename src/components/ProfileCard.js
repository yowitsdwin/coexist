import React, { useState } from 'react';
import { User, Save, Edit2, X, MapPin, Calendar, Facebook, Instagram, Twitter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../utils/Toast';
import { LoadingSpinner } from './Loading';
import { calculateAge, getLocalTime, getTimeEmoji } from '../utils/helpers';

const ProfileCard = ({ user, isOwnProfile, darkMode }) => {
  const { updateUserProfile } = useAuth();
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    birthdate: user?.birthdate || '',
    location: user?.location || '',
    bio: user?.bio || '',
    // Add socials to the form state
    socials: {
      facebook: user?.socials?.facebook || '',
      instagram: user?.socials?.instagram || '',
      twitter: user?.socials?.twitter || '',
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (['facebook', 'instagram', 'twitter'].includes(name)) {
      setFormData(prev => ({
        ...prev,
        socials: { ...prev.socials, [name]: value }
      }));
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

  // Main Display View
  const DisplayView = () => (
    <>
      {/* Banner */}
      <div className="h-24 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/50 dark:to-purple-900/50 rounded-t-2xl relative">
        {isOwnProfile && (
          <button onClick={() => setIsEditing(true)} className="absolute top-3 right-3 p-2 bg-white/70 dark:bg-gray-900/70 rounded-full backdrop-blur-sm hover:scale-110 transition-transform">
            <Edit2 className="w-4 h-4 text-gray-700 dark:text-gray-200" />
          </button>
        )}
      </div>
      
      {/* Profile Picture & Name */}
      <div className="px-6 -mt-12">
        <div className="w-24 h-24 mx-auto rounded-full border-4 border-white dark:border-gray-800 bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center">
          <User className="w-12 h-12 text-white" />
        </div>
        <div className="text-center mt-4">
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{user?.displayName}</h1>
          <p className={`italic text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{user?.bio || 'No bio yet.'}</p>
        </div>
      </div>
      
      {/* Info Stats */}
      <div className="p-6 grid grid-cols-3 gap-2 text-center text-sm">
        <InfoItem label="Age" value={calculateAge(user?.birthdate) || '--'} />
        <InfoItem label="Location" value={user?.location || '--'} />
        <InfoItem label="Local Time" value={`${getLocalTime(user?.timezone)} ${getTimeEmoji(user?.timezone)}`} />
      </div>

      {/* Social Links Section */}
      <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700/50 pt-4">
        <div className="flex justify-center items-center gap-4">
          <SocialLink platform="facebook" url={user?.socials?.facebook} />
          <SocialLink platform="instagram" url={user?.socials?.instagram} />
          <SocialLink platform="twitter" url={user?.socials?.twitter} />
        </div>
      </div>
    </>
  );

  // Edit Form View
  const EditView = () => (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
       <h2 className={`text-xl font-bold text-center mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Edit Profile</h2>
       <FormInput name="displayName" label="Display Name" value={formData.displayName} onChange={handleChange} disabled={loading} Icon={User} />
       <FormInput name="birthdate" type="date" label="Birthdate" value={formData.birthdate} onChange={handleChange} disabled={loading} Icon={Calendar} />
       <FormInput name="location" label="Location" value={formData.location} onChange={handleChange} placeholder="City, Country" disabled={loading} Icon={MapPin} />
       <textarea name="bio" value={formData.bio} onChange={handleChange} rows="2" placeholder="Your bio..." className={`w-full p-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-pink-500 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50'}`} disabled={loading} />
       
       <h3 className={`text-md font-semibold pt-2 ${darkMode ? 'text-white' : 'text-gray-700'}`}>Social Links</h3>
       <FormInput name="facebook" placeholder="https://facebook.com/..." value={formData.socials.facebook} onChange={handleChange} disabled={loading} Icon={Facebook} />
       <FormInput name="instagram" placeholder="https://instagram.com/..." value={formData.socials.instagram} onChange={handleChange} disabled={loading} Icon={Instagram} />
       <FormInput name="twitter" placeholder="https://twitter.com/..." value={formData.socials.twitter} onChange={handleChange} disabled={loading} Icon={Twitter} />

       <div className="flex gap-2 pt-2">
        <button type="button" onClick={() => setIsEditing(false)} className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-600' : 'bg-gray-200'} hover:bg-gray-300`}>
          <X className="w-4 h-4" /> Cancel
        </button>
        <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600">
          {loading ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />} Save Changes
        </button>
       </div>
    </form>
  );

  return (
    <div className={`w-full max-w-sm overflow-hidden rounded-2xl shadow-xl transition-all duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
      {isOwnProfile && isEditing ? <EditView /> : <DisplayView />}
    </div>
  );
};

// Sub-components for cleaner JSX
const InfoItem = ({ label, value }) => (
  <div>
    <p className="font-bold text-lg text-gray-800 dark:text-white">{value}</p>
    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
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
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-500 transition-colors">
      {icons[platform]}
    </a>
  );
};

const FormInput = ({ name, label, Icon, ...props }) => {
  const darkMode = document.body.classList.contains('dark'); // A simple way to check dark mode for styling
  return (
    <div>
      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{label}</label>
      <div className="relative">
        <Icon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
        <input className={`w-full pl-9 pr-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-pink-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} {...props} name={name} />
      </div>
    </div>
  );
};

export default ProfileCard;