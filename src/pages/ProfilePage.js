import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCouple } from '../contexts/CoupleContext';
import ProfileCard from '../components/ProfileCard';
import { Heart } from 'lucide-react';
import { LoadingScreen } from '../components/Loading';

const ProfilePage = ({ darkMode }) => {
  const { currentUser } = useAuth();
  const { partner } = useCouple();

  if (!currentUser || !partner) {
    return <LoadingScreen darkMode={darkMode} message="Finding your other half..." />;
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-gray-900 to-slate-900' 
        : 'bg-gradient-to-br from-gray-50 via-pink-50 to-purple-50'
    }`}>
      <div className="text-center pt-12 pb-8 px-4">
        <h1 className={`text-4xl md:text-5xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Our Profiles
        </h1>
        <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Our journey, side-by-side.
        </p>
      </div>

      {/* Profile Cards Container */}
      <div className="px-4 pb-12">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8 md:gap-0 relative">
          
          {/* Your Profile Card */}
          <div className="flex-1 w-full flex justify-center md:justify-end md:pr-4">
            <ProfileCard user={currentUser} isOwnProfile={true} darkMode={darkMode} />
          </div>
          
          {/* Heart icon separator */}
          <div className="text-pink-400/50 my-2 md:my-0 md:absolute md:left-1/2 md:-translate-x-1/2">
            <Heart className="w-10 h-10 md:w-12 md:h-12 animate-pulse" />
          </div>

          {/* Partner's Profile Card */}
          <div className="flex-1 w-full flex justify-center md:justify-start md:pl-4">
            <ProfileCard user={partner} isOwnProfile={false} darkMode={darkMode} />
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProfilePage;