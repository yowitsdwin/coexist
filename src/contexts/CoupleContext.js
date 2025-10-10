import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { ref, get } from 'firebase/database';
import { database } from '../firebase';
import { LoadingScreen } from '../components/Loading';

const CoupleContext = createContext(null);

export const useCouple = () => {
  const context = useContext(CoupleContext);
  if (!context) {
    throw new Error('useCouple must be used within a CoupleProvider');
  }
  return context;
};

export const CoupleProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [coupleData, setCoupleData] = useState({
    coupleId: null,
    partnerId: null,
    partner: null,
    loading: true,
  });

  useEffect(() => {
    const fetchCoupleInfo = async () => {
      if (!currentUser || !currentUser.coupleId) {
        setCoupleData({ loading: false, coupleId: null, partnerId: null, partner: null });
        return;
      }

      try {
        const coupleId = currentUser.coupleId;
        const coupleRef = ref(database, `couples/${coupleId}`);
        const coupleSnapshot = await get(coupleRef);

        if (!coupleSnapshot.exists()) {
          throw new Error("Couple data not found.");
        }

        const couple = coupleSnapshot.val();
        const partnerId = couple.member1 === currentUser.uid ? couple.member2 : couple.member1;

        const partnerRef = ref(database, `users/${partnerId}`);
        const partnerSnapshot = await get(partnerRef);
        const partner = partnerSnapshot.exists() ? partnerSnapshot.val() : null;

        setCoupleData({ coupleId, partnerId, partner, loading: false });

      } catch (error) {
        console.error("Failed to fetch couple data:", error);
        setCoupleData({ loading: false, coupleId: null, partnerId: null, partner: null });
      }
    };

    fetchCoupleInfo();
  }, [currentUser]);

  // If loading, show a loading screen
  if (coupleData.loading) {
    return <LoadingScreen message="Finding your partner..." />;
  }

  // If the user is logged in but not paired, show a waiting screen
  if (currentUser && !coupleData.coupleId) {
    return <WaitingForPartner />;
  }
  
  return (
    <CoupleContext.Provider value={coupleData}>
      {children}
    </CoupleContext.Provider>
  );
};

// A simple component to show when a user isn't paired yet
const WaitingForPartner = () => (
  <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center text-center p-4">
    <div>
      <h1 className="text-3xl font-bold text-gray-800">Waiting for Your Partner</h1>
      <p className="text-gray-600 mt-2">
        Your account isn't linked with a partner yet.
        <br />
        Once you're both set up, you'll see the app here!
      </p>
    </div>
  </div>
);