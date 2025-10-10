// File: contexts/__tests__/AuthContext.test.js

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { createMockUser } from '../../utils/testHelpers';

jest.mock('../../firebase', () => ({
  auth: {
    currentUser: null
  },
  database: {}
}));

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback(null);
    return jest.fn();
  }),
  updateProfile: jest.fn()
}));

describe('AuthContext', () => {
  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

  it('provides auth context', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current).toBeDefined();
  });

  it('initializes with null user', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.currentUser).toBeNull();
  });

  it('throws error when used outside provider', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.error).toBeDefined();
  });
});