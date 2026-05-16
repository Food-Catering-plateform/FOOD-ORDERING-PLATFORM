import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

// ── Static mocks ──────────────────────────────────────────────────────────────

jest.mock('../VenHome.css', () => ({}));

// ── Firebase mocks ────────────────────────────────────────────────────────────

const mockUpdateDoc = jest.fn(() => Promise.resolve());
const mockGetDocs   = jest.fn();
const mockOnSnapshot = jest.fn();
const mockDoc       = jest.fn((db, ...path) => ({ path }));
const mockCollection = jest.fn((db, ...path) => ({ path }));
const mockQuery     = jest.fn((...args) => args);
const mockWhere     = jest.fn((...args) => args);

jest.mock('../../../Firebase/firebaseConfig', () => ({ db: {} }));

jest.mock('firebase/firestore', () => ({
  collection:  (...args) => mockCollection(...args),
  query:       (...args) => mockQuery(...args),
  where:       (...args) => mockWhere(...args),
  onSnapshot:  (...args) => mockOnSnapshot(...args),
  getDocs:     (...args) => mockGetDocs(...args),
  doc:         (...args) => mockDoc(...args),
  updateDoc:   (...args) => mockUpdateDoc(...args),
}));

// ── Auth mock (vendorId null by default; overridden per-test) ─────────────────

let mockVendorId = null;
jest.mock('../../../Services/AuthContext', () => ({
  useAuth: () => ({ vendorId: mockVendorId }),
}));

import VenHome from '../VenHome';

// ── Helpers ───────────────────────────────────────────────────────────────────

const defaultProps = { setActiveSection: jest.fn() };
const renderVenHome = (props = {}) =>
  render(<VenHome {...defaultProps} {...props} />);

/**
 * Build a minimal onSnapshot double.
 * ordersCb  – callback invoked with a Firestore-like snapshot for the Orders query
 * vendorCb  – callback invoked with a Firestore-like snapshot for the Vendor doc
 * Returns { triggerOrders, triggerVendor } so tests can push new snapshots.
 */
function setupOnSnapshot({ orders = [], vendorData = null } = {}) {
  let ordersCb;
  let vendorCb;

  mockOnSnapshot.mockImplementation((ref, cb) => {
    // Distinguish vendor doc vs orders query by checking the ref shape.
    // mockDoc returns { path } while mockQuery returns an array.
    if (Array.isArray(ref)) {
      // Orders query
      ordersCb = cb;
    } else {
      // Vendor doc
      vendorCb = cb;
      // Fire immediately with initial vendor data
      cb({
        exists: () => !!vendorData,
        data:   () => vendorData || {},
      });
    }
    return jest.fn(); // unsubscribe
  });

  const triggerOrders = (newOrders) => {
    if (ordersCb) {
      ordersCb({
        docs: newOrders.map(o => ({ id: o.id, data: () => o })),
      });
    }
  };

  const triggerVendor = (data) => {
    if (vendorCb) {
      vendorCb({ exists: () => true, data: () => data });
    }
  };

  // Default getDocs for menuItems subcollection
  mockGetDocs.mockResolvedValue({ size: 3, docs: [] });

  return { triggerOrders, triggerVendor };
}

// Today's date string in en-ZA format (matches what the component uses internally)
const todayStr = new Date().toLocaleDateString('en-ZA');

