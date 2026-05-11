// AccSettings.test.jsx

import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import AccSettings from '../AccSettings';

import { setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';

// ============================================================
// MOCKS (fixed paths)
// ============================================================

jest.mock('../../Firebase/firebaseConfig', () => ({
  db: {},
  auth: {}
}));

jest.mock('../../Services/AuthContext', () => ({
  useAuth: () => ({
    vendorId: 'vendor-001'
  })
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn()
}));

jest.mock('firebase/auth', () => ({
  deleteUser: jest.fn()
}));

jest.mock('../AccSettings.css', () => ({}));

// ============================================================
// MOCK DATA
// ============================================================

const mockVendorData = {
  businessName: 'Red Dragon Burgers',
  category: 'Fast Food',
  description: 'Best burgers in town',
  address: '123 Main Street',
  phoneNumber: '0821234567',
  logoURL: 'logo.jpg',
  bannerURL: 'banner.jpg',
  hours: {
    Monday: {
      open: '08:00',
      close: '18:00',
      closed: false
    }
  }
};

const mockUserData = {
  fullName: 'Nicolene Smith',
  email: 'nico@email.com',
  contact: '0831112222'
};

// ============================================================
// TEST SUITE
// ============================================================

describe('AccSettings Component', () => {
  const mockOnStoreUpdate = jest.fn();
  const mockOnLogout = jest.fn();

  beforeEach(() => {
    getDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => mockVendorData
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => mockUserData
      })
      .mockResolvedValueOnce({
        exists: () => false
      });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  // ============================================================
  // LOADING TEST
  // ============================================================

  test('shows loading state initially', () => {
    render(
      <AccSettings
        uid="vendor-123"
        onStoreUpdate={mockOnStoreUpdate}
        onLogout={mockOnLogout}
      />
    );

    expect(screen.getByText(/Loading your settings/i)).toBeInTheDocument();
  });

  // ============================================================
  // BASIC RENDER TESTS
  // ============================================================

  test('renders account settings heading', async () => {
    render(
      <AccSettings
        uid="vendor-123"
        onStoreUpdate={mockOnStoreUpdate}
        onLogout={mockOnLogout}
      />
    );

    expect(await screen.findByText('Account Settings')).toBeInTheDocument();
  });

  test('renders all main sections', async () => {
    render(
      <AccSettings
        uid="vendor-123"
        onStoreUpdate={mockOnStoreUpdate}
        onLogout={mockOnLogout}
      />
    );

    expect(await screen.findByText('Store Details')).toBeInTheDocument();
    expect(screen.getByText('Personal Details')).toBeInTheDocument();
    expect(screen.getByText('Platform Access')).toBeInTheDocument();
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
  });

  // ============================================================
  // DATA LOAD TESTS
  // ============================================================

  test('loads vendor data into form fields', async () => {
    render(
      <AccSettings
        uid="vendor-123"
        onStoreUpdate={mockOnStoreUpdate}
        onLogout={mockOnLogout}
      />
    );

    expect(await screen.findByDisplayValue('Red Dragon Burgers')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Best burgers in town')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123 Main Street')).toBeInTheDocument();
  });

  test('loads user account data', async () => {
    render(
      <AccSettings
        uid="vendor-123"
        onStoreUpdate={mockOnStoreUpdate}
        onLogout={mockOnLogout}
      />
    );

    expect(await screen.findByDisplayValue('Nicolene Smith')).toBeInTheDocument();
    expect(screen.getByDisplayValue('nico@email.com')).toBeInTheDocument();
  });

  // ============================================================
  // INPUT TESTS
  // ============================================================

  test('updates store name input', async () => {
    render(
      <AccSettings
        uid="vendor-123"
        onStoreUpdate={mockOnStoreUpdate}
        onLogout={mockOnLogout}
      />
    );

    const input = await screen.findByDisplayValue('Red Dragon Burgers');

    fireEvent.change(input, { target: { value: 'Maroon Burgers' } });

    expect(input.value).toBe('Maroon Burgers');
  });

  test('updates description textarea', async () => {
    render(
      <AccSettings
        uid="vendor-123"
        onStoreUpdate={mockOnStoreUpdate}
        onLogout={mockOnLogout}
      />
    );

    const textarea = await screen.findByDisplayValue('Best burgers in town');

    fireEvent.change(textarea, { target: { value: 'New Description' } });

    expect(textarea.value).toBe('New Description');
  });

  test('updates phone number input', async () => {
    render(
      <AccSettings
        uid="vendor-123"
        onStoreUpdate={mockOnStoreUpdate}
        onLogout={mockOnLogout}
      />
    );

    const input = await screen.findByDisplayValue('0821234567');

    fireEvent.change(input, { target: { value: '0719998888' } });

    expect(input.value).toBe('0719998888');
  });

  // ============================================================
  // SAVE TEST
  // ============================================================

  test('calls onStoreUpdate when saving', async () => {
    render(
      <AccSettings
        uid="vendor-123"
        onStoreUpdate={mockOnStoreUpdate}
        onLogout={mockOnLogout}
      />
    );

    fireEvent.click(await screen.findByText('Save Changes'));

    expect(mockOnStoreUpdate).toHaveBeenCalled();
  });

  test('shows success toast after saving', async () => {
    render(
      <AccSettings
        uid="vendor-123"
        onStoreUpdate={mockOnStoreUpdate}
        onLogout={mockOnLogout}
      />
    );

    fireEvent.click(await screen.findByText('Save Changes'));

    expect(screen.getByText(/Changes saved successfully/i)).toBeInTheDocument();
  });

  // ============================================================
  // DELETE ACCOUNT TEST
  // ============================================================

  test('shows confirmation when delete clicked', async () => {
    render(
      <AccSettings
        uid="vendor-123"
        onStoreUpdate={mockOnStoreUpdate}
        onLogout={mockOnLogout}
      />
    );

    fireEvent.click(await screen.findByText('Delete Account'));

    expect(screen.getByText(/Are you sure/i)).toBeInTheDocument();
  });

  test('deletes account successfully', async () => {
    deleteDoc.mockResolvedValue();
    deleteUser.mockResolvedValue();

    render(
      <AccSettings
        uid="vendor-123"
        onStoreUpdate={mockOnStoreUpdate}
        onLogout={mockOnLogout}
      />
    );

    fireEvent.click(await screen.findByText('Delete Account'));
    fireEvent.click(screen.getByText(/Yes, delete my account/i));

    await waitFor(() => {
      expect(deleteDoc).toHaveBeenCalled();
      expect(deleteUser).toHaveBeenCalled();
      expect(mockOnLogout).toHaveBeenCalled();
    });
  });

  // ============================================================
  // ERROR HANDLING
  // ============================================================

  test('handles fetch errors gracefully', async () => {
    console.error = jest.fn();

    getDoc.mockRejectedValue(new Error('Fetch failed'));

    render(
      <AccSettings
        uid="vendor-123"
        onStoreUpdate={mockOnStoreUpdate}
        onLogout={mockOnLogout}
      />
    );

    await waitFor(() => {
      expect(console.error).toHaveBeenCalled();
    });
  });
});