import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ── Firebase mocks ────────────────────────────────────────────────────────────

const mockUpdateDoc  = jest.fn();
const mockDeleteDoc  = jest.fn();
const mockDeleteObject = jest.fn();
const mockUploadBytes = jest.fn();
const mockGetDownloadURL = jest.fn();
const mockOnSnapshot = jest.fn();
const mockDeleteUser = jest.fn();
const mockUpdateEmail = jest.fn();

jest.mock('../../../Firebase/firebaseConfig', () => ({
  db: {},
  storage: {},
}));

jest.mock('firebase/firestore', () => ({
  doc:       jest.fn(() => ({ id: 'mockDocId' })),
  updateDoc: (...args) => mockUpdateDoc(...args),
  deleteDoc: (...args) => mockDeleteDoc(...args),
  onSnapshot: (...args) => mockOnSnapshot(...args),
}));

jest.mock('firebase/storage', () => ({
  ref:             jest.fn(() => 'mockRef'),
  uploadBytes:     (...args) => mockUploadBytes(...args),
  getDownloadURL:  (...args) => mockGetDownloadURL(...args),
  deleteObject:    (...args) => mockDeleteObject(...args),
}));

jest.mock('firebase/auth', () => ({
  updateEmail: (...args) => mockUpdateEmail(...args),
  deleteUser:  (...args) => mockDeleteUser(...args),
}));

// ── Auth mock ─────────────────────────────────────────────────────────────────

const mockCurrentUser = {
  uid: 'test-uid-123',
  email: 'test@gmail.com',
};

