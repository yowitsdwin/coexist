// File: index.js

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './utils/Toast';
import reportWebVitals from './reportWebVitals';
import { CoupleProvider } from './contexts/CoupleContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router>
      <ToastProvider>
        <AuthProvider>
          <CoupleProvider>
            <App />
          </CoupleProvider>
        </AuthProvider>
      </ToastProvider>
    </Router>
  </React.StrictMode>
);

reportWebVitals();