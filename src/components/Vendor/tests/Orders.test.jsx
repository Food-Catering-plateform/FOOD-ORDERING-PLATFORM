// Orders.test.jsx

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup
} from '@testing-library/react';

import '@testing-library/jest-dom';

import Orders from '../Orders';

// ============================================================
// MOCKS
// ============================================================

jest.mock('../../Services/AuthContext', () => ({
  useAuth: () => ({
    vendorId: 'vendor-001'
  })
}));

jest.mock('../../Firebase/firebaseConfig', () => ({
  db: {}
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  updateDoc: jest.fn(),
  onSnapshot: jest.fn(),
  doc: jest.fn(),
  query: jest.fn(),
  where: jest.fn()
}));

jest.mock('../../Services/pickupReadyEmail', () => ({
  sendOrderReadyForPickupEmail: jest.fn()
}));

import {
  updateDoc,
  onSnapshot
} from 'firebase/firestore';

import {
  sendOrderReadyForPickupEmail
} from '../../Services/pickupReadyEmail';

// ============================================================
// MOCK DATA
// ============================================================

const mockOrders = [
  {
    id: 'ORD-001',
    vendorID: 'vendor-123',
    customerName: 'Nicolene',
    time: '12:30',
    status: 'pending',
    total: 120.50,
    notes: 'Extra sauce',
    pickupEmailSent: false,
    items: [
      { name: 'Burger', qty: 2, price: 45 },
      { name: 'Fries', qty: 1, price: 30.5 }
    ]
  },
  {
    id: 'ORD-002',
    vendorID: 'vendor-123',
    customerName: 'Alex',
    time: '13:10',
    status: 'ready',
    total: 89.99,
    pickupEmailSent: true,
    items: [
      { name: 'Pizza', qty: 1, price: 89.99 }
    ]
  },
  {
    id: 'ORD-003',
    vendorID: 'vendor-123',
    customerName: 'Jamie',
    time: '14:00',
    status: 'completed',
    total: 55,
    pickupEmailSent: true,
    items: [
      { name: 'Wrap', qty: 1, price: 55 }
    ]
  }
];

// ============================================================
// TEST SUITE
// ============================================================

describe('Orders Component', () => {

  beforeEach(() => {
    onSnapshot.mockImplementation((q, success) => {
      success({
        docs: mockOrders.map(order => ({
          id: order.id,
          data: () => order
        }))
      });

      return jest.fn();
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  // ============================================================
  // BASIC RENDER
  // ============================================================

  test('renders orders heading', async () => {
    render(<Orders />);
    expect(await screen.findByText('Orders')).toBeInTheDocument();
  });

  test('renders all orders', async () => {
    render(<Orders />);

    expect(await screen.findByText('ORD-001')).toBeInTheDocument();
    expect(screen.getByText('ORD-002')).toBeInTheDocument();
    expect(screen.getByText('ORD-003')).toBeInTheDocument();
  });

  test('renders customer names', async () => {
    render(<Orders />);

    expect(await screen.findByText('Nicolene')).toBeInTheDocument();
    expect(screen.getByText('Alex')).toBeInTheDocument();
  });

  // ============================================================
  // DETAILS
  // ============================================================

  test('renders items correctly', async () => {
    render(<Orders />);

    expect(await screen.findByText('Burger')).toBeInTheDocument();
    expect(screen.getByText('Pizza')).toBeInTheDocument();
  });

  test('renders quantities', async () => {
    render(<Orders />);

    expect(await screen.findByText('x2')).toBeInTheDocument();
    expect(screen.getByText('x1')).toBeInTheDocument();
  });

  test('renders totals', async () => {
    render(<Orders />);

    expect(await screen.findByText(/R 120.50/i)).toBeInTheDocument();
    expect(screen.getByText(/R 89.99/i)).toBeInTheDocument();
  });

  // ============================================================
  // STATUS
  // ============================================================

  test('renders status badges', async () => {
    render(<Orders />);

    expect(await screen.findByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  test('shows advance button', async () => {
    render(<Orders />);

    expect(await screen.findByText(/Mark as Preparing/i)).toBeInTheDocument();
  });

  // ============================================================
  // FILTERS
  // ============================================================

  test('filters pending orders', async () => {
    render(<Orders />);

    fireEvent.click(await screen.findByText('Pending'));

    expect(screen.getByText('ORD-001')).toBeInTheDocument();
    expect(screen.queryByText('ORD-002')).not.toBeInTheDocument();
  });

  test('filters completed orders', async () => {
    render(<Orders />);

    fireEvent.click(await screen.findByText('Completed'));

    expect(screen.getByText('ORD-003')).toBeInTheDocument();
    expect(screen.queryByText('ORD-001')).not.toBeInTheDocument();
  });

  // ============================================================
  // UPDATE STATUS
  // ============================================================

  test('updates order status', async () => {
    updateDoc.mockResolvedValue();

    render(<Orders />);

    fireEvent.click(await screen.findByText(/Mark as Preparing/i));

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalled();
    });
  });

  // ============================================================
  // EMAIL FLOW
  // ============================================================

  test('sends pickup email', async () => {
    updateDoc.mockResolvedValue();
    sendOrderReadyForPickupEmail.mockResolvedValue({ ok: true });

    onSnapshot.mockImplementation((q, success) => {
      success({
        docs: [{
          id: mockOrders[0].id,
          data: () => ({ ...mockOrders[0], status: 'preparing' })
        }]
      });

      return jest.fn();
    });

    render(<Orders />);

    fireEvent.click(await screen.findByText(/Mark as Ready/i));

    await waitFor(() => {
      expect(sendOrderReadyForPickupEmail).toHaveBeenCalled();
    });
  });

  // ============================================================
  // EMPTY STATE
  // ============================================================

  test('shows empty state', async () => {
    onSnapshot.mockImplementation((q, success) => {
      success({ docs: [] });
      return jest.fn();
    });

    render(<Orders />);

    expect(await screen.findByText(/No orders at the moment/i)).toBeInTheDocument();
  });

  // ============================================================
  // EDGE CASES
  // ============================================================

  test('survives rapid filter switching', async () => {
    render(<Orders />);

    fireEvent.click(await screen.findByText('Pending'));
    fireEvent.click(screen.getByText('Completed'));
    fireEvent.click(screen.getByText('All'));

    expect(screen.getByText('Orders')).toBeInTheDocument();
  });

});