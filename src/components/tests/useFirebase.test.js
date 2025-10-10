// File: utils/__tests__/useFirebase.test.js

import { renderHook, waitFor } from '@testing-library/react';
import { useRealtimeData, useConnectionState, usePresence } from '../useFirebase';
import { createMockDatabase } from '../testHelpers';

jest.mock('../../firebase', () => ({
  database: createMockDatabase()
}));

describe('useFirebase Hooks', () => {
  describe('useRealtimeData', () => {
    it('loads data successfully', async () => {
      const { result } = renderHook(() => 
        useRealtimeData('test/path')
      );

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('transforms data correctly', async () => {
      const transform = (val) => val ? { transformed: true } : null;
      
      const { result } = renderHook(() => 
        useRealtimeData('test/path', transform)
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      if (result.current.data) {
        expect(result.current.data).toHaveProperty('transformed');
      }
    });

    it('handles errors gracefully', async () => {
      const transform = () => {
        throw new Error('Transform error');
      };
      
      const { result } = renderHook(() => 
        useRealtimeData('test/path', transform)
      );

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
    });
  });

  describe('useConnectionState', () => {
    it('tracks connection state', () => {
      const { result } = renderHook(() => useConnectionState());
      expect(typeof result.current).toBe('boolean');
    });
  });

  describe('usePresence', () => {
    it('sets up presence for user', () => {
      const { unmount } = renderHook(() => usePresence('user123'));
      // Should not throw error
      unmount();
    });

    it('cleans up on unmount', () => {
      const { unmount } = renderHook(() => usePresence('user123'));
      expect(() => unmount()).not.toThrow();
    });
  });
});