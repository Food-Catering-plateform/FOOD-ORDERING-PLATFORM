import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

// ── Static mocks ──────────────────────────────────────────────────────────────

jest.mock('../css/Orders.css', () => ({}));

// ── Firebase mocks ────────────────────────────────────────────────────────────

const mockOnSnapshot = jest.fn();
const mockCollection = jest.fn((_db, ...path) => ({ path }));
const mockQuery      = jest.fn((...args) => args);
const mockWhere      = jest.fn((...args) => args);

jest.mock('../../../Firebase/firebaseConfig', () => ({ db: {} }));

jest.mock('firebase/firestore', () => ({
  collection:  (...args) => mockCollection(...args),
  query:       (...args) => mockQuery(...args),
  where:       (...args) => mockWhere(...args),
  onSnapshot:  (...args) => mockOnSnapshot(...args),
}));

// ── Auth mock ─────────────────────────────────────────────────────────────────

let mockCurrentUser = { uid: 'customer-123' };
let mockAuthLoading = false;

jest.mock('../../../Services/AuthContext', () => ({
  useAuth: () => ({ currentUser: mockCurrentUser, authLoading: mockAuthLoading }),
}));

import Orders from './Orders';

// ── Helpers ───────────────────────────────────────────────────────────────────

const renderOrders = () => render(<Orders />);

function setupOrders(orders = []) {
  let snapshotCb;

  mockOnSnapshot.mockImplementation((_query, cb) => {
    snapshotCb = cb;
    cb({ docs: orders.map(o => ({ id: o.id, data: () => o })) });
    return jest.fn();
  });

  const triggerOrders = (newOrders) => {
    if (snapshotCb) {
      snapshotCb({ docs: newOrders.map(o => ({ id: o.id, data: () => o })) });
    }
  };

  return { triggerOrders };
}

