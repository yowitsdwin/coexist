import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, generateTestMessages } from '../../utils/testHelpers';
import ChatRoom from '../ChatRoom';

jest.mock('../../utils/useFirebase', () => ({
  useRealtimeQuery: jest.fn(() => ({
    data: generateTestMessages(5),
    loading: false
  })),
  useTypingHandler: jest.fn(() => ({
    handleTyping: jest.fn(),
    stopTyping: jest.fn()
  }))
}));

describe('ChatRoom Component', () => {
  const mockProps = {
    userId: 'user1',
    partnerId: 'user2',
    coupleId: 'couple1',
    darkMode: false
  };

  it('renders chat interface', () => {
    renderWithProviders(<ChatRoom {...mockProps} />);
    expect(screen.getByText('Chat')).toBeInTheDocument();
  });

  it('displays messages', () => {
    renderWithProviders(<ChatRoom {...mockProps} />);
    const messages = screen.getAllByText(/test message/i);
    expect(messages.length).toBeGreaterThan(0);
  });

  it('allows user to type message', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChatRoom {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Type a message...');
    await user.type(input, 'Hello world');
    
    expect(input.value).toBe('Hello world');
  });

  it('sends message on button click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChatRoom {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Type a message...');
    await user.type(input, 'Test message');
    
    const sendButton = screen.getByLabelText('Send message');
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('sends message on Enter key', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChatRoom {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Type a message...');
    await user.type(input, 'Test message{Enter}');

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('disables send button when input is empty', () => {
    renderWithProviders(<ChatRoom {...mockProps} />);
    const sendButton = screen.getByLabelText('Send message');
    expect(sendButton).toBeDisabled();
  });

  it('toggles image upload panel', () => {
    renderWithProviders(<ChatRoom {...mockProps} />);
    const imageButton = screen.getByLabelText('Attach image');
    
    fireEvent.click(imageButton);
    // Check if image upload component appears
  });
});