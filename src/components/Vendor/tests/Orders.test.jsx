import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('firebase/firestore', () => ({
  collection:  jest.fn(),
  query:       jest.fn(),
  where:       jest.fn(),
  updateDoc:   jest.fn(),
  doc:         jest.fn(),
  onSnapshot:  jest.fn(),
}));

jest.mock('../../../Services/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../Firebase/firebaseConfig', () => ({ db: {} }));
jest.mock('../../../Services/pickupReadyEmail', () => ({
  sendOrderReadyForPickupEmail: jest.fn(),
}));
jest.mock('../Orders.css', () => ({}));

import Orders from '../Orders';
import { useAuth } from '../../../Services/AuthContext';
import { collection, query, where, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { sendOrderReadyForPickupEmail } from '../../../Services/pickupReadyEmail';

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

// Simulates onSnapshot: calls the success callback immediately with the given orders,
// and returns a no-op unsubscribe function.
function mockSnapshot(orders) {
  onSnapshot.mockImplementation((q, onNext, onError) => {
    const docs = orders.map(o => ({
      id: o.id,
      data: () => { const { id, ...rest } = o; return rest; },
    }));
    onNext({ docs });
    return jest.fn(); // unsubscribe
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ vendorId: VENDOR_ID });
  query.mockReturnValue('mock-query');
  collection.mockReturnValue('orders-ref');
  where.mockReturnValue('where-clause');
  doc.mockReturnValue('doc-ref');
  updateDoc.mockResolvedValue();
  sendOrderReadyForPickupEmail.mockResolvedValue({ ok: true });
  mockSnapshot(MOCK_ORDERS);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Orders – rendering', () => {
  it('renders the Orders heading', () => {
    render(<Orders />);
    expect(screen.getByRole('heading', { name: /^orders$/i })).toBeInTheDocument();
  });

  it('fetches and displays orders on mount via onSnapshot', async () => {
    render(<Orders />);
    expect(await screen.findByText('Alice Dube')).toBeInTheDocument();
    expect(screen.getByText('Bob Nkosi')).toBeInTheDocument();
  });

  it('builds the Firestore query with the correct vendorID', async () => {
    render(<Orders />);
    await screen.findByText('Alice Dube');
    expect(where).toHaveBeenCalledWith('vendorID', '==', VENDOR_ID);
    expect(onSnapshot).toHaveBeenCalledWith('mock-query', expect.any(Function), expect.any(Function));
  });

  it('does not subscribe when vendorId is absent', () => {
    useAuth.mockReturnValue({ vendorId: null });
    render(<Orders />);
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it('calls the unsubscribe function on unmount', () => {
    const unsubscribe = jest.fn();
    onSnapshot.mockReturnValue(unsubscribe);
    const { unmount } = render(<Orders />);
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
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

    await userEvent.click(screen.getByRole('button', { name: /^pending/i }));

    expect(screen.getByText('Alice Dube')).toBeInTheDocument();
    expect(screen.queryByText('Bob Nkosi')).not.toBeInTheDocument();
    expect(screen.queryByText('Carol Mokoena')).not.toBeInTheDocument();
  });

  it('filters to only preparing orders when Preparing tab is clicked', async () => {
    render(<Orders />);
    await screen.findByText('Alice Dube');

    await userEvent.click(screen.getByRole('button', { name: /^preparing/i }));

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
    mockSnapshot([]);
    render(<Orders />);
    await waitFor(() =>
      expect(screen.getByText(/no orders at the moment/i)).toBeInTheDocument()
    );
  });

  it('marks the active filter button with the "active" class', async () => {
    render(<Orders />);
    await screen.findByText('Alice Dube');

    const pendingBtn = screen.getByRole('button', { name: /^pending/i });
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

  it('calls updateDoc with the correct new status when advancing', async () => {
    render(<Orders />);
    await screen.findByText('Alice Dube');

    await userEvent.click(screen.getByRole('button', { name: /mark as preparing/i }));

    await waitFor(() =>
      expect(updateDoc).toHaveBeenCalledWith('doc-ref', { status: 'preparing' })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Orders – pickup email', () => {
  it('sends a pickup email when an order is advanced to ready', async () => {
    render(<Orders />);
    await screen.findByText('Bob Nkosi');

    await userEvent.click(screen.getByRole('button', { name: /mark as ready/i }));

    await waitFor(() =>
      expect(sendOrderReadyForPickupEmail).toHaveBeenCalledTimes(1)
    );
    expect(sendOrderReadyForPickupEmail).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-2', status: 'ready' })
    );
  });

  it('marks pickupEmailSent in Firestore after a successful email send', async () => {
    render(<Orders />);
    await screen.findByText('Bob Nkosi');

    await userEvent.click(screen.getByRole('button', { name: /mark as ready/i }));

    await waitFor(() =>
      expect(updateDoc).toHaveBeenCalledWith(
        'doc-ref',
        expect.objectContaining({ pickupEmailSent: true })
      )
    );
  });

  it('does not send a pickup email if pickupEmailSent is already true', async () => {
    const alreadySentOrder = {
      ...MOCK_ORDERS[1],
      pickupEmailSent: true,
    };
    mockSnapshot([alreadySentOrder, ...MOCK_ORDERS.slice(2)]);

    render(<Orders />);
    await screen.findByText('Bob Nkosi');

    await userEvent.click(screen.getByRole('button', { name: /mark as ready/i }));

    await waitFor(() => expect(updateDoc).toHaveBeenCalled());
    expect(sendOrderReadyForPickupEmail).not.toHaveBeenCalled();
  });

  it('does not send a pickup email when advancing to a non-ready status', async () => {
    render(<Orders />);
    await screen.findByText('Alice Dube');

    await userEvent.click(screen.getByRole('button', { name: /mark as preparing/i }));

    await waitFor(() => expect(updateDoc).toHaveBeenCalled());
    expect(sendOrderReadyForPickupEmail).not.toHaveBeenCalled();
  });

  it('shows an alert when the pickup email send fails with a result error', async () => {
    sendOrderReadyForPickupEmail.mockResolvedValueOnce({ ok: false, error: 'SMTP timeout' });
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<Orders />);
    await screen.findByText('Bob Nkosi');

    await userEvent.click(screen.getByRole('button', { name: /mark as ready/i }));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('SMTP timeout'))
    );
    alertSpy.mockRestore();
  });

  it('shows an alert when the pickup email throws an exception', async () => {
    sendOrderReadyForPickupEmail.mockRejectedValueOnce(new Error('Network error'));
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<Orders />);
    await screen.findByText('Bob Nkosi');

    await userEvent.click(screen.getByRole('button', { name: /mark as ready/i }));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('error sending the pickup email')
      )
    );
    alertSpy.mockRestore();
  });

  it('still advances the order status even when the pickup email fails', async () => {
    sendOrderReadyForPickupEmail.mockResolvedValueOnce({ ok: false, error: 'timeout' });
    jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<Orders />);
    await screen.findByText('Bob Nkosi');

    await userEvent.click(screen.getByRole('button', { name: /mark as ready/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /mark as completed/i })).toBeInTheDocument()
    );
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

  it('calls updateDoc with cancelled status when cancelling', async () => {
    render(<Orders />);
    await screen.findByText('Alice Dube');

    await userEvent.click(screen.getAllByRole('button', { name: /cancel/i })[0]);

    await waitFor(() =>
      expect(updateDoc).toHaveBeenCalledWith('doc-ref', { status: 'cancelled' })
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

  it('does not call updateDoc when trying to cancel an already completed order', async () => {
    // order-3 is completed — cancelOrder guards against this
    mockSnapshot([MOCK_ORDERS[2]]);
    render(<Orders />);
    await screen.findByText('Carol Mokoena');

    // No cancel button should be rendered — guard is enforced in the UI too
    const completedCard = document.querySelector('.order-card--completed');
    expect(completedCard.querySelector('.btn--cancel')).toBeNull();
    expect(updateDoc).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Orders – error handling', () => {
  it('logs an error and does not crash when onSnapshot fires an error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    onSnapshot.mockImplementation((q, onNext, onError) => {
      onError(new Error('Firestore error'));
      return jest.fn();
    });

    render(<Orders />);

    await waitFor(() =>
      expect(consoleSpy).toHaveBeenCalledWith(
        'Unable to listen to orders',
        expect.any(Error)
      )
    );
    consoleSpy.mockRestore();
  });

  it('renders an empty list gracefully when snapshot returns no orders', async () => {
    mockSnapshot([]);
    render(<Orders />);
    await waitFor(() =>
      expect(screen.getByText(/no orders at the moment/i)).toBeInTheDocument()
    );
  });
});