jest.mock('../../../Services/AuthContext', () => ({
  useAuth: () => ({ currentUser: mockCurrentUser }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

import Profile from './Profile';

const mockSetActivePage = jest.fn();

const renderProfile = () =>
  render(<Profile setActivePage={mockSetActivePage} />);

// Simulate Firestore returning user data
const setupSnapshot = (data = {}) => {
  mockOnSnapshot.mockImplementation((docRef, successCb) => {
    successCb({
      exists: () => true,
      data:   () => ({
        name:          'John',
        lastName:      'Doe',
        phone:         '0821234567',
        email:         'test@gmail.com',
        studentNumber: '123456',
        role:          'student',
        photoURL:      '',
        ...data,
      }),
    });
    return jest.fn(); // unsubscribe
  });
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Profile Component', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Rendering ───────────────────────────────────────────────────────────────

  describe('Rendering', () => {

    test('shows loading state initially before snapshot resolves', () => {
      mockOnSnapshot.mockImplementation(() => jest.fn()); // never calls back
      renderProfile();
      expect(screen.getByText(/loading profile/i)).toBeInTheDocument();
    });

    test('renders Personal Information heading after data loads', async () => {
      setupSnapshot();
      renderProfile();
      await waitFor(() =>
        expect(screen.getByText(/personal information/i)).toBeInTheDocument()
      );
    });

    test('renders Logout button', async () => {
      setupSnapshot();
      renderProfile();
      await waitFor(() =>
        expect(screen.getByText(/logout/i)).toBeInTheDocument()
      );
    });

    test('displays fetched first name', async () => {
      setupSnapshot({ name: 'John' });
      renderProfile();
      await waitFor(() =>
        expect(screen.getByText('John')).toBeInTheDocument()
      );
    });

    test('displays fetched last name', async () => {
      setupSnapshot({ lastName: 'Doe' });
      renderProfile();
      await waitFor(() =>
        expect(screen.getByText('Doe')).toBeInTheDocument()
      );
    });

    test('displays fetched phone number', async () => {
      setupSnapshot({ phone: '0821234567' });
      renderProfile();
      await waitFor(() =>
        expect(screen.getByText('0821234567')).toBeInTheDocument()
      );
    });

    test('displays fetched email', async () => {
      setupSnapshot({ email: 'test@gmail.com' });
      renderProfile();
      await waitFor(() =>
        expect(screen.getByText('test@gmail.com')).toBeInTheDocument()
      );
    });

    test('displays fetched student number', async () => {
      setupSnapshot({ studentNumber: '123456' });
      renderProfile();
      await waitFor(() =>
        expect(screen.getByText('123456')).toBeInTheDocument()
      );
    });

    test('displays fetched role', async () => {
      setupSnapshot({ role: 'student' });
      renderProfile();
      await waitFor(() =>
        expect(screen.getByText('student')).toBeInTheDocument()
      );
    });

    test('shows Not set for missing phone number', async () => {
      setupSnapshot({ phone: '' });
      renderProfile();
      await waitFor(() =>
        expect(screen.getByText('Not set')).toBeInTheDocument()
      );
    });

    test('shows profile picture when photoURL exists', async () => {
      setupSnapshot({ photoURL: 'https://example.com/photo.jpg' });
      renderProfile();
      await waitFor(() => {
        const img = screen.getByAltText('Profile');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
      });
    });

    test('shows avatar SVG when no photoURL', async () => {
      setupSnapshot({ photoURL: '' });
      renderProfile();
      await waitFor(() =>
        expect(screen.queryByAltText('Profile')).not.toBeInTheDocument()
      );
    });

    test('renders Danger Zone section', async () => {
      setupSnapshot();
      renderProfile();
      await waitFor(() =>
        expect(screen.getByText(/danger zone/i)).toBeInTheDocument()
      );
    });

    test('renders Delete My Account button', async () => {
      setupSnapshot();
      renderProfile();
      await waitFor(() =>
        expect(screen.getByText(/delete my account/i)).toBeInTheDocument()
      );
    });

  });

  // ── Firestore error ──────────────────────────────────────────────────────────

  describe('Firestore error handling', () => {

    test('shows error message when snapshot fails', async () => {
      mockOnSnapshot.mockImplementation((docRef, successCb, errorCb) => {
        errorCb(new Error('Firestore error'));
        return jest.fn();
      });
      renderProfile();
      await waitFor(() =>
        expect(screen.getByText(/failed to load profile data/i)).toBeInTheDocument()
      );
    });

    test('handles missing user document gracefully', async () => {
      mockOnSnapshot.mockImplementation((docRef, successCb) => {
        successCb({ exists: () => false, data: () => ({}) });
        return jest.fn();
      });
      renderProfile();
      await waitFor(() =>
        expect(screen.getByText(/personal information/i)).toBeInTheDocument()
      );
    });

  });

  // ── Logout ───────────────────────────────────────────────────────────────────

  describe('Logout', () => {

    test('calls setActivePage with login when Logout is clicked', async () => {
      setupSnapshot();
      renderProfile();
      await waitFor(() => screen.getByText(/logout/i));
      fireEvent.click(screen.getByText(/logout/i));
      expect(mockSetActivePage).toHaveBeenCalledWith('login');
    });

  });

  // ── Edit mode ────────────────────────────────────────────────────────────────

  describe('Edit mode', () => {

    test('clicking a row opens edit form', async () => {
      setupSnapshot();
      renderProfile();
      await waitFor(() => screen.getByText('John'));
      fireEvent.click(screen.getByText('John'));
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    });

    test('edit form shows correct input values', async () => {
      setupSnapshot();
      renderProfile();
      await waitFor(() => screen.getByText('John'));
      fireEvent.click(screen.getByText('John'));
      expect(screen.getByLabelText(/first name/i)).toHaveValue('John');
      expect(screen.getByLabelText(/last name/i)).toHaveValue('Doe');
      expect(screen.getByLabelText(/phone/i)).toHaveValue('0821234567');
      expect(screen.getByLabelText(/email/i)).toHaveValue('test@gmail.com');
    });

    test('Cancel button closes edit form', async () => {
      setupSnapshot();
      renderProfile();
      await waitFor(() => screen.getByText('John'));
      fireEvent.click(screen.getByText('John'));
      fireEvent.click(screen.getByText(/cancel/i));
      expect(screen.queryByLabelText(/first name/i)).not.toBeInTheDocument();
    });

    test('typing in name input updates value', async () => {
      setupSnapshot();
      renderProfile();
      await waitFor(() => screen.getByText('John'));
      fireEvent.click(screen.getByText('John'));
      const nameInput = screen.getByLabelText(/first name/i);
      fireEvent.change(nameInput, { target: { name: 'name', value: 'Jane' } });
      expect(nameInput).toHaveValue('Jane');
    });

    test('save calls updateDoc with correct fields', async () => {
      mockUpdateDoc.mockResolvedValueOnce();
      setupSnapshot();
      renderProfile();
      await waitFor(() => screen.getByText('John'));
      fireEvent.click(screen.getByText('John'));
      await act(async () => {
        fireEvent.click(screen.getByText(/save changes/i));
      });
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ name: 'John', lastName: 'Doe' })
      );
    });

    test('shows success message after save', async () => {
      mockUpdateDoc.mockResolvedValueOnce();
      setupSnapshot();
      renderProfile();
      await waitFor(() => screen.getByText('John'));
      fireEvent.click(screen.getByText('John'));
      await act(async () => {
        fireEvent.click(screen.getByText(/save changes/i));
      });
      await waitFor(() =>
        expect(screen.getByText(/profile updated successfully/i)).toBeInTheDocument()
      );
    });

    test('shows error message when save fails', async () => {
      mockUpdateDoc.mockRejectedValueOnce(new Error('Save failed'));
      setupSnapshot();
      renderProfile();
      await waitFor(() => screen.getByText('John'));
      fireEvent.click(screen.getByText('John'));
      await act(async () => {
        fireEvent.click(screen.getByText(/save changes/i));
      });
      await waitFor(() =>
        expect(screen.getByText(/failed to save changes/i)).toBeInTheDocument()
      );
    });

    test('shows Saving... while save is in progress', async () => {
      mockUpdateDoc.mockImplementation(() => new Promise(() => {})); // never resolves
      setupSnapshot();
      renderProfile();
      await waitFor(() => screen.getByText('John'));
      fireEvent.click(screen.getByText('John'));
      act(() => {
        fireEvent.click(screen.getByText(/save changes/i));
      });
      expect(screen.getByText(/saving\.\.\./i)).toBeInTheDocument();
    });

  });

  // ── Photo upload ─────────────────────────────────────────────────────────────

  describe('Photo upload', () => {

    test('uploads photo and updates Firestore', async () => {
      mockUploadBytes.mockResolvedValueOnce();
      mockGetDownloadURL.mockResolvedValueOnce('https://example.com/new.jpg');
      mockUpdateDoc.mockResolvedValueOnce();
      setupSnapshot();
      renderProfile();
      await waitFor(() => screen.getByText(/personal information/i));

      const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('#photo-upload');
      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      expect(mockUploadBytes).toHaveBeenCalled();
      expect(mockGetDownloadURL).toHaveBeenCalled();
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { photoURL: 'https://example.com/new.jpg' }
      );
    });

    test('shows success message after photo upload', async () => {
      mockUploadBytes.mockResolvedValueOnce();
      mockGetDownloadURL.mockResolvedValueOnce('https://example.com/new.jpg');
      mockUpdateDoc.mockResolvedValueOnce();
      setupSnapshot();
      renderProfile();
      await waitFor(() => screen.getByText(/personal information/i));

      const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('#photo-upload');
      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() =>
        expect(screen.getByText(/profile picture updated successfully/i)).toBeInTheDocument()
      );
    });

    test('shows error message when photo upload fails', async () => {
      mockUploadBytes.mockRejectedValueOnce(new Error('Upload failed'));
      setupSnapshot();
      renderProfile();
      await waitFor(() => screen.getByText(/personal information/i));

      const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('#photo-upload');
      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() =>
        expect(screen.getByText(/failed to upload photo/i)).toBeInTheDocument()
      );
    });

  });

  // ── Delete account ───────────────────────────────────────────────────────────

  describe('Delete account', () => {

    beforeEach(() => {
      window.confirm = jest.fn(() => true);
      window.alert   = jest.fn();
    });

    test('calls deleteDoc and deleteUser on account deletion', async () => {
      mockDeleteDoc.mockResolvedValueOnce();
      mockDeleteUser.mockResolvedValueOnce();
      setupSnapshot();
      renderProfile();
      await waitFor(() => screen.getByText(/delete my account/i));

      await act(async () => {
        fireEvent.click(screen.getByText(/delete my account/i));
      });

      expect(mockDeleteDoc).toHaveBeenCalled();
      expect(mockDeleteUser).toHaveBeenCalledWith(mockCurrentUser);
    });

    test('calls setActivePage with login after deletion', async () => {
      mockDeleteDoc.mockResolvedValueOnce();
      mockDeleteUser.mockResolvedValueOnce();
      setupSnapshot();
      renderProfile();
      await waitFor(() => screen.getByText(/delete my account/i));

      await act(async () => {
        fireEvent.click(screen.getByText(/delete my account/i));
      });

      expect(mockSetActivePage).toHaveBeenCalledWith('login');
    });

    test('does not delete if confirm is cancelled', async () => {
      window.confirm = jest.fn(() => false);
      setupSnapshot();
      renderProfile();
      await waitFor(() => screen.getByText(/delete my account/i));

      await act(async () => {
        fireEvent.click(screen.getByText(/delete my account/i));
      });

      expect(mockDeleteDoc).not.toHaveBeenCalled();
      expect(mockDeleteUser).not.toHaveBeenCalled();
    });

    test('also deletes profile photo if photoURL exists', async () => {
      mockDeleteObject.mockResolvedValueOnce();
      mockDeleteDoc.mockResolvedValueOnce();
      mockDeleteUser.mockResolvedValueOnce();
      setupSnapshot({ photoURL: 'https://example.com/photo.jpg' });
      renderProfile();
      await waitFor(() => screen.getByText(/delete my account/i));

      await act(async () => {
        fireEvent.click(screen.getByText(/delete my account/i));
      });

      expect(mockDeleteObject).toHaveBeenCalled();
    });

    test('shows error when delete account fails', async () => {
      mockDeleteDoc.mockRejectedValueOnce(new Error('Delete failed'));
      setupSnapshot();
      renderProfile();
      await waitFor(() => screen.getByText(/delete my account/i));

      await act(async () => {
        fireEvent.click(screen.getByText(/delete my account/i));
      });

      await waitFor(() =>
        expect(screen.getByText(/failed to delete account/i)).toBeInTheDocument()
      );
    });

    test('shows Deleting... while deletion is in progress', async () => {
      mockDeleteDoc.mockImplementation(() => new Promise(() => {})); // never resolves
      setupSnapshot();
      renderProfile();
      await waitFor(() => screen.getByText(/delete my account/i));

      act(() => {
        fireEvent.click(screen.getByText(/delete my account/i));
      });

      expect(screen.getByText(/deleting\.\.\./i)).toBeInTheDocument();
    });

  });

});