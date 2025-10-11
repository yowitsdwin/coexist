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
    return <LoadingScreen darkMode={darkMode} message="Loading profiles..." />;
  }

  return (
    <div className={`min-h-screen ${
      darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-pink-50 to-purple-50'
    } py-8 px-4`}>
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h1 className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Our Profiles</h1>
          <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Our journey, side-by-side.</p>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4">
          
          <ProfileCard user={currentUser} isOwnProfile={true} darkMode={darkMode} />
          
          <div className="text-pink-400/50 my-4 md:my-0">
            <Heart className="w-10 h-10 animate-pulse" />
          </div>
          
          <ProfileCard user={partner} isOwnProfile={false} darkMode={darkMode} />

        </div>
      </div>
    </div>
  );
};

export default ProfilePage;