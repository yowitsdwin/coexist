// File: components/__tests__/ImageUpload.test.js

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../utils/testHelpers';
import ImageUpload from '../ImageUpload';

describe('ImageUpload Component', () => {
  const mockOnUpload = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders upload button initially', () => {
    renderWithProviders(
      <ImageUpload onUpload={mockOnUpload} onCancel={mockOnCancel} />
    );
    expect(screen.getByText(/click to upload image/i)).toBeInTheDocument();
  });

  it('shows preview after file selection', async () => {
    renderWithProviders(
      <ImageUpload onUpload={mockOnUpload} onCancel={mockOnCancel} />
    );

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/click to upload image/i).querySelector('input');
    
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByAltText('Preview')).toBeInTheDocument();
    });
  });

  it('calls onUpload when upload button clicked', async () => {
    renderWithProviders(
      <ImageUpload onUpload={mockOnUpload} onCancel={mockOnCancel} />
    );

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/click to upload image/i).querySelector('input');
    
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Upload')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Upload'));
    expect(mockOnUpload).toHaveBeenCalled();
  });

  it('shows error for oversized images', async () => {
    renderWithProviders(
      <ImageUpload onUpload={mockOnUpload} onCancel={mockOnCancel} />
    );

    // Create a large file (> 1MB)
    const largeFile = new File(['x'.repeat(2000000)], 'large.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/click to upload image/i).querySelector('input');
    
    fireEvent.change(input, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    });
  });
});