import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

const Toast = ({ id, type, message, onClose }) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />
  };

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  };

  return (
    <div 
      className={`${colors[type]} text-white rounded-lg shadow-lg p-4 mb-3 flex items-center gap-3 animate-slide-in-right min-w-[300px] max-w-md`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex-shrink-0">
        {icons[type]}
      </div>
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 hover:bg-white hover:bg-opacity-20 rounded p-1 transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // 1. Define `removeToast` FIRST.
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // 2. Define `addToast` SECOND, so it can safely reference `removeToast`.
  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]); // The dependency is now valid.

  const toast = {
    success: (message, duration) => addToast(message, 'success', duration),
    error: (message, duration) => addToast(message, 'error', duration),
    warning: (message, duration) => addToast(message, 'warning', duration),
    info: (message, duration) => addToast(message, 'info', duration)
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div 
        className="fixed top-4 right-4 z-50 pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="pointer-events-auto">
          {toasts.map(t => (
            <Toast
              key={t.id}
              id={t.id}
              type={t.type}
              message={t.message}
              onClose={removeToast}
            />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
};

const ToastExports = { ToastProvider, useToast };
export default ToastExports;