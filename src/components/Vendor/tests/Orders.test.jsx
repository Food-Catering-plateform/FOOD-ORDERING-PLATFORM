import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Orders from './Orders';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../Services/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../Firebase/firebaseConfig', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs:    jest.fn(),
  query:      jest.fn(),
  where:      jest.fn(),
  addDoc:     jest.fn(),
  updateDoc:  jest.fn(),
  doc:        jest.fn(),
  deleteDoc:  jest.fn(),
}));
jest.mock('./Orders.css', () => ({}));

import { useAuth } from '../../Services/AuthContext';
import { getDocs, query, collection, where } from 'firebase/firestore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VENDOR_ID = 'vendor-abc';

const MOCK_ORDERS = [
  {
    id: 'order-1',
    vendorID: VENDOR_ID,
    status: 'pending',
    customerName: 'Alice Dube',
    time: '10:00',
    total: 75.00,
    notes: 'No onions',
    items: [
      { name: 'Burger', qty: 1, price: 50 },
      { name: 'Fries',  qty: 1, price: 25 },
    ],
  },
  {
    id: 'order-2',
    vendorID: VENDOR_ID,
    status: 'preparing',
    customerName: 'Bob Nkosi',
    time: '10:15',
    total: 40.00,
    notes: '',
    items: [{ name: 'Wrap', qty: 2, price: 20 }],
  },
  {
    id: 'order-3',
    vendorID: VENDOR_ID,
    status: 'completed',
    customerName: 'Carol Mokoena',
    time: '09:30',
    total: 30.00,
    notes: '',
    items: [{ name: 'Juice', qty: 3, price: 10 }],
  },
];

