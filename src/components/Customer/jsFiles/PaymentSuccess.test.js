import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import PaymentSuccess from './PaymentSuccess';

// Mock Firebase
jest.mock('../../../Firebase/firebaseConfig', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc:     jest.fn(() => Promise.resolve()),
}));

const { addDoc } = require('firebase/firestore');

const mockSetActivePage = jest.fn();
const mockSetBasket     = jest.fn();

const mockOrder = {
  customerName:  'John Doe',
  customerEmail: 'john@example.com',
  customerId:    'user123',
  total:         64.00,
  items: [
    { name: 'Burger', qty: 2, price: '32.00', vendorName: 'Vendor A', vendorId: 'v1' },
    { name: 'Chips',  qty: 1, price: '20.00', vendorName: 'Vendor B', vendorId: 'v2' },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PaymentSuccess Component', () => {

  test('shows initial confirming status', () => {
    localStorage.setItem('pendingPayment', JSON.stringify(mockOrder));
    render(<PaymentSuccess setActivePage={mockSetActivePage} setBasket={mockSetBasket} />);

    expect(screen.getByText('Confirming your order...')).toBeInTheDocument();
  });

  test('shows payment successful heading', () => {
    localStorage.setItem('pendingPayment', JSON.stringify(mockOrder));
    render(<PaymentSuccess setActivePage={mockSetActivePage} setBasket={mockSetBasket} />);

    expect(screen.getByText('✅ Payment Successful')).toBeInTheDocument();
  });

  test('shows no order found if localStorage is empty', async () => {
    render(<PaymentSuccess setActivePage={mockSetActivePage} setBasket={mockSetBasket} />);

    await waitFor(() => {
      expect(screen.getByText('No order found.')).toBeInTheDocument();
    });
  });

  test('calls addDoc for each vendor', async () => {
    localStorage.setItem('pendingPayment', JSON.stringify(mockOrder));
    render(<PaymentSuccess setActivePage={mockSetActivePage} setBasket={mockSetBasket} />);

    await waitFor(() => {
      // 2 vendors = 2 addDoc calls
      expect(addDoc).toHaveBeenCalledTimes(2);
    });
  });

  test('saves order with correct status as pending', async () => {
    localStorage.setItem('pendingPayment', JSON.stringify(mockOrder));
    render(<PaymentSuccess setActivePage={mockSetActivePage} setBasket={mockSetBasket} />);

    await waitFor(() => {
      const savedOrder = addDoc.mock.calls[0][1];
      expect(savedOrder.status).toBe('pending');
    });
  });

  test('saves order with correct customer details', async () => {
    localStorage.setItem('pendingPayment', JSON.stringify(mockOrder));
    render(<PaymentSuccess setActivePage={mockSetActivePage} setBasket={mockSetBasket} />);

    await waitFor(() => {
      const savedOrder = addDoc.mock.calls[0][1];
      expect(savedOrder.customerId).toBe('user123');
      expect(savedOrder.customerName).toBe('John Doe');
      expect(savedOrder.customerEmail).toBe('john@example.com');
    });
  });

  test('clears localStorage after saving', async () => {
    localStorage.setItem('pendingPayment', JSON.stringify(mockOrder));
    localStorage.setItem('pendingPaymentId', 'order_123');
    render(<PaymentSuccess setActivePage={mockSetActivePage} setBasket={mockSetBasket} />);

    await waitFor(() => {
      expect(localStorage.getItem('pendingPayment')).toBeNull();
      expect(localStorage.getItem('pendingPaymentId')).toBeNull();
    });
  });

  test('calls setBasket to clear basket', async () => {
    localStorage.setItem('pendingPayment', JSON.stringify(mockOrder));
    render(<PaymentSuccess setActivePage={mockSetActivePage} setBasket={mockSetBasket} />);

    await waitFor(() => {
      expect(mockSetBasket).toHaveBeenCalledWith([]);
    });
  });

  test('redirects to orders page after saving', async () => {
    jest.useFakeTimers();
    localStorage.setItem('pendingPayment', JSON.stringify(mockOrder));
    render(<PaymentSuccess setActivePage={mockSetActivePage} setBasket={mockSetBasket} />);

    await waitFor(() => expect(addDoc).toHaveBeenCalled());
    jest.runAllTimers();

    expect(mockSetActivePage).toHaveBeenCalledWith('orders');
    jest.useRealTimers();
  });

  test('shows error message if addDoc fails', async () => {
    addDoc.mockRejectedValueOnce(new Error('Firestore error'));
    localStorage.setItem('pendingPayment', JSON.stringify(mockOrder));
    render(<PaymentSuccess setActivePage={mockSetActivePage} setBasket={mockSetBasket} />);

    await waitFor(() => {
      expect(screen.getByText(/Payment received but order failed to save/i)).toBeInTheDocument();
    });
  });

  test('does not save order twice (React Strict Mode guard)', async () => {
    localStorage.setItem('pendingPayment', JSON.stringify(mockOrder));
    render(<PaymentSuccess setActivePage={mockSetActivePage} setBasket={mockSetBasket} />);

    await waitFor(() => expect(addDoc).toHaveBeenCalled());

    // Should only have 2 calls (one per vendor), not 4
    expect(addDoc).toHaveBeenCalledTimes(2);
  });

});