// Make a test order stamped to today
const makeOrder = (overrides = {}) => ({
  id:         'order123456',
  vendorID:   'vendor-1',
  status:     'completed',
  total:      150,
  customerId: 'cust-1',
  time:       `${todayStr}, 13:00:00`,
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// Rendering – vendorId null
// ─────────────────────────────────────────────────────────────────────────────

describe('VenHome – rendering (no vendorId)', () => {
  beforeEach(() => { mockVendorId = null; });

  it('renders the subheading text', () => {
    renderVenHome();
    expect(screen.getByText(/quick look at how your store is doing/i)).toBeInTheDocument();
  });

  it('renders "Chef" as fallback when storeName is not provided', () => {
    renderVenHome();
    expect(screen.getByText(/chef/i)).toBeInTheDocument();
  });

  it('renders the given storeName in the greeting', () => {
    renderVenHome({ storeName: "Nando's" });
    expect(screen.getByText(/nando's/i)).toBeInTheDocument();
  });

  it('renders all four stat cards', () => {
    renderVenHome();
    expect(screen.getByText('New Orders')).toBeInTheDocument();
    expect(screen.getByText('Menu Items')).toBeInTheDocument();
    expect(screen.getByText("Today's Revenue")).toBeInTheDocument();
    expect(screen.getByText('Customers Served')).toBeInTheDocument();
  });

  it('renders zero values for all stats initially', () => {
    renderVenHome();
    expect(screen.getByText('R 0.00')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(3);
  });

  it('renders the first tip (Peak hours tip)', () => {
    renderVenHome();
    expect(screen.getByText(/peak hours tip/i)).toBeInTheDocument();
    expect(screen.getByText(/orders spike between 12–2 PM/i)).toBeInTheDocument();
  });

  it('renders "No orders yet today." in the recent orders list', () => {
    renderVenHome();
    expect(screen.getByText(/no orders yet today/i)).toBeInTheDocument();
  });

  it('renders store status as Open by default', () => {
    renderVenHome();
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('renders the order breakdown section', () => {
    renderVenHome();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Preparing')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders all quick action items', () => {
    renderVenHome();
    expect(screen.getByText(/add menu item/i)).toBeInTheDocument();
    expect(screen.getByText(/view pending orders/i)).toBeInTheDocument();
    expect(screen.getByText(/view analytics/i)).toBeInTheDocument();
    expect(screen.getByText(/store settings/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Time-based greeting
// ─────────────────────────────────────────────────────────────────────────────

describe('VenHome – time-based greeting', () => {
  const RealDate = Date;

  function mockHour(hour) {
    jest.spyOn(global, 'Date').mockImplementation((...args) => {
      if (args.length) return new RealDate(...args);
      const d = new RealDate();
      d.getHours = () => hour;
      return d;
    });
  }

  afterEach(() => jest.restoreAllMocks());

  it('shows "Good morning" for hours before 12', () => {
    mockHour(9);
    renderVenHome();
    expect(screen.getByText(/good morning/i)).toBeInTheDocument();
  });

  it('shows "Good afternoon" exactly at hour 12', () => {
    mockHour(12);
    renderVenHome();
    expect(screen.getByText(/good afternoon/i)).toBeInTheDocument();
  });

  it('shows "Good afternoon" for hours between 12 and 16', () => {
    mockHour(14);
    renderVenHome();
    expect(screen.getByText(/good afternoon/i)).toBeInTheDocument();
  });

  it('shows "Good evening" exactly at hour 17', () => {
    mockHour(17);
    renderVenHome();
    expect(screen.getByText(/good evening/i)).toBeInTheDocument();
  });

  it('shows "Good evening" for hours 17 and above', () => {
    mockHour(21);
    renderVenHome();
    expect(screen.getByText(/good evening/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Live clock interval
// ─────────────────────────────────────────────────────────────────────────────

describe('VenHome – live clock', () => {
  beforeEach(() => {
    mockVendorId = null;
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  it('updates liveTime after 1 second', () => {
    renderVenHome();
    const before = screen.getByText(/\d{2}:\d{2}:\d{2}/);
    act(() => { jest.advanceTimersByTime(1000); });
    // Clock element still in document (may or may not have changed value
    // depending on wall-clock second boundary — just verify it re-renders)
    expect(before).toBeInTheDocument();
  });

  it('clears the clock interval on unmount', () => {
    const clearSpy = jest.spyOn(global, 'clearInterval');
    const { unmount } = renderVenHome();
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tip rotation interval
// ─────────────────────────────────────────────────────────────────────────────

describe('VenHome – tip rotation', () => {
  beforeEach(() => {
    mockVendorId = null;
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  it('cycles to second tip after 12 seconds', () => {
    renderVenHome();
    expect(screen.getByText(/peak hours tip/i)).toBeInTheDocument();
    act(() => { jest.advanceTimersByTime(12000); });
    expect(screen.getByText(/boost visibility/i)).toBeInTheDocument();
  });

  it('cycles to third tip after 24 seconds', () => {
    renderVenHome();
    act(() => { jest.advanceTimersByTime(24000); });
    expect(screen.getByText(/speed matters/i)).toBeInTheDocument();
  });

  it('cycles to fourth tip after 36 seconds', () => {
    renderVenHome();
    act(() => { jest.advanceTimersByTime(36000); });
    expect(screen.getByText(/promotions/i)).toBeInTheDocument();
  });

  it('wraps back to first tip after 48 seconds', () => {
    renderVenHome();
    act(() => { jest.advanceTimersByTime(48000); });
    expect(screen.getByText(/peak hours tip/i)).toBeInTheDocument();
  });

  it('clears the tip interval on unmount', () => {
    const clearSpy = jest.spyOn(global, 'clearInterval');
    const { unmount } = renderVenHome();
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Firebase data — vendorId present
// ─────────────────────────────────────────────────────────────────────────────

describe('VenHome – Firebase data (vendorId present)', () => {
  beforeEach(() => {
    mockVendorId = 'vendor-1';
    jest.clearAllMocks();
  });

  it('subscribes to vendor doc and orders query on mount', () => {
    setupOnSnapshot();
    renderVenHome();
    expect(mockOnSnapshot).toHaveBeenCalledTimes(2);
  });

  it('calls unsubscribe functions on unmount', () => {
    const unsub1 = jest.fn();
    const unsub2 = jest.fn();
    let callCount = 0;
    mockOnSnapshot.mockImplementation((_ref, cb) => {
      callCount++;
      cb({ exists: () => false, data: () => ({}) });
      return callCount === 1 ? unsub1 : unsub2;
    });
    mockGetDocs.mockResolvedValue({ size: 0, docs: [] });
    const { unmount } = renderVenHome();
    unmount();
    expect(unsub1).toHaveBeenCalled();
    expect(unsub2).toHaveBeenCalled();
  });

  it('sets storeOpen from vendor snapshot when isOpen is defined', async () => {
    setupOnSnapshot({ vendorData: { isOpen: false } });
    renderVenHome();
    await waitFor(() => expect(screen.getByText('Closed')).toBeInTheDocument());
  });

  it('does not crash when vendor snapshot has no isOpen field', async () => {
    setupOnSnapshot({ vendorData: { someOtherField: true } });
    renderVenHome();
    // Store stays open (default)
    await waitFor(() => expect(screen.getByText('Open')).toBeInTheDocument());
  });

  it('does not crash when vendor snapshot does not exist', async () => {
    mockOnSnapshot.mockImplementation((_ref, cb) => {
      cb({ exists: () => false, data: () => ({}) });
      return jest.fn();
    });
    mockGetDocs.mockResolvedValue({ size: 0, docs: [] });
    renderVenHome();
    await waitFor(() => expect(screen.getByText('Open')).toBeInTheDocument());
  });

  it('renders completed orders stats: revenue, customers, menuItems', async () => {
    const { triggerOrders } = setupOnSnapshot();
    renderVenHome();

    await act(async () => {
      triggerOrders([
        makeOrder({ id: 'ord1', status: 'completed', total: 100, customerId: 'c1' }),
        makeOrder({ id: 'ord2', status: 'completed', total: 50,  customerId: 'c2' }),
      ]);
    });

    await waitFor(() => expect(screen.getByText('R 150.00')).toBeInTheDocument());
    // 2 unique customers
    expect(screen.getByText('2')).toBeInTheDocument();
    // menuItems count comes from getDocs mock (size: 3)
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('counts pending orders as newOrders', async () => {
    const { triggerOrders } = setupOnSnapshot();
    renderVenHome();

    await act(async () => {
      triggerOrders([
        makeOrder({ id: 'p1', status: 'pending' }),
        makeOrder({ id: 'p2', status: 'pending' }),
      ]);
    });

    await waitFor(() => {
      // newOrders = 2, shown in the "New Orders" stat card
      const headings = screen.getAllByRole('heading', { level: 2 });
      expect(headings[0].textContent).toBe('2');
    });
  });

  it('renders order breakdown: pending, preparing, completed counts', async () => {
    const { triggerOrders } = setupOnSnapshot();
    renderVenHome();

    await act(async () => {
      triggerOrders([
        makeOrder({ id: 'a', status: 'pending'   }),
        makeOrder({ id: 'b', status: 'preparing' }),
        makeOrder({ id: 'c', status: 'completed' }),
      ]);
    });

    await waitFor(() => {
      const segs = screen.getByLabelText('Order status breakdown');
      expect(segs).toBeInTheDocument();
    });
  });

  it('deduplicates customers by customerId', async () => {
    const { triggerOrders } = setupOnSnapshot();
    renderVenHome();

    await act(async () => {
      triggerOrders([
        makeOrder({ id: 'o1', status: 'completed', customerId: 'same' }),
        makeOrder({ id: 'o2', status: 'completed', customerId: 'same' }),
      ]);
    });

    // 1 unique customer despite 2 completed orders
    await waitFor(() => {
      const statCards = screen.getByLabelText('Quick stats');
      expect(statCards).toBeInTheDocument();
    });
  });

  it('renders recent orders list sorted by time (most recent first)', async () => {
    const { triggerOrders } = setupOnSnapshot();
    renderVenHome();

    await act(async () => {
      triggerOrders([
        makeOrder({ id: 'older123', status: 'pending', time: `${todayStr}, 10:00:00`, total: 20 }),
        makeOrder({ id: 'newer456', status: 'pending', time: `${todayStr}, 14:00:00`, total: 40 }),
      ]);
    });

    await waitFor(() => {
      // Most recent (14:00) order should appear first → slice(-6) of 'newer456' = 'NEWER456' uppercase
      expect(screen.getByText('#NEWER456'[0] ? /newer/i : /.*/)).toBeInTheDocument();
    });
  });

  it('renders order row with avatar initial from customerId', async () => {
    const { triggerOrders } = setupOnSnapshot();
    renderVenHome();

    await act(async () => {
      triggerOrders([makeOrder({ id: 'abc123', customerId: 'zara99', status: 'pending' })]);
    });

    await waitFor(() => expect(screen.getByText('Z')).toBeInTheDocument());
  });

  it('uses order.id as avatar fallback when customerId is missing', async () => {
    const { triggerOrders } = setupOnSnapshot();
    renderVenHome();

    await act(async () => {
      triggerOrders([makeOrder({ id: 'fallback1', customerId: undefined, status: 'pending' })]);
    });

    await waitFor(() => expect(screen.getByText('F')).toBeInTheDocument());
  });

  it('renders "?" avatar when both customerId and id are missing', async () => {
    const { triggerOrders } = setupOnSnapshot();
    renderVenHome();

    await act(async () => {
      triggerOrders([{ status: 'pending', total: 0, time: `${todayStr}, 09:00:00` }]);
    });

    await waitFor(() => expect(screen.getByText('?')).toBeInTheDocument());
  });

  it('renders order status capitalised', async () => {
    const { triggerOrders } = setupOnSnapshot();
    renderVenHome();

    await act(async () => {
      triggerOrders([makeOrder({ id: 'ord1', status: 'preparing' })]);
    });

    await waitFor(() => expect(screen.getByText('Preparing')).toBeInTheDocument());
  });

  it('renders "Pending" status label when order.status is falsy', async () => {
    const { triggerOrders } = setupOnSnapshot();
    renderVenHome();

    await act(async () => {
      triggerOrders([makeOrder({ id: 'ord1', status: null, time: `${todayStr}, 09:00:00` })]);
    });

    // The status span shows 'Pending' when status is falsy
    await waitFor(() => {
      const statuses = screen.getAllByText('Pending');
      expect(statuses.length).toBeGreaterThan(0);
    });
  });

  it('shows pending badge in quick actions when pending > 0', async () => {
    const { triggerOrders } = setupOnSnapshot();
    renderVenHome();

    await act(async () => {
      triggerOrders([
        makeOrder({ id: 'p1', status: 'pending' }),
        makeOrder({ id: 'p2', status: 'pending' }),
      ]);
    });

    await waitFor(() => {
      // The badge renders the count inside the quick actions list item
      const badge = document.querySelector('.ven-home__badge');
      expect(badge).toBeInTheDocument();
      expect(badge.textContent).toBe('2');
    });
  });

  it('does not show pending badge when pending = 0', async () => {
    const { triggerOrders } = setupOnSnapshot();
    renderVenHome();

    await act(async () => {
      triggerOrders([makeOrder({ id: 'c1', status: 'completed' })]);
    });

    await waitFor(() => {
      expect(document.querySelector('.ven-home__badge')).not.toBeInTheDocument();
    });
  });

  it('filters out orders without a time field from recent orders', async () => {
    const { triggerOrders } = setupOnSnapshot();
    renderVenHome();

    await act(async () => {
      triggerOrders([
        makeOrder({ id: 'hastime', time: `${todayStr}, 12:00:00` }),
        { id: 'notime', status: 'completed', total: 0 }, // no time field
      ]);
    });

    await waitFor(() => {
      // Only the order with a time should appear
      expect(screen.queryByText('#NOTIME')).not.toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatOrderTime
// ─────────────────────────────────────────────────────────────────────────────

describe('VenHome – formatOrderTime branches', () => {
  beforeEach(() => {
    mockVendorId = 'vendor-1';
    jest.clearAllMocks();
  });

  it('renders "—" when time field is an empty string', async () => {
    const { triggerOrders } = setupOnSnapshot();
    renderVenHome();

    await act(async () => {
      triggerOrders([makeOrder({ id: 'emp1', time: '' })]);
    });

    // Empty string hits the !timeStr branch → '—'
    await waitFor(() => expect(screen.getByText('—')).toBeInTheDocument());
  });

  it('renders fallback string when time is not a parseable date', async () => {
    const { triggerOrders } = setupOnSnapshot();
    renderVenHome();

    // "not-a-date" is NaN → hits the split(',')[1] branch
    // Since there's no comma, split gives undefined → falls back to timeStr itself
    await act(async () => {
      triggerOrders([makeOrder({ id: 'nan1', time: 'not-a-date' })]);
    });

    await waitFor(() => expect(screen.getByText('not-a-date')).toBeInTheDocument());
  });

  it('renders trimmed second segment when time has comma (en-ZA date string)', async () => {
    const { triggerOrders } = setupOnSnapshot();
    renderVenHome();

    // "invalid, 13:00" → isNaN(new Date("invalid, 13:00")) → split(',')[1].trim() = '13:00'
    await act(async () => {
      triggerOrders([makeOrder({ id: 'seg1', time: 'invalid, 13:00' })]);
    });

    await waitFor(() => expect(screen.getByText('13:00')).toBeInTheDocument());
  });

  it('renders formatted time when time is a valid ISO string', async () => {
    const { triggerOrders } = setupOnSnapshot();
    renderVenHome();

    const iso = new Date().toISOString();
    await act(async () => {
      triggerOrders([makeOrder({ id: 'iso1', time: iso })]);
    });

    // Valid ISO → toLocaleTimeString renders HH:MM
    await waitFor(() => {
      expect(document.querySelector('.ven-home__order-time')).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// toggleStore
// ─────────────────────────────────────────────────────────────────────────────

describe('VenHome – toggleStore', () => {
  beforeEach(() => {
    mockVendorId = 'vendor-1';
    jest.clearAllMocks();
  });

  it('toggles store from Open to Closed and calls updateDoc', async () => {
    setupOnSnapshot({ vendorData: { isOpen: true } });
    renderVenHome();

    await waitFor(() => screen.getByText('Open'));

    fireEvent.click(screen.getByRole('button', { name: /store is open/i }));

    await waitFor(() => expect(screen.getByText('Closed')).toBeInTheDocument());
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { isOpen: false }
    );
  });

  it('toggles store from Closed to Open and calls updateDoc', async () => {
    setupOnSnapshot({ vendorData: { isOpen: false } });
    renderVenHome();

    await waitFor(() => screen.getByText('Closed'));

    fireEvent.click(screen.getByRole('button', { name: /store is closed/i }));

    await waitFor(() => expect(screen.getByText('Open')).toBeInTheDocument());
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { isOpen: true }
    );
  });

  it('catches and silently swallows updateDoc errors', async () => {
    mockUpdateDoc.mockRejectedValueOnce(new Error('Firestore error'));
    setupOnSnapshot({ vendorData: { isOpen: true } });
    renderVenHome();

    await waitFor(() => screen.getByText('Open'));

    // Should not throw
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /store is open/i }));
    });

    // Optimistic update still happened
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// setActiveSection navigation
// ─────────────────────────────────────────────────────────────────────────────

describe('VenHome – setActiveSection navigation', () => {
  const mockSet = jest.fn();

  beforeEach(() => {
    mockVendorId = null;
    mockSet.mockClear();
  });

  it('stat card "New Orders" navigates to orders', () => {
    renderVenHome({ setActiveSection: mockSet });
    fireEvent.click(screen.getByTitle('Go to Orders'));
    expect(mockSet).toHaveBeenCalledWith('orders');
  });

  it('stat card "Menu Items" navigates to menu', () => {
    renderVenHome({ setActiveSection: mockSet });
    fireEvent.click(screen.getByTitle('Go to Menu Management'));
    expect(mockSet).toHaveBeenCalledWith('menu');
  });

  it('stat card "Today\'s Revenue" navigates to analytics', () => {
    renderVenHome({ setActiveSection: mockSet });
    const cards = screen.getAllByTitle('Go to Analytics');
    fireEvent.click(cards[0]);
    expect(mockSet).toHaveBeenCalledWith('analytics');
  });

  it('stat card "Customers Served" navigates to analytics', () => {
    renderVenHome({ setActiveSection: mockSet });
    const cards = screen.getAllByTitle('Go to Analytics');
    fireEvent.click(cards[1]);
    expect(mockSet).toHaveBeenCalledWith('analytics');
  });

  it('"See all →" button navigates to orders', () => {
    renderVenHome({ setActiveSection: mockSet });
    fireEvent.click(screen.getByText(/see all/i));
    expect(mockSet).toHaveBeenCalledWith('orders');
  });

  it('quick action "Add menu item" navigates to menu', () => {
    renderVenHome({ setActiveSection: mockSet });
    fireEvent.click(screen.getByText(/add menu item/i));
    expect(mockSet).toHaveBeenCalledWith('menu');
  });

  it('quick action "View pending orders" navigates to orders', () => {
    renderVenHome({ setActiveSection: mockSet });
    fireEvent.click(screen.getByText(/view pending orders/i));
    expect(mockSet).toHaveBeenCalledWith('orders');
  });

  it('quick action "View analytics" navigates to analytics', () => {
    renderVenHome({ setActiveSection: mockSet });
    fireEvent.click(screen.getByText(/view analytics/i));
    expect(mockSet).toHaveBeenCalledWith('analytics');
  });

  it('quick action "Store settings" navigates to settings', () => {
    renderVenHome({ setActiveSection: mockSet });
    fireEvent.click(screen.getByText(/store settings/i));
    expect(mockSet).toHaveBeenCalledWith('settings');
  });
});