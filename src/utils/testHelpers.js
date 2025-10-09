// File: utils/testHelpers.js

import { render } from '@testing-library/react';
import { ToastProvider } from './Toast';
import React from 'react';

/**
 * Custom render function that includes providers
 */
export const renderWithProviders = (ui, options = {}) => {
  const Wrapper = ({ children }) => (
    <ToastProvider>
      {children}
    </ToastProvider>
  );

  return render(ui, { wrapper: Wrapper, ...options });
};

/**
 * Mock Firebase database
 */
export const createMockDatabase = () => {
  const data = {};
  const listeners = {};

  return {
    ref: (path) => ({
      path,
      on: (eventType, callback) => {
        if (!listeners[path]) listeners[path] = [];
        listeners[path].push({ eventType, callback });
        
        // Immediately call with current data
        callback({ val: () => data[path] });
      },
      off: (eventType, callback) => {
        if (listeners[path]) {
          listeners[path] = listeners[path].filter(
            l => l.callback !== callback
          );
        }
      },
      set: async (value) => {
        data[path] = value;
        // Trigger listeners
        if (listeners[path]) {
          listeners[path].forEach(l => {
            l.callback({ val: () => value });
          });
        }
      },
      push: () => {
        const id = `mock-id-${Date.now()}`;
        const newPath = `${path}/${id}`;
        return {
          key: id,
          path: newPath,
          set: async (value) => {
            data[newPath] = value;
          }
        };
      },
      remove: async () => {
        delete data[path];
      }
    }),
    getData: () => data,
    getListeners: () => listeners
  };
};

/**
 * Mock user session
 */
export const createMockUser = (overrides = {}) => ({
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  ...overrides
});

/**
 * Wait for async updates
 */
export const waitForAsync = (ms = 0) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Generate test data
 */
export const generateTestMessages = (count = 10) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${i}`,
    text: `Test message ${i}`,
    userId: i % 2 === 0 ? 'user1' : 'user2',
    timestamp: Date.now() - (count - i) * 60000
  }));
};

export const generateTestPhotos = (count = 5) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `photo-${i}`,
    imageData: `data:image/jpeg;base64,${btoa('test-image')}`,
    userId: i % 2 === 0 ? 'user1' : 'user2',
    userName: i % 2 === 0 ? 'User One' : 'User Two',
    timestamp: Date.now() - (count - i) * 3600000,
    reactions: {}
  }));
};

export default {
  renderWithProviders,
  createMockDatabase,
  createMockUser,
  waitForAsync,
  generateTestMessages,
  generateTestPhotos
};