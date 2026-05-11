// MenuManagement.test.jsx

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup
} from '@testing-library/react';

import '@testing-library/jest-dom';

import MenuManagement from '../MenuManagement';

// ============================================================
// MOCKS
// ============================================================

jest.mock('../../Services/AuthContext', () => ({
  useAuth: () => ({
    vendorId: 'vendor-123'
  })
}));

jest.mock('../../Firebase/firebaseConfig', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  deleteDoc: jest.fn()
}));

import {
  addDoc,
  updateDoc,
  getDocs,
  deleteDoc
} from 'firebase/firestore';

// ============================================================
// MOCK DATA
// ============================================================

const mockItems = [
  {
    id: '1',
    name: 'Burger',
    price: '55.00',
    qty: '10',
    description: 'Beef burger',
    imageUrl: 'burger.jpg',
    allergens: ['Gluten'],
    dietary: ['halal']
  },
  {
    id: '2',
    name: 'Pizza',
    price: '89.00',
    qty: '5',
    description: 'Cheese pizza',
    imageUrl: 'pizza.jpg',
    allergens: ['Dairy'],
    dietary: ['vegetarian']
  }
];

// ============================================================
// TEST SUITE
// ============================================================

describe('MenuManagement Component', () => {

  beforeEach(() => {
    getDocs.mockResolvedValue({
      docs: mockItems.map(item => ({
        id: item.id,
        data: () => item
      }))
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  // ============================================================
  // BASIC RENDER TESTS
  // ============================================================

  test('renders page heading', () => {
    render(<MenuManagement />);
    expect(screen.getByText('Menu Management')).toBeInTheDocument();
  });

  test('renders form heading', () => {
    render(<MenuManagement />);
    expect(screen.getByText('Add Food Item')).toBeInTheDocument();
  });

  test('renders all input fields', () => {
    render(<MenuManagement />);

    expect(screen.getByPlaceholderText('Food name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Price (R)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Quantity available')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Description')).toBeInTheDocument();
  });

  test('renders add product button', () => {
    render(<MenuManagement />);
    expect(screen.getByText('Add Product')).toBeInTheDocument();
  });

  // ============================================================
  // FETCH TESTS
  // ============================================================

  test('fetches and displays menu items', async () => {
    render(<MenuManagement />);

    expect(await screen.findByText('Burger')).toBeInTheDocument();
    expect(await screen.findByText('Pizza')).toBeInTheDocument();
  });

  test('renders prices correctly', async () => {
    render(<MenuManagement />);

    expect(await screen.findByText('R 55.00')).toBeInTheDocument();
    expect(await screen.findByText('R 89.00')).toBeInTheDocument();
  });

  test('renders descriptions correctly', async () => {
    render(<MenuManagement />);

    expect(await screen.findByText('Beef burger')).toBeInTheDocument();
    expect(await screen.findByText('Cheese pizza')).toBeInTheDocument();
  });

  // ============================================================
  // INPUT TESTS
  // ============================================================

  test('updates food name input', () => {
    render(<MenuManagement />);

    const input = screen.getByPlaceholderText('Food name');
    fireEvent.change(input, { target: { value: 'Chicken Wrap' } });

    expect(input.value).toBe('Chicken Wrap');
  });

  test('updates price input', () => {
    render(<MenuManagement />);

    const input = screen.getByPlaceholderText('Price (R)');
    fireEvent.change(input, { target: { value: '99.99' } });

    expect(input.value).toBe('99.99');
  });

  test('updates quantity input', () => {
    render(<MenuManagement />);

    const input = screen.getByPlaceholderText('Quantity available');
    fireEvent.change(input, { target: { value: '50' } });

    expect(input.value).toBe('50');
  });

  test('updates description input', () => {
    render(<MenuManagement />);

    const textarea = screen.getByPlaceholderText('Description');
    fireEvent.change(textarea, { target: { value: 'Very tasty food' } });

    expect(textarea.value).toBe('Very tasty food');
  });

  // ============================================================
  // ADD ITEM
  // ============================================================

  test('adds new item successfully', async () => {
    addDoc.mockResolvedValue({ id: 'new-item' });

    render(<MenuManagement />);

    fireEvent.change(screen.getByPlaceholderText('Food name'), {
      target: { value: 'Chicken Burger' }
    });

    fireEvent.change(screen.getByPlaceholderText('Price (R)'), {
      target: { value: '75' }
    });

    fireEvent.click(screen.getByText('Add Product'));

    await waitFor(() => {
      expect(addDoc).toHaveBeenCalled();
    });
  });

  // ============================================================
  // EDIT
  // ============================================================

  test('loads item into edit mode', async () => {
    render(<MenuManagement />);

    const editButtons = await screen.findAllByText('Edit');
    fireEvent.click(editButtons[0]);

    expect(screen.getByDisplayValue('Burger')).toBeInTheDocument();
  });

  test('updates item', async () => {
    updateDoc.mockResolvedValue();

    render(<MenuManagement />);

    const editButtons = await screen.findAllByText('Edit');
    fireEvent.click(editButtons[0]);

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalled();
    });
  });

  // ============================================================
  // DELETE
  // ============================================================

  test('deletes item', async () => {
    deleteDoc.mockResolvedValue();

    render(<MenuManagement />);

    const deleteButtons = await screen.findAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(deleteDoc).toHaveBeenCalled();
    });
  });

  // ============================================================
  // EMPTY STATE
  // ============================================================

  test('shows empty state', async () => {
    getDocs.mockResolvedValue({ docs: [] });

    render(<MenuManagement />);

    expect(await screen.findByText(/No menu items yet/i)).toBeInTheDocument();
  });

  // ============================================================
  // EDGE CASES
  // ============================================================

  test('survives rapid clicking', () => {
    render(<MenuManagement />);

    const btn = screen.getByText(/Select allergens/i);

    fireEvent.click(btn);
    fireEvent.click(btn);
    fireEvent.click(btn);

    expect(btn).toBeInTheDocument();
  });

});