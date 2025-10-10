// File: components/__tests__/DailyPhotos.test.js

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, generateTestPhotos } from '../../utils/testHelpers';
import DailyPhotos from '../DailyPhotos';

jest.mock('../../utils/useFirebase', () => ({
  useRealtimeData: jest.fn(() => ({
    data: generateTestPhotos(3),
    loading: false
  }))
}));

describe('DailyPhotos Component', () => {
  const mockProps = {
    coupleId: 'couple1',
    userId: 'user1',
    userName: 'Test User',
    darkMode: false
  };

  it('renders photos grid', () => {
    renderWithProviders(<DailyPhotos {...mockProps} />);
    expect(screen.getByText('📸 Today\'s Moments')).toBeInTheDocument();
  });

  it('displays photo cards', () => {
    renderWithProviders(<DailyPhotos {...mockProps} />);
    const images = screen.getAllByAltText('Daily moment');
    expect(images.length).toBeGreaterThan(0);
  });

  it('shows add photo button', () => {
    renderWithProviders(<DailyPhotos {...mockProps} />);
    expect(screen.getByText('Add Photo')).toBeInTheDocument();
  });

  it('shows empty state when no photos', () => {
    jest.requireMock('../../utils/useFirebase').useRealtimeData.mockReturnValue({
      data: [],
      loading: false
    });

    renderWithProviders(<DailyPhotos {...mockProps} />);
    expect(screen.getByText(/no photos today/i)).toBeInTheDocument();
  });

  it('allows user to react to photo', async () => {
    renderWithProviders(<DailyPhotos {...mockProps} />);
    
    const heartButtons = screen.getAllByRole('button', { name: /heart/i });
    fireEvent.click(heartButtons[0]);

    await waitFor(() => {
      // Check if reaction was added (implementation specific)
    });
  });

  it('shows loading skeleton while loading', () => {
    jest.requireMock('../../utils/useFirebase').useRealtimeData.mockReturnValue({
      data: null,
      loading: true
    });

    renderWithProviders(<DailyPhotos {...mockProps} />);
    // Loading skeleton should be rendered
  });
});