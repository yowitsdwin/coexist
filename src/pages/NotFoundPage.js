// File: pages/NotFoundPage.js

import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

const NotFoundPage = ({ darkMode }) => {
  return (
    <div className={`min-h-screen flex items-center justify-center ${
      darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-pink-50 to-purple-50'
    }`}>
      <div className="text-center px-4">
        <h1 className={`text-9xl font-bold mb-4 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent`}>
          404
        </h1>
        <h2 className={`text-3xl font-bold mb-4 ${
          darkMode ? 'text-white' : 'text-gray-800'
        }`}>
          Page Not Found
        </h2>
        <p className={`text-lg mb-8 ${
          darkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Oops! The page you're looking for doesn't exist.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/home"
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${
              darkMode 
                ? 'bg-gray-700 text-white hover:bg-gray-600' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;