const makeOrder = (overrides = {}) => ({
  id:         'order123456',
  vendorName: 'Test Vendor',
  status:     'pending',
  total:      50.00,
  time:       '16/05/2026, 12:00:00',
  items:      [{ name: 'Burger', qty: 1, price: 50 }],
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────────────

describe('Customer Orders – rendering', () => {
  beforeEach(() => {
    mockCurrentUser = { uid: 'customer-123' };
    mockAuthLoading = false;
    jest.clearAllMocks();
  });

  it('renders the page heading', () => {
    setupOrders();
    renderOrders();
    expect(screen.getByText('My Orders')).toBeInTheDocument();
  });

  it('renders Active and History tabs', () => {
    setupOrders();
    renderOrders();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  it('shows loading when authLoading is true', () => {
    mockAuthLoading = true;
    setupOrders();
    renderOrders();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows empty state on Active tab when no active orders', () => {
    setupOrders([]);
    renderOrders();
    expect(screen.getByText(/no active orders right now/i)).toBeInTheDocument();
  });

  it('does not subscribe when currentUser is null', () => {
    mockCurrentUser = null;
    renderOrders();
    expect(mockOnSnapshot).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Active tab
// ─────────────────────────────────────────────────────────────────────────────

describe('Customer Orders – Active tab', () => {
  beforeEach(() => {
    mockCurrentUser = { uid: 'customer-123' };
    mockAuthLoading = false;
    jest.clearAllMocks();
  });

  it('shows pending orders on Active tab', async () => {
    setupOrders([makeOrder({ id: 'o1', status: 'pending' })]);
    renderOrders();
    await waitFor(() => {
      expect(screen.getByText('Test Vendor')).toBeInTheDocument();
    });
  });

  it('shows paid orders on Active tab', async () => {
    setupOrders([makeOrder({ id: 'o1', status: 'paid' })]);
    renderOrders();
    await waitFor(() => {
      expect(screen.getByText('Test Vendor')).toBeInTheDocument();
    });
  });

  it('shows preparing orders on Active tab', async () => {
    setupOrders([makeOrder({ id: 'o1', status: 'preparing' })]);
    renderOrders();
    await waitFor(() => {
      expect(screen.getByText('Test Vendor')).toBeInTheDocument();
    });
  });

  it('shows ready orders on Active tab', async () => {
    setupOrders([makeOrder({ id: 'o1', status: 'ready' })]);
    renderOrders();
    await waitFor(() => {
      expect(screen.getByText('Test Vendor')).toBeInTheDocument();
    });
  });

  it('shows badge count on Active tab when there are active orders', async () => {
    setupOrders([
      makeOrder({ id: 'o1', status: 'pending' }),
      makeOrder({ id: 'o2', status: 'preparing' }),
    ]);
    renderOrders();
    await waitFor(() => {
      const badge = document.querySelector('.cust-tab__dot');
      expect(badge).toBeInTheDocument();
      expect(badge.textContent).toBe('2');
    });
  });

  it('shows status tracker for active orders', async () => {
    setupOrders([makeOrder({ id: 'o1', status: 'pending' })]);
    renderOrders();
    await waitFor(() => {
      expect(screen.getByText('Order Received')).toBeInTheDocument();
      expect(screen.getByText('Preparing')).toBeInTheDocument();
      expect(screen.getByText('Ready for Pickup')).toBeInTheDocument();
    });
  });

  it('shows correct status pill for pending order', async () => {
    setupOrders([makeOrder({ id: 'o1', status: 'pending' })]);
    renderOrders();
    await waitFor(() => {
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  it('shows order items correctly', async () => {
    setupOrders([makeOrder({ id: 'o1', items: [{ name: 'Pizza', qty: 2, price: 80 }] })]);
    renderOrders();
    await waitFor(() => {
      expect(screen.getByText(/x2 pizza/i)).toBeInTheDocument();
      expect(screen.getByText('R 160.00')).toBeInTheDocument();
    });
  });

  it('shows order total in footer', async () => {
    setupOrders([makeOrder({ id: 'o1', total: 99.99 })]);
    renderOrders();
    await waitFor(() => {
      expect(screen.getByText('R 99.99')).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// History tab
// ─────────────────────────────────────────────────────────────────────────────

describe('Customer Orders – History tab', () => {
  beforeEach(() => {
    mockCurrentUser = { uid: 'customer-123' };
    mockAuthLoading = false;
    jest.clearAllMocks();
  });

  it('switches to History tab when clicked', () => {
    setupOrders([]);
    renderOrders();
    fireEvent.click(screen.getByText('History'));
    expect(screen.getByText(/no completed orders yet/i)).toBeInTheDocument();
  });

  it('shows completed orders on History tab', async () => {
    setupOrders([makeOrder({ id: 'o1', status: 'completed', vendorName: 'Done Vendor' })]);
    renderOrders();
    fireEvent.click(screen.getByText('History'));
    await waitFor(() => {
      expect(screen.getByText('Done Vendor')).toBeInTheDocument();
    });
  });

  it('does not show completed orders on Active tab', async () => {
    setupOrders([makeOrder({ id: 'o1', status: 'completed', vendorName: 'Done Vendor' })]);
    renderOrders();
    await waitFor(() => {
      expect(screen.queryByText('Done Vendor')).not.toBeInTheDocument();
    });
  });

  it('does not show status tracker on History tab', async () => {
    setupOrders([makeOrder({ id: 'o1', status: 'completed' })]);
    renderOrders();
    fireEvent.click(screen.getByText('History'));
    await waitFor(() => {
      expect(screen.queryByText('Order Received')).not.toBeInTheDocument();
    });
  });

  it('shows badge count on History tab when there are completed orders', async () => {
    setupOrders([
      makeOrder({ id: 'o1', status: 'completed' }),
      makeOrder({ id: 'o2', status: 'completed' }),
    ]);
    renderOrders();
    fireEvent.click(screen.getByText('History'));
    await waitFor(() => {
      const badges = document.querySelectorAll('.cust-tab__dot');
      const greyBadge = document.querySelector('.cust-tab__dot--grey');
      expect(greyBadge).toBeInTheDocument();
      expect(greyBadge.textContent).toBe('2');
    });
  });

  it('shows completed status pill on History tab', async () => {
    setupOrders([makeOrder({ id: 'o1', status: 'completed' })]);
    renderOrders();
    fireEvent.click(screen.getByText('History'));
    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });

  it('does not show cancelled orders (no cancelled status in system)', async () => {
    setupOrders([makeOrder({ id: 'o1', status: 'cancelled' })]);
    renderOrders();
    fireEvent.click(screen.getByText('History'));
    await waitFor(() => {
      expect(screen.getByText(/no completed orders yet/i)).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tab switching
// ─────────────────────────────────────────────────────────────────────────────

describe('Customer Orders – tab switching', () => {
  beforeEach(() => {
    mockCurrentUser = { uid: 'customer-123' };
    mockAuthLoading = false;
    jest.clearAllMocks();
  });

  it('Active tab has active class by default', () => {
    setupOrders([]);
    renderOrders();
    const activeTab = screen.getByText('Active').closest('button');
    expect(activeTab).toHaveClass('cust-tab--on');
  });

  it('History tab gets active class when clicked', () => {
    setupOrders([]);
    renderOrders();
    fireEvent.click(screen.getByText('History'));
    const historyTab = screen.getByText('History').closest('button');
    expect(historyTab).toHaveClass('cust-tab--on');
  });

  it('Active tab loses active class when History is selected', () => {
    setupOrders([]);
    renderOrders();
    fireEvent.click(screen.getByText('History'));
    const activeTab = screen.getByText('Active').closest('button');
    expect(activeTab).not.toHaveClass('cust-tab--on');
  });

  it('switches back to Active tab from History', () => {
    setupOrders([]);
    renderOrders();
    fireEvent.click(screen.getByText('History'));
    fireEvent.click(screen.getByText('Active'));
    expect(screen.getByText(/no active orders right now/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Status tracker steps
// ─────────────────────────────────────────────────────────────────────────────

describe('Customer Orders – status tracker', () => {
  beforeEach(() => {
    mockCurrentUser = { uid: 'customer-123' };
    mockAuthLoading = false;
    jest.clearAllMocks();
  });

  it('step 1 is active for pending order', async () => {
    setupOrders([makeOrder({ id: 'o1', status: 'pending' })]);
    renderOrders();
    await waitFor(() => {
      const steps = document.querySelectorAll('.status-step.active');
      expect(steps.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('steps 1 and 2 are active for preparing order', async () => {
    setupOrders([makeOrder({ id: 'o1', status: 'preparing' })]);
    renderOrders();
    await waitFor(() => {
      const steps = document.querySelectorAll('.status-step.active');
      expect(steps.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('all steps are active for ready order', async () => {
    setupOrders([makeOrder({ id: 'o1', status: 'ready' })]);
    renderOrders();
    await waitFor(() => {
      const steps = document.querySelectorAll('.status-step.active');
      expect(steps.length).toBe(3);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Real-time updates
// ─────────────────────────────────────────────────────────────────────────────

describe('Customer Orders – real-time updates', () => {
  beforeEach(() => {
    mockCurrentUser = { uid: 'customer-123' };
    mockAuthLoading = false;
    jest.clearAllMocks();
  });

  it('updates order list when Firestore pushes new data', async () => {
    const { triggerOrders } = setupOrders([]);
    renderOrders();

    expect(screen.getByText(/no active orders right now/i)).toBeInTheDocument();

    await act(async () => {
      triggerOrders([makeOrder({ id: 'new1', vendorName: 'New Vendor', status: 'pending' })]);
    });

    await waitFor(() => {
      expect(screen.getByText('New Vendor')).toBeInTheDocument();
    });
  });

  it('moves order from Active to History when status changes to completed', async () => {
    const { triggerOrders } = setupOrders([
      makeOrder({ id: 'o1', status: 'pending', vendorName: 'Vendor A' }),
    ]);
    renderOrders();

    await waitFor(() => screen.getByText('Vendor A'));

    await act(async () => {
      triggerOrders([makeOrder({ id: 'o1', status: 'completed', vendorName: 'Vendor A' })]);
    });

    // No longer on active tab
    await waitFor(() => {
      expect(screen.queryByText('Vendor A')).not.toBeInTheDocument();
    });

    // Now visible on history tab
    fireEvent.click(screen.getByText('History'));
    await waitFor(() => {
      expect(screen.getByText('Vendor A')).toBeInTheDocument();
    });
  });

  it('unsubscribes from Firestore on unmount', () => {
    const unsub = jest.fn();
    mockOnSnapshot.mockReturnValue(unsub);
    const { unmount } = renderOrders();
    unmount();
    expect(unsub).toHaveBeenCalled();
  });
});
















































/*import { render, screen } from "@testing-library/react";
import Orders from "./Orders";

// Mock Firebase
jest.mock("../../../Firebase/firebaseConfig", () => ({
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(() => () => {}),
}));

jest.mock("../../../Services/AuthContext", () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from "../../../Services/AuthContext";
import { onSnapshot } from "firebase/firestore";

describe("Orders", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // TEST 1
  test("shows loading when auth is loading", () => {
    useAuth.mockReturnValue({ currentUser: null, authLoading: true });

    render(<Orders />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  // TEST 2
  test("shows no orders message when user has no orders", () => {
    useAuth.mockReturnValue({
      currentUser: { uid: "123" },
      authLoading: false,
    });

    onSnapshot.mockImplementation((q, callback) => {
      callback({ docs: [] });
      return () => {};
    });

    render(<Orders />);

    expect(screen.getByText("You have no orders yet.")).toBeInTheDocument();
  });

  // TEST 3
  test("shows order with pending status on step 1", () => {
    useAuth.mockReturnValue({
      currentUser: { uid: "123" },
      authLoading: false,
    });

    onSnapshot.mockImplementation((q, callback) => {
      callback({
        docs: [{
          id: "order1",
          data: () => ({
            vendorName: "Test Shop",
            status: "pending",
            time: "2026/04/19",
            total: 100,
            items: [{ name: "Burger", price: 50, qty: 2 }],
          }),
        }],
      });
      return () => {};
    });

    render(<Orders />);

    expect(screen.getByText("Test Shop")).toBeInTheDocument();
    expect(screen.getByText("Order Received")).toBeInTheDocument();
  });

  // TEST 4
  test("shows order with preparing status on step 2", () => {
    useAuth.mockReturnValue({
      currentUser: { uid: "123" },
      authLoading: false,
    });

    onSnapshot.mockImplementation((q, callback) => {
      callback({
        docs: [{
          id: "order2",
          data: () => ({
            vendorName: "Test Shop",
            status: "preparing",
            time: "2026/04/19",
            total: 50,
            items: [{ name: "Pizza", price: 50, qty: 1 }],
          }),
        }],
      });
      return () => {};
    });

    render(<Orders />);

    expect(screen.getByText("Preparing")).toBeInTheDocument();
  });

  // TEST 5
  test("shows order with ready status on step 3", () => {
    useAuth.mockReturnValue({
      currentUser: { uid: "123" },
      authLoading: false,
    });

    onSnapshot.mockImplementation((q, callback) => {
      callback({
        docs: [{
          id: "order3",
          data: () => ({
            vendorName: "Test Shop",
            status: "ready",
            time: "2026/04/19",
            total: 75,
            items: [{ name: "Salad", price: 75, qty: 1 }],
          }),
        }],
      });
      return () => {};
    });

    render(<Orders />);

    expect(screen.getByText("Ready for Pickup")).toBeInTheDocument();
  });

  // TEST 6
  test("shows correct total price", () => {
    useAuth.mockReturnValue({
      currentUser: { uid: "123" },
      authLoading: false,
    });

    onSnapshot.mockImplementation((q, callback) => {
      callback({
        docs: [{
          id: "order4",
          data: () => ({
            vendorName: "Test Shop",
            status: "pending",
            time: "2026/04/19",
            total: 184.98,
            items: [{ name: "Fish", price: 23, qty: 1 }],
          }),
        }],
      });
      return () => {};
    });

    render(<Orders />);

    expect(screen.getByText("Total: R 184.98")).toBeInTheDocument();
  });

});*/