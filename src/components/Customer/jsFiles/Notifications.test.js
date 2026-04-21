import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('../../../Firebase/firebaseConfig', () => ({ db: {} }));

// FIX - onSnapshot MUST return a function (the unsubscribe)
// Notifications.js calls unsubById(), unsubByEmail(), unsubByDisplayName() on cleanup
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query:      jest.fn(),
  where:      jest.fn(),
  onSnapshot: jest.fn().mockImplementation((q, successCb, errorCb) => {
    successCb({ docs: [] });
    return jest.fn(); // this is the unsubscribe function that gets called on cleanup
  }),
}));

jest.mock('../../../Services/AuthContext', () => ({
  useAuth: () => ({
    currentUser: {
      uid:         'user123',
      email:       'student@gmail.com',
      displayName: 'Test Student',
    },
    authLoading: false,
  }),
}));

import Notifications from './Notifications';

// UAT-N01
test('UAT-N01 - Notifications page renders heading', () => {
  const { unmount } = render(<Notifications />);
  expect(screen.getByRole('heading', { name: /notifications/i })).toBeInTheDocument();
  unmount(); // cleanly unmount to avoid unsubscribe crash
});

// UAT-N02
test('UAT-N02 - Shows no order updates message when no orders exist', () => {
  const { unmount } = render(<Notifications />);
  expect(screen.getByText(/no order updates yet/i)).toBeInTheDocument();
  unmount();
});

// UAT-N03
test('UAT-N03 - Does not show loading when auth is resolved', () => {
  const { unmount } = render(<Notifications />);
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  unmount();
});

// UAT-N04
test('UAT-N04 - Does not show sign in message when user is logged in', () => {
  const { unmount } = render(<Notifications />);
  expect(screen.queryByText(/please sign in/i)).not.toBeInTheDocument();
  unmount();
});