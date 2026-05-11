import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Analytics from '../Analytics';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../Analytics.css', () => ({}));

// Stub URL APIs used by downloadCSV
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Capture any <a> clicks triggered by downloadCSV without navigating
let anchorClickSpy;
beforeAll(() => {
  anchorClickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterAll(() => {
  anchorClickSpy.mockRestore();
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── DATA snapshot (mirrors component DATA constant so tests stay in sync) ────

const TODAY = {
  revenue: 1284.50,
  orders: 18,
  completed: 14,
  cancelled: 2,
  customers: 16,
};

const THIS_WEEK = {
  revenue: 8942.00,
  orders: 126,
  completed: 109,
  cancelled: 10,
  customers: 98,
};

const THIS_MONTH = {
  revenue: 34210.75,
  orders: 512,
  completed: 468,
  cancelled: 28,
  customers: 389,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Analytics – rendering', () => {
  it('renders the Analytics heading', () => {
    render(<Analytics />);
    expect(screen.getByRole('heading', { name: /^analytics$/i })).toBeInTheDocument();
  });

  it('renders all three period tab buttons', () => {
    render(<Analytics />);
    ['Today', 'This Week', 'This Month'].forEach(label => {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    });
  });

  it('"Today" tab is active by default', () => {
    render(<Analytics />);
    expect(screen.getByRole('button', { name: 'Today' })).toHaveClass('active');
  });

  it('renders all four stat card labels', () => {
    render(<Analytics />);
    ['Revenue', 'Total Orders', 'Completion Rate', 'Customers Served'].forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('renders the Orders Overview section heading', () => {
    render(<Analytics />);
    expect(screen.getByRole('heading', { name: /orders overview/i })).toBeInTheDocument();
  });

  it('renders the Top Selling Items section heading', () => {
    render(<Analytics />);
    expect(screen.getByRole('heading', { name: /top selling items/i })).toBeInTheDocument();
  });

  it('renders the Export button', () => {
    render(<Analytics />);
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Analytics – Today stat cards', () => {
  it('displays today\'s revenue', () => {
    render(<Analytics />);
    expect(screen.getByText(/R 1\s?284[.,]50/)).toBeInTheDocument();
  });

  it('displays today\'s total orders', () => {
    render(<Analytics />);
    expect(screen.getByText(String(TODAY.orders))).toBeInTheDocument();
  });

  it('displays today\'s completion rate', () => {
    render(<Analytics />);
    const rate = Math.round((TODAY.completed / TODAY.orders) * 100);
    expect(screen.getByText(`${rate}%`)).toBeInTheDocument();
  });

  it('displays today\'s customers served', () => {
    render(<Analytics />);
    expect(screen.getByText(String(TODAY.customers))).toBeInTheDocument();
  });

  it('displays completed, cancelled, and other breakdown for today', () => {
    render(<Analytics />);
    const other = TODAY.orders - TODAY.completed - TODAY.cancelled;
    expect(screen.getByText(`Completed: ${TODAY.completed}`)).toBeInTheDocument();
    expect(screen.getByText(`Cancelled: ${TODAY.cancelled}`)).toBeInTheDocument();
    expect(screen.getByText(`Other: ${other}`)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Analytics – period switching', () => {
  it('switches to "This Week" data when the tab is clicked', async () => {
    render(<Analytics />);
    await userEvent.click(screen.getByRole('button', { name: 'This Week' }));

    expect(screen.getByRole('button', { name: 'This Week' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Today' })).not.toHaveClass('active');
  });

  it('displays This Week\'s total orders after switching', async () => {
    render(<Analytics />);
    await userEvent.click(screen.getByRole('button', { name: 'This Week' }));
    expect(screen.getByText(String(THIS_WEEK.orders))).toBeInTheDocument();
  });

  it('displays This Week\'s completion rate after switching', async () => {
    render(<Analytics />);
    await userEvent.click(screen.getByRole('button', { name: 'This Week' }));
    const rate = Math.round((THIS_WEEK.completed / THIS_WEEK.orders) * 100);
    expect(screen.getByText(`${rate}%`)).toBeInTheDocument();
  });

  it('displays This Week\'s customers served after switching', async () => {
    render(<Analytics />);
    await userEvent.click(screen.getByRole('button', { name: 'This Week' }));
    expect(screen.getByText(String(THIS_WEEK.customers))).toBeInTheDocument();
  });

  it('switches to "This Month" and shows correct order count', async () => {
    render(<Analytics />);
    await userEvent.click(screen.getByRole('button', { name: 'This Month' }));
    expect(screen.getByText(String(THIS_MONTH.orders))).toBeInTheDocument();
  });

  it('switches to "This Month" and shows correct completion rate', async () => {
    render(<Analytics />);
    await userEvent.click(screen.getByRole('button', { name: 'This Month' }));
    const rate = Math.round((THIS_MONTH.completed / THIS_MONTH.orders) * 100);
    expect(screen.getByText(`${rate}%`)).toBeInTheDocument();
  });

  it('updates the order breakdown when the period changes', async () => {
    render(<Analytics />);
    await userEvent.click(screen.getByRole('button', { name: 'This Week' }));
    const other = THIS_WEEK.orders - THIS_WEEK.completed - THIS_WEEK.cancelled;
    expect(screen.getByText(`Completed: ${THIS_WEEK.completed}`)).toBeInTheDocument();
    expect(screen.getByText(`Cancelled: ${THIS_WEEK.cancelled}`)).toBeInTheDocument();
    expect(screen.getByText(`Other: ${other}`)).toBeInTheDocument();
  });

  it('can switch back to Today from This Week', async () => {
    render(<Analytics />);
    await userEvent.click(screen.getByRole('button', { name: 'This Week' }));
    await userEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(screen.getByText(String(TODAY.orders))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Today' })).toHaveClass('active');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Analytics – bar chart (Orders Overview)', () => {
  it('renders the correct number of bars for Today (10 time slots)', () => {
    render(<Analytics />);
    const bars = document.querySelectorAll('.bar-col');
    expect(bars).toHaveLength(10);
  });

  it('renders the correct number of bars for This Week (7 days)', async () => {
    render(<Analytics />);
    await userEvent.click(screen.getByRole('button', { name: 'This Week' }));
    const bars = document.querySelectorAll('.bar-col');
    expect(bars).toHaveLength(7);
  });

  it('renders the correct number of bars for This Month (4 weeks)', async () => {
    render(<Analytics />);
    await userEvent.click(screen.getByRole('button', { name: 'This Month' }));
    const bars = document.querySelectorAll('.bar-col');
    expect(bars).toHaveLength(4);
  });

  it('renders bar labels for today\'s time slots', () => {
    render(<Analytics />);
    expect(screen.getByText('8am')).toBeInTheDocument();
    expect(screen.getByText('12pm')).toBeInTheDocument();
    expect(screen.getByText('5pm')).toBeInTheDocument();
  });

  it('renders bar labels for This Week days', async () => {
    render(<Analytics />);
    await userEvent.click(screen.getByRole('button', { name: 'This Week' }));
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(day => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
  });

  it('renders bar value outputs for each bar', () => {
    render(<Analytics />);
    // Today's 12pm bar has value 8 — the highest
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('sets the tallest bar to 100% height', () => {
    render(<Analytics />);
    const fills = document.querySelectorAll('.bar-fill');
    const heights = Array.from(fills).map(f => f.style.height);
    expect(heights).toContain('100%');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Analytics – top selling items', () => {
  it('renders 5 top items for Today', () => {
    render(<Analytics />);
    const items = document.querySelectorAll('.top-item');
    expect(items).toHaveLength(5);
  });

  it('renders #1 rank for the first item', () => {
    render(<Analytics />);
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('renders all 5 rank numbers', () => {
    render(<Analytics />);
    ['#1', '#2', '#3', '#4', '#5'].forEach(rank => {
      expect(screen.getByText(rank)).toBeInTheDocument();
    });
  });

  it('displays the top item name for Today', () => {
    render(<Analytics />);
    expect(screen.getByText('Grilled Chicken Burger')).toBeInTheDocument();
  });

  it('displays units sold for the top item', () => {
    render(<Analytics />);
    expect(screen.getByText('24 sold')).toBeInTheDocument();
  });

  it('sets the top item\'s bar width to 100%', () => {
    render(<Analytics />);
    const bars = document.querySelectorAll('.top-item__bar');
    expect(bars[0].style.width).toBe('100%');
  });

  it('sets subsequent items\' bar widths to less than 100%', () => {
    render(<Analytics />);
    const bars = document.querySelectorAll('.top-item__bar');
    const widths = Array.from(bars).slice(1).map(b => parseFloat(b.style.width));
    widths.forEach(w => expect(w).toBeLessThan(100));
  });

  it('updates top items when period changes to This Week', async () => {
    render(<Analytics />);
    await userEvent.click(screen.getByRole('button', { name: 'This Week' }));
    expect(screen.getByText('98 sold')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Analytics – Export dropdown', () => {
  it('export dropdown is closed by default', () => {
    render(<Analytics />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens the dropdown when Export is clicked', async () => {
    render(<Analytics />);
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('shows CSV and PDF options when open', async () => {
    render(<Analytics />);
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('closes the dropdown when Export is clicked again (toggle)', async () => {
    render(<Analytics />);
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('sets aria-expanded to true when open', async () => {
    render(<Analytics />);
    const exportBtn = screen.getByRole('button', { name: /export/i });
    await userEvent.click(exportBtn);
    expect(exportBtn).toHaveAttribute('aria-expanded', 'true');
  });

  it('sets aria-expanded to false when closed', () => {
    render(<Analytics />);
    expect(screen.getByRole('button', { name: /export/i })).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the dropdown when clicking outside', async () => {
    render(<Analytics />);
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await userEvent.click(document.body);

    await waitFor(() =>
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    );
  });

  it('closes the dropdown after CSV is selected', async () => {
    render(<Analytics />);
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    await userEvent.click(screen.getByRole('button', { name: /spreadsheet/i }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('triggers an anchor click when CSV export is selected', async () => {
    render(<Analytics />);
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    await userEvent.click(screen.getByRole('button', { name: /spreadsheet/i }));
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
  });

  it('calls URL.createObjectURL when CSV export is triggered', async () => {
    render(<Analytics />);
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    await userEvent.click(screen.getByRole('button', { name: /spreadsheet/i }));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('calls URL.revokeObjectURL after CSV download', async () => {
    render(<Analytics />);
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    await userEvent.click(screen.getByRole('button', { name: /spreadsheet/i }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Analytics – CSV content (buildCSV)', () => {
  // Re-import the named export for unit testing the pure function
  // buildCSV is not exported, so we test it via the CSV download trigger
  // and inspect what Blob was constructed with.

  it('includes the period label in the CSV output', async () => {
    let capturedBlob;
    const origBlob = global.Blob;
    global.Blob = jest.fn((parts, opts) => {
      capturedBlob = parts[0];
      return new origBlob(parts, opts);
    });

    render(<Analytics />);
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    await userEvent.click(screen.getByRole('button', { name: /spreadsheet/i }));

    expect(capturedBlob).toContain('Today');
    global.Blob = origBlob;
  });

  it('includes revenue in the CSV output', async () => {
    let capturedBlob;
    const origBlob = global.Blob;
    global.Blob = jest.fn((parts, opts) => {
      capturedBlob = parts[0];
      return new origBlob(parts, opts);
    });

    render(<Analytics />);
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    await userEvent.click(screen.getByRole('button', { name: /spreadsheet/i }));

    expect(capturedBlob).toContain('1284.50');
    global.Blob = origBlob;
  });

  it('includes the top item name in the CSV output', async () => {
    let capturedBlob;
    const origBlob = global.Blob;
    global.Blob = jest.fn((parts, opts) => {
      capturedBlob = parts[0];
      return new origBlob(parts, opts);
    });

    render(<Analytics />);
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    await userEvent.click(screen.getByRole('button', { name: /spreadsheet/i }));

    expect(capturedBlob).toContain('Grilled Chicken Burger');
    global.Blob = origBlob;
  });

  it('uses the correct filename for Today CSV download', async () => {
    render(<Analytics />);
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    await userEvent.click(screen.getByRole('button', { name: /spreadsheet/i }));

    const anchors = document.querySelectorAll('a[download]');
    const lastAnchor = anchors[anchors.length - 1];
    expect(lastAnchor?.download ?? '').toContain('today');
  });

  it('uses the correct filename for This Week CSV download', async () => {
    render(<Analytics />);
    await userEvent.click(screen.getByRole('button', { name: 'This Week' }));
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    await userEvent.click(screen.getByRole('button', { name: /spreadsheet/i }));

    const anchors = document.querySelectorAll('a[download]');
    const lastAnchor = anchors[anchors.length - 1];
    expect(lastAnchor?.download ?? '').toContain('this_week');
  });
});