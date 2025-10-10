// File: pages/AuthPage.js

import React, { useState } from 'react';
import Login from '../components/Login';
import Signup from '../components/Signup';

const AuthPage = ({ darkMode }) => {
  const [showLogin, setShowLogin] = useState(true);

  return showLogin ? (
    <Login onSwitchToSignup={() => setShowLogin(false)} darkMode={darkMode} />
  ) : (
    <Signup onSwitchToLogin={() => setShowLogin(true)} darkMode={darkMode} />
  );
};

export default AuthPage;