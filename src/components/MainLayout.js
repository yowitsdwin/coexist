// File: components/MainLayout.js

import React from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';

const MainLayout = ({ darkMode, onToggleDarkMode }) => {
  return (
    <div className={darkMode ? 'dark' : ''}>
      <Navigation darkMode={darkMode} onToggleDarkMode={onToggleDarkMode} />
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;