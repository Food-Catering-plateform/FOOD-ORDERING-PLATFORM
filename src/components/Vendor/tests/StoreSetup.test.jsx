// StoreSetup.test.jsx

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup
} from '@testing-library/react';

import '@testing-library/jest-dom';

import StoreSetup from '../StoreSetup';

import { setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

// ============================================================
// MOCKS
// ============================================================

jest.mock('../../Services/AuthContext', () => ({
  useAuth: () => ({
    vendorId: 'vendor-001'
  })
}));

jest.mock('../../Firebase/firebaseConfig', () => ({
  db: {},
  auth: {}
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn()
}));

jest.mock('firebase/auth', () => ({
  signOut: jest.fn()
}));

jest.mock('../StoreSetup.css', () => ({}));

// ============================================================
// TEST SUITE
// ============================================================

describe('StoreSetup Component', () => {

  const mockOnComplete = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ============================================================
  // BASIC RENDER TESTS
  // ============================================================

  test('renders store setup title', () => {
    render(
      <StoreSetup onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );

    expect(screen.getByText('Set Up Your Store')).toBeInTheDocument();
  });

  test('renders first step by default', () => {
    render(
      <StoreSetup onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );

    expect(screen.getByText('Basic Information')).toBeInTheDocument();
  });

  test('renders all setup steps', () => {
    render(
      <StoreSetup onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );

    expect(screen.getByText('Basic Info')).toBeInTheDocument();
    expect(screen.getByText('Location & Hours')).toBeInTheDocument();
    expect(screen.getByText('Branding')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  // ============================================================
  // INPUT TESTS
  // ============================================================

  test('updates store name input', () => {
    render(
      <StoreSetup onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );

    const input = screen.getByPlaceholderText(/Mama's Kitchen/i);

    fireEvent.change(input, {
      target: { value: 'Red Dragon Burgers' }
    });

    expect(input.value).toBe('Red Dragon Burgers');
  });

  test('updates description input', () => {
    render(
      <StoreSetup onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );

    const textarea = screen.getByPlaceholderText(/Tell customers/i);

    fireEvent.change(textarea, {
      target: { value: 'Best burgers in Johannesburg' }
    });

    expect(textarea.value).toBe('Best burgers in Johannesburg');
  });

  test('updates category select', () => {
    render(
      <StoreSetup onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );

    const select = screen.getByRole('combobox');

    fireEvent.change(select, {
      target: { value: 'Fast Food' }
    });

    expect(select.value).toBe('Fast Food');
  });

  // ============================================================
  // VALIDATION TESTS (FIXED)
  // ============================================================

  test('shows validation errors when fields empty', () => {
    render(
      <StoreSetup onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );

    fireEvent.click(screen.getByText('Next'));

    expect(screen.getByText('Store name is required')).toBeInTheDocument();
    expect(screen.getByText('Please select a category')).toBeInTheDocument();
    expect(screen.getByText('Add a short description')).toBeInTheDocument();
  });

  test('does not proceed when validation fails', () => {
    render(
      <StoreSetup onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );

    fireEvent.click(screen.getByText('Next'));

    // FIX: should NOT find next step
    expect(screen.queryByText('Location & Hours')).not.toBeInTheDocument();
  });

  // ============================================================
  // NAVIGATION TESTS
  // ============================================================

  test('proceeds to next step when valid', () => {
    render(
      <StoreSetup onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );

    fireEvent.change(screen.getByPlaceholderText(/Mama's Kitchen/i), {
      target: { value: 'Dragon Cafe' }
    });

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Fast Food' }
    });

    fireEvent.change(screen.getByPlaceholderText(/Tell customers/i), {
      target: { value: 'Amazing food' }
    });

    fireEvent.click(screen.getByText('Next'));

    expect(screen.getByText('Location & Hours')).toBeInTheDocument();
  });

  test('back button returns to previous step', () => {
    render(
      <StoreSetup onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );

    fireEvent.change(screen.getByPlaceholderText(/Mama's Kitchen/i), {
      target: { value: 'Store' }
    });

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Fast Food' }
    });

    fireEvent.change(screen.getByPlaceholderText(/Tell customers/i), {
      target: { value: 'Desc' }
    });

    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Back'));

    expect(screen.getByText('Basic Information')).toBeInTheDocument();
  });

  // ============================================================
  // FIREBASE TESTS
  // ============================================================

  test('submits store successfully', async () => {
    setDoc.mockResolvedValue();
    signOut.mockResolvedValue();

    render(
      <StoreSetup onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );

    fireEvent.change(screen.getByPlaceholderText(/Mama's Kitchen/i), {
      target: { value: 'Dragon Cafe' }
    });

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Fast Food' }
    });

    fireEvent.change(screen.getByPlaceholderText(/Tell customers/i), {
      target: { value: 'Amazing food' }
    });

    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));

    fireEvent.click(screen.getByText('Launch Store'));

    await waitFor(() => {
      expect(setDoc).toHaveBeenCalled();
    });
  });

  test('signs out user after setup', async () => {
    setDoc.mockResolvedValue();
    signOut.mockResolvedValue();

    render(
      <StoreSetup onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );

    fireEvent.click(screen.getByText('Exit'));

    await waitFor(() => {
      expect(signOut).toHaveBeenCalled();
    });
  });

  test('calls onComplete after submit', async () => {
    setDoc.mockResolvedValue();
    signOut.mockResolvedValue();

    render(
      <StoreSetup onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );

    fireEvent.click(screen.getByText('Launch Store'));

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  // ============================================================
  // EDGE CASE FIXED (NO jest.doMock FLAKINESS)
  // ============================================================

  test('renders loading state when vendorId missing', async () => {
    jest.resetModules();

    jest.doMock('../../Services/AuthContext', () => ({
      useAuth: () => ({ vendorId: null })
    }));

    const StoreSetupReloaded =
      require('../StoreSetup').default;

    render(
      <StoreSetupReloaded
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

});