function makeDocs(orders) {
  return {
    docs: orders.map(o => ({
      id: o.id,
      data: () => { const { id, ...rest } = o; return rest; },
    })),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ vendorId: VENDOR_ID });
  query.mockReturnValue('mock-query');
  collection.mockReturnValue('orders-ref');
  where.mockReturnValue('where-clause');
  getDocs.mockResolvedValue(makeDocs(MOCK_ORDERS));
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Orders – rendering', () => {
  it('renders the Orders heading', () => {
    render(<Orders />);
    expect(screen.getByRole('heading', { name: /orders/i })).toBeInTheDocument();
  });

  it('fetches and displays orders on mount', async () => {
    render(<Orders />);
    expect(await screen.findByText('Alice Dube')).toBeInTheDocument();
    expect(screen.getByText('Bob Nkosi')).toBeInTheDocument();
  });

  it('builds the Firestore query with the correct vendorID', async () => {
    render(<Orders />);
    await screen.findByText('Alice Dube');
    expect(where).toHaveBeenCalledWith('vendorID', '==', VENDOR_ID);
  });

  it('does not fetch when vendorId is absent', () => {
    useAuth.mockReturnValue({ vendorId: null });
    render(<Orders />);
    expect(getDocs).not.toHaveBeenCalled();
  });

  it('renders all filter tab buttons', async () => {
    render(<Orders />);
    await screen.findByText('Alice Dube');
    ['All', 'Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'].forEach(label => {
      expect(screen.getByRole('button', { name: new RegExp(label, 'i') })).toBeInTheDocument();
    });
  });

  it('shows status summary badge counts', async () => {
    render(<Orders />);
    await screen.findByText('Alice Dube');
    const badges = document.querySelectorAll('.summary-count');
    const values = Array.from(badges).map(b => b.textContent);
    expect(values).toContain('1');
  });

  it('renders item quantities and prices inside an order', async () => {
    render(<Orders />);
    await screen.findByText('Burger');
    expect(screen.getByText('x1')).toBeInTheDocument();
    expect(screen.getByText('R 50.00')).toBeInTheDocument();
  });

  it('renders order notes when present', async () => {
    render(<Orders />);
    await screen.findByText('Alice Dube');
    expect(screen.getByText(/no onions/i)).toBeInTheDocument();
  });

  it('does not render a notes element when notes is empty', async () => {
    render(<Orders />);
    await screen.findByText('Alice Dube');
    const notes = document.querySelectorAll('.order-notes');
    expect(notes).toHaveLength(1);
  });

  it('displays order totals correctly', async () => {
    render(<Orders />);
    await screen.findByText('Alice Dube');
    expect(screen.getByText('R 75.00')).toBeInTheDocument();
  });

  it('does not render a Seed Test Data button', async () => {
    render(<Orders />);
    await screen.findByText('Alice Dube');
    expect(screen.queryByRole('button', { name: /seed test data/i })).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Orders – filtering', () => {
  it('shows all orders when "All" filter is active by default', async () => {
    render(<Orders />);
    await screen.findByText('Alice Dube');
    expect(screen.getByText('Bob Nkosi')).toBeInTheDocument();
    expect(screen.getByText('Carol Mokoena')).toBeInTheDocument();
  });

  it('filters to only pending orders when Pending tab is clicked', async () => {
    render(<Orders />);
    await screen.findByText('Alice Dube');

    await userEvent.click(screen.getByRole('button', { name: /pending/i }));

    expect(screen.getByText('Alice Dube')).toBeInTheDocument();
    expect(screen.queryByText('Bob Nkosi')).not.toBeInTheDocument();
    expect(screen.queryByText('Carol Mokoena')).not.toBeInTheDocument();
  });

  it('filters to only preparing orders when Preparing tab is clicked', async () => {
    render(<Orders />);
    await screen.findByText('Alice Dube');

    await userEvent.click(screen.getByRole('button', { name: /preparing/i }));

    expect(screen.getByText('Bob Nkosi')).toBeInTheDocument();
    expect(screen.queryByText('Alice Dube')).not.toBeInTheDocument();
  });

  it('shows empty state message when no orders match the filter', async () => {
    render(<Orders />);
    await screen.findByText('Alice Dube');

    await userEvent.click(screen.getByRole('button', { name: /^ready/i }));

    expect(screen.getByText(/no ready orders at the moment/i)).toBeInTheDocument();
  });

  it('shows generic empty state when "All" filter has no orders', async () => {
    getDocs.mockResolvedValueOnce(makeDocs([]));
    render(<Orders />);
    await waitFor(() =>
      expect(screen.getByText(/no orders at the moment/i)).toBeInTheDocument()
    );
  });

  it('marks the active filter button with the "active" class', async () => {
    render(<Orders />);
    await screen.findByText('Alice Dube');

    const pendingBtn = screen.getByRole('button', { name: /pending/i });
    await userEvent.click(pendingBtn);
    expect(pendingBtn).toHaveClass('active');
  });

  it('"All" button has the "active" class by default', async () => {
    render(<Orders />);
    await screen.findByText('Alice Dube');
    expect(screen.getByRole('button', { name: /^all$/i })).toHaveClass('active');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Orders – status advancement', () => {
  it('advances a pending order to preparing', async () => {
    render(<Orders />);
    await screen.findByText('Alice Dube');

    await userEvent.click(screen.getByRole('button', { name: /mark as preparing/i }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /mark as preparing/i })).not.toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: /mark as ready/i })).toBeInTheDocument();
  });

  it('advances a preparing order to ready', async () => {
    render(<Orders />);
    await screen.findByText('Bob Nkosi');

    await userEvent.click(screen.getByRole('button', { name: /mark as ready/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /mark as completed/i })).toBeInTheDocument()
    );
  });

  it('does not show an advance button for completed orders', async () => {
    render(<Orders />);
    await screen.findByText('Carol Mokoena');

    const completedCard = document.querySelector('.order-card--completed');
    expect(completedCard.querySelector('.btn--advance')).toBeNull();
  });

  it('does not show an advance button for cancelled orders', async () => {
    render(<Orders />);
    await screen.findByText('Alice Dube');

    await userEvent.click(screen.getAllByRole('button', { name: /cancel/i })[0]);

    await waitFor(() => {
      const cancelledCard = document.querySelector('.order-card--cancelled');
      expect(cancelledCard?.querySelector('.btn--advance')).toBeNull();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Orders – cancellation', () => {
  it('cancels a pending order and updates its status badge', async () => {
    render(<Orders />);
    await screen.findByText('Alice Dube');

    await userEvent.click(screen.getAllByRole('button', { name: /cancel/i })[0]);

    await waitFor(() =>
      expect(document.querySelector('.status-badge--cancelled')).toBeInTheDocument()
    );
  });

  it('cancels a preparing order', async () => {
    render(<Orders />);
    await screen.findByText('Bob Nkosi');

    await userEvent.click(screen.getAllByRole('button', { name: /cancel/i })[1]);

    await waitFor(() => {
      const cancelledBadges = document.querySelectorAll('.status-badge--cancelled');
      expect(cancelledBadges.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('does not show a Cancel button for completed orders', async () => {
    render(<Orders />);
    await screen.findByText('Carol Mokoena');

    const completedCard = document.querySelector('.order-card--completed');
    expect(completedCard.querySelector('.btn--cancel')).toBeNull();
  });

  it('hides the Cancel button after an order is cancelled', async () => {
    render(<Orders />);
    await screen.findByText('Alice Dube');

    await userEvent.click(screen.getAllByRole('button', { name: /cancel/i })[0]);

    await waitFor(() => {
      const cancelledCard = document.querySelector('.order-card--cancelled');
      expect(cancelledCard?.querySelector('.btn--cancel')).toBeNull();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Orders – error handling', () => {
  it('logs an error and does not crash when getDocs fails', async () => {
    getDocs.mockRejectedValueOnce(new Error('Firestore error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<Orders />);

    await waitFor(() =>
      expect(consoleSpy).toHaveBeenCalledWith('Unable to fetch orders', expect.any(Error))
    );
    consoleSpy.mockRestore();
  });

  it('renders an empty list gracefully when fetch returns no orders', async () => {
    getDocs.mockResolvedValueOnce(makeDocs([]));
    render(<Orders />);
    await waitFor(() =>
      expect(screen.getByText(/no orders at the moment/i)).toBeInTheDocument()
    );
  });
});