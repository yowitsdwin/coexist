import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './utils/Toast';
import { CoupleProvider } from './contexts/CoupleContext';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration'; // 1. IMPORT THE FILE

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
serviceWorkerRegistration.register(); // 2. CALL THE REGISTER FUNCTION