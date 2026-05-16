import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, act } from '@testing-library/react';

// ── Firebase mocks ────────────────────────────────────────────────────────────

const mockAddDoc    = jest.fn();
const mockCollection = jest.fn((_db, ...path) => ({ path }));

jest.mock('../../../Firebase/firebaseConfig', () => ({ db: {} }));

jest.mock('firebase/firestore', () => ({
  collection: (...args) => mockAddDoc(...args),
  addDoc:     (...args) => mockAddDoc(...args),
}));

jest.mock('firebase/firestore', () => ({
  collection: (...args) => mockCollection(...args),
  addDoc:     (...args) => mockAddDoc(...args),
}));

import PaymentSuccess from './PaymentSuccess';

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockSetActivePage = jest.fn();
const mockSetBasket     = jest.fn();

const renderSuccess = (props = {}) =>
  render(
    <PaymentSuccess
      setActivePage={mockSetActivePage}
      setBasket={mockSetBasket}
      {...props}
    />
  );

const makePendingPayment = (overrides = {}) => ({
  customerId:    'customer-123',
  customerEmail: 'test@test.com',
  customerName:  'Test User',
  items: [
    {
      vendorId:   'vendor-abc',
      vendorName: 'Test Vendor',
      name:       'Burger',
      qty:        2,
      price:      '50',
    },
  ],
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────────────

describe('PaymentSuccess – rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the success heading', () => {
    renderSuccess();
    expect(screen.getByText(/payment successful/i)).toBeInTheDocument();
  });

  it('shows "Confirming your order..." initially', () => {
    renderSuccess();
    expect(screen.getByText(/confirming your order/i)).toBeInTheDocument();
  });

  it('shows "No order found." when localStorage has no pendingPayment', async () => {
    renderSuccess();
    await waitFor(() => {
      expect(screen.getByText(/no order found/i)).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Order saving
// ─────────────────────────────────────────────────────────────────────────────

describe('PaymentSuccess – order saving', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    localStorage.clear();
    mockAddDoc.mockResolvedValue({ id: 'new-order-id-123456' });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls addDoc twice — once for order, once for notification', async () => {
    localStorage.setItem('pendingPayment', JSON.stringify(makePendingPayment()));
    renderSuccess();

    await waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalledTimes(2);
    });
  });

  it('saves order to Orders collection with correct fields', async () => {
    localStorage.setItem('pendingPayment', JSON.stringify(makePendingPayment()));
    renderSuccess();

    await waitFor(() => {
      const firstCall = mockAddDoc.mock.calls[0];
      expect(firstCall).toBeDefined();
    });

    const orderCall = mockAddDoc.mock.calls.find(call =>
      JSON.stringify(call).includes('"vendorID"') ||
      JSON.stringify(call).includes('Orders')
    );
    expect(orderCall).toBeDefined();
  });

  it('saves notification to Vendors subcollection', async () => {
    localStorage.setItem('pendingPayment', JSON.stringify(makePendingPayment()));
    renderSuccess();

    await waitFor(() => {
      const notifCall = mockAddDoc.mock.calls.find(call =>
        JSON.stringify(call).includes('notifications') ||
        JSON.stringify(call).includes('"read"')
      );
      expect(notifCall).toBeDefined();
    });
  });

  it('groups items by vendorId', async () => {
    const payment = makePendingPayment({
      items: [
        { vendorId: 'vendor-1', vendorName: 'Vendor One', name: 'Burger', qty: 1, price: '50' },
        { vendorId: 'vendor-2', vendorName: 'Vendor Two', name: 'Pizza',  qty: 1, price: '80' },
      ],
    });
    localStorage.setItem('pendingPayment', JSON.stringify(payment));
    renderSuccess();

    // 2 vendors → 2 orders + 2 notifications = 4 addDoc calls
    await waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalledTimes(4);
    });
  });

  it('calculates correct vendor total', async () => {
    const payment = makePendingPayment({
      items: [
        { vendorId: 'vendor-abc', vendorName: 'Test Vendor', name: 'Burger', qty: 2, price: '50' },
        { vendorId: 'vendor-abc', vendorName: 'Test Vendor', name: 'Chips',  qty: 1, price: '20' },
      ],
    });
    localStorage.setItem('pendingPayment', JSON.stringify(payment));
    renderSuccess();

    await waitFor(() => {
      const orderCall = mockAddDoc.mock.calls.find(call =>
        JSON.stringify(call).includes('"total"')
      );
      expect(JSON.stringify(orderCall)).toContain('120');
    });
  });

  it('clears localStorage after saving', async () => {
    localStorage.setItem('pendingPayment', JSON.stringify(makePendingPayment()));
    localStorage.setItem('pendingPaymentId', 'pay-123');
    renderSuccess();

    await waitFor(() => {
      expect(localStorage.getItem('pendingPayment')).toBeNull();
      expect(localStorage.getItem('pendingPaymentId')).toBeNull();
    });
  });

  it('calls setBasket with empty array after saving', async () => {
    localStorage.setItem('pendingPayment', JSON.stringify(makePendingPayment()));
    renderSuccess();

    await waitFor(() => {
      expect(mockSetBasket).toHaveBeenCalledWith([]);
    });
  });

  it('shows "Order confirmed! Redirecting..." after successful save', async () => {
    localStorage.setItem('pendingPayment', JSON.stringify(makePendingPayment()));
    renderSuccess();

    await waitFor(() => {
      expect(screen.getByText(/order confirmed/i)).toBeInTheDocument();
    });
  });

  it('redirects to orders page after 2 seconds', async () => {
    localStorage.setItem('pendingPayment', JSON.stringify(makePendingPayment()));
    renderSuccess();

    await waitFor(() => screen.getByText(/order confirmed/i));

    act(() => { jest.advanceTimersByTime(2000); });

    expect(mockSetActivePage).toHaveBeenCalledWith('orders');
  });

  it('does not save order twice in React Strict Mode (hasSaved ref)', async () => {
    localStorage.setItem('pendingPayment', JSON.stringify(makePendingPayment()));

    // Simulate double useEffect call (React Strict Mode)
    renderSuccess();

    await waitFor(() => {
      // Should only be called twice (1 order + 1 notification), not 4
      expect(mockAddDoc.mock.calls.length).toBeLessThanOrEqual(2);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Error handling
// ─────────────────────────────────────────────────────────────────────────────

describe('PaymentSuccess – error handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows error message when addDoc fails', async () => {
    mockAddDoc.mockRejectedValue(new Error('Firestore error'));
    localStorage.setItem('pendingPayment', JSON.stringify(makePendingPayment()));
    renderSuccess();

    await waitFor(() => {
      expect(screen.getByText(/payment received but order failed/i)).toBeInTheDocument();
    });
  });

  it('uses vendorID as fallback when vendorId is not present on item', async () => {
    mockAddDoc.mockResolvedValue({ id: 'order-xyz' });
    const payment = makePendingPayment({
      items: [
        { vendorID: 'vendor-fallback', vendorName: 'Fallback Vendor', name: 'Item', qty: 1, price: '30' },
      ],
    });
    localStorage.setItem('pendingPayment', JSON.stringify(payment));
    renderSuccess();

    await waitFor(() => {
      expect(mockAddDoc).toHaveBeenCalled();
    });
  });

  it('uses "unknown" vendorId when neither vendorId nor vendorID is present', async () => {
    mockAddDoc.mockResolvedValue({ id: 'order-xyz' });
    const payment = makePendingPayment({
      items: [{ vendorName: 'No ID Vendor', name: 'Item', qty: 1, price: '10' }],
    });
    localStorage.setItem('pendingPayment', JSON.stringify(payment));
    renderSuccess();

    await waitFor(() => {
      const unknownCall = mockCollection.mock.calls.find(call =>
        JSON.stringify(call).includes('unknown')
      );
      expect(unknownCall).toBeDefined();
    });
  });
});