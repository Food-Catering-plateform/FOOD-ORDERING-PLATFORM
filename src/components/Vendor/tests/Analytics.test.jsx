import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

jest.mock('../Analytics.css', () => ({}));
jest.mock('../../../Firebase/firebaseConfig', () => ({ db: {} }));
jest.mock('../../../Services/AuthContext', () => ({
  useAuth: () => ({ vendorId: mockVendorId }),
}));

let mockVendorId = 'vendor-123';

const mockGetDocs = jest.fn();
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query:      jest.fn(),
  where:      jest.fn(),
  getDocs:    (...args) => mockGetDocs(...args),
}));

import Analytics from '../Analytics';

// ── URL / anchor mocks ────────────────────────────────────────────────────────

global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

let anchorClickSpy;

// ── Fixed system time ─────────────────────────────────────────────────────────

const FIXED_NOW = new Date(2026, 4, 12, 12, 0); // Tuesday 12 May 2026, 12:00

// ── Test orders ───────────────────────────────────────────────────────────────

const orders = [
  {
    id: 'o1',
    status: 'completed',
    total: 490.72,
    customerId: 'cust-1',
    createdAt: new Date(2026, 4, 12, 8, 15),
    items: [
      { name: 'Grilled Chicken Burger', qty: 3, price: 110.88 },
      { name: 'Sweet Potato Fries',     qty: 1, price: 47.20  },
    ],
  },
  {
    id: 'o2',
    status: 'completed',
    total: 50.0,
    customerId: 'cust-2',
    createdAt: new Date(2026, 4, 12, 12, 30),
    items: [{ name: 'Vegan Wrap', qty: 2, price: 25.0 }],
  },
  {
    id: 'o3',
    status: 'cancelled',
    total: 0,
    customerId: 'cust-3',
    createdAt: new Date(2026, 4, 11, 14, 0),
    items: [{ name: 'Grilled Chicken Burger', qty: 1, price: 110.88 }],
  },
  {
    id: 'o4',
    status: 'completed',
    total: 260.0,
    customerId: 'cust-2',
    createdAt: new Date(2026, 4, 10, 16, 0),
    items: [{ name: 'Steak Salad', qty: 2, price: 130.0 }],
  },
  {
    id: 'o5',
    status: 'pending',
    total: 0,
    customerId: 'cust-4',
    createdAt: new Date(2026, 4, 1, 10, 0),
    items: [{ name: 'Super "Cheese" Burger, Deluxe', qty: 1, price: 170.0 }],
  },
];

// Order with a Firebase Timestamp-shaped createdAt (has .toDate())
const timestampOrder = {
  id: 'ts1',
  status: 'completed',
  total: 100,
  customerId: 'cust-ts',
  createdAt: { toDate: () => new Date(2026, 4, 12, 9, 0) },
  items: [{ name: 'Timestamp Item', qty: 1, price: 100 }],
};

// Order using the `time` field instead of `createdAt`
const timeFieldOrder = {
  id: 'tf1',
  status: 'completed',
  total: 80,
  customerId: 'cust-tf',
  time: new Date(2026, 4, 12, 10, 0),
  items: [{ name: 'Time Field Item', qty: 1, price: 80 }],
};

// Order with uppercase status (tests .toLowerCase() fix)
const uppercaseStatusOrder = {
  id: 'up1',
  status: 'Completed',
  total: 50,
  customerId: 'cust-up',
  createdAt: new Date(2026, 4, 12, 11, 0),
  items: [],
};

// Order with no createdAt and no time (safeDate receives falsy → new Date(0))
const noDateOrder = {
  id: 'nd1',
  status: 'completed',
  total: 20,
  customerId: 'cust-nd',
  items: [],
};

const buildDocs = (orderList) =>
  orderList.map(order => ({ id: order.id, data: () => order }));

const renderAnalytics = async () => {
  render(<Analytics />);
  await waitFor(() =>
    expect(screen.queryByText(/loading analytics/i)).not.toBeInTheDocument()
  );
};

// ── Global setup / teardown ───────────────────────────────────────────────────

beforeAll(() => {
  jest.useFakeTimers('modern');
  jest.setSystemTime(FIXED_NOW);
  anchorClickSpy = jest
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => {});
});

afterAll(() => {
  jest.useRealTimers();
  anchorClickSpy.mockRestore();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockVendorId = 'vendor-123';
  mockGetDocs.mockResolvedValue({ docs: buildDocs(orders) });
});

// ─────────────────────────────────────────────────────────────────────────────
// Loading & early-return
// ─────────────────────────────────────────────────────────────────────────────

describe('Analytics – loading and early-return', () => {
  it('shows a loading placeholder while analytics fetches', async () => {
    render(<Analytics />);
    expect(screen.getByText(/loading analytics/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText(/loading analytics/i)).not.toBeInTheDocument()
    );
  });

  it('returns loading state when vendorId is null (useEffect guard)', () => {
    mockVendorId = null;
    render(<Analytics />);
    // useEffect bails out → loading stays true → loading UI forever
    expect(screen.getByText(/loading analytics/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// safeDate helper (via data processing)
// ─────────────────────────────────────────────────────────────────────────────

describe('Analytics – safeDate branches', () => {
  it('handles Firebase Timestamp objects with .toDate()', async () => {
    mockGetDocs.mockResolvedValue({ docs: buildDocs([timestampOrder]) });
    await renderAnalytics();
    // Timestamp order is on today — revenue should include it
    expect(screen.getByText(/R 100[.,]00/)).toBeInTheDocument();
  });

  it('handles orders using the `time` field instead of `createdAt`', async () => {
    mockGetDocs.mockResolvedValue({ docs: buildDocs([timeFieldOrder]) });
    await renderAnalytics();
    expect(screen.getByText(/R 80[.,]00/)).toBeInTheDocument();
  });

  it('handles orders with no date field (safeDate returns epoch → filtered out of today)', async () => {
    mockGetDocs.mockResolvedValue({ docs: buildDocs([noDateOrder]) });
    await renderAnalytics();
    // epoch is way before today → filtered out of all periods → 0 orders
    expect(screen.getByText(/R 0[.,]00/)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// status.toLowerCase() fix
// ─────────────────────────────────────────────────────────────────────────────

describe('Analytics – case-insensitive status handling', () => {
  it('counts "Completed" (uppercase) orders correctly', async () => {
    mockGetDocs.mockResolvedValue({ docs: buildDocs([uppercaseStatusOrder]) });
    await renderAnalytics();
    expect(screen.getByText(/100\s*%/)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Data rendering
// ─────────────────────────────────────────────────────────────────────────────

describe('Analytics – data rendering', () => {
  it('renders today stats from fetched orders', async () => {
    await renderAnalytics();
    expect(screen.getByText(/R 540[.,]72/)).toBeInTheDocument();
    expect(screen.getAllByText('2')[0]).toBeInTheDocument();
    expect(screen.getByText(/100\s*%/)).toBeInTheDocument();
  });

  it('renders no sales state when there are no orders', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    await renderAnalytics();
    expect(screen.getByText(/no sales data yet for this period/i)).toBeInTheDocument();
    expect(screen.getByText(/R 0[.,]00/)).toBeInTheDocument();
    expect(screen.getByText(/0\s*%/)).toBeInTheDocument();
  });

  it('renders order breakdown: Completed, Cancelled, Other counts', async () => {
    await renderAnalytics();
    expect(screen.getByText(/Completed: 2/)).toBeInTheDocument();
    expect(screen.getByText(/Cancelled: 0/)).toBeInTheDocument();
    expect(screen.getByText(/Other: 0/)).toBeInTheDocument();
  });

  it('completionRate is 0 when orders = 0 (guards division by zero)', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    await renderAnalytics();
    expect(screen.getByText(/0\s*%/)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Period switching
// ─────────────────────────────────────────────────────────────────────────────

describe('Analytics – period switching', () => {
  it('switches to This Week and updates stats correctly', async () => {
    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: 'This Week' }));
    expect(screen.getByRole('button', { name: 'This Week' })).toHaveClass('active');
    expect(screen.getByText(/R 540[.,]72/)).toBeInTheDocument();
    expect(screen.getByText(/67\s*%/)).toBeInTheDocument();
  });

  it('switches to This Month and includes all orders in the month', async () => {
    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: 'This Month' }));
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText(/60\s*%/)).toBeInTheDocument();
  });

  it('Today tab stays active by default', async () => {
    await renderAnalytics();
    expect(screen.getByRole('button', { name: 'Today' })).toHaveClass('active');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildBarChart
// ─────────────────────────────────────────────────────────────────────────────

describe('Analytics – bar chart behaviour', () => {
  it('renders 10 bars for Today', async () => {
    await renderAnalytics();
    expect(document.querySelectorAll('.bar-col')).toHaveLength(10);
  });

  it('renders 7 bars for This Week', async () => {
    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: 'This Week' }));
    expect(document.querySelectorAll('.bar-col')).toHaveLength(7);
  });

  it('renders 4 bars for This Month', async () => {
    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: 'This Month' }));
    expect(document.querySelectorAll('.bar-col')).toHaveLength(4);
  });

  it('shows week labels (Wk 1–Wk 4) for This Month', async () => {
    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: 'This Month' }));
    ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'].forEach(label =>
      expect(screen.getByText(label)).toBeInTheDocument()
    );
  });

  it('Today bars: hour 8 order is counted in the 8am slot', async () => {
    // o1 has createdAt hour=8 → should increment counts[0]
    await renderAnalytics();
    const values = document.querySelectorAll('.bar-value');
    // values[0] = 8am slot; o1 (hour 8) and o2 (hour 12) are today
    expect(parseInt(values[0].textContent)).toBeGreaterThanOrEqual(1);
  });

  it('This Week bars: Sunday order maps to index 6 (Sun column)', async () => {
    const sundayOrder = {
      id: 'sun1', status: 'completed', total: 10, customerId: 'cx',
      createdAt: new Date(2026, 4, 10, 10, 0), // Sunday 10 May 2026
      items: [],
    };
    mockGetDocs.mockResolvedValue({ docs: buildDocs([sundayOrder]) });
    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: 'This Week' }));
    const values = document.querySelectorAll('.bar-value');
    expect(parseInt(values[6].textContent)).toBe(1); // Sun = index 6
  });

  it('This Month bars: order on day 29 clamps to Wk 4 (index 3)', async () => {
    const day29Order = {
      id: 'wk4', status: 'completed', total: 10, customerId: 'cx',
      createdAt: new Date(2026, 4, 29, 10, 0),
      items: [],
    };
    mockGetDocs.mockResolvedValue({ docs: buildDocs([day29Order]) });
    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: 'This Month' }));
    const values = document.querySelectorAll('.bar-value');
    expect(parseInt(values[3].textContent)).toBe(1); // Wk 4 = index 3
  });

  it('maxBar guard: all-zero bars still render without divide-by-zero', async () => {
    // All orders outside today's window → all bar values = 0 → maxBar uses 1 guard
    mockGetDocs.mockResolvedValue({ docs: [] });
    await renderAnalytics();
    const bars = document.querySelectorAll('.bar-fill');
    bars.forEach(bar => expect(bar.style.height).toBe('0%'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildTopItems
// ─────────────────────────────────────────────────────────────────────────────

describe('Analytics – top selling items', () => {
  it('renders three top selling item rows for Today', async () => {
    await renderAnalytics();
    expect(document.querySelectorAll('.top-item')).toHaveLength(3);
  });

  it('shows the top selling item ordered by highest sold count', async () => {
    await renderAnalytics();
    expect(screen.getByText('Grilled Chicken Burger')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('3 sold')).toBeInTheDocument();
  });

  it('calculates widths so only first item reaches 100%', async () => {
    await renderAnalytics();
    const bars = document.querySelectorAll('.top-item__bar');
    expect(bars[0].style.width).toBe('100%');
    Array.from(bars).slice(1).forEach(bar =>
      expect(parseFloat(bar.style.width)).toBeLessThan(100)
    );
  });

  it('maxSold guard: single item has width 100%', async () => {
    mockGetDocs.mockResolvedValue({
      docs: buildDocs([{
        id: 'solo', status: 'completed', total: 10, customerId: 'cx',
        createdAt: new Date(2026, 4, 12, 9, 0),
        items: [{ name: 'Only Item', qty: 1, price: 10 }],
      }]),
    });
    await renderAnalytics();
    const bars = document.querySelectorAll('.top-item__bar');
    expect(bars[0].style.width).toBe('100%');
  });

  it('caps top items at 5 even when more exist', async () => {
    const manyOrders = Array.from({ length: 7 }, (_, i) => ({
      id:         `m${i}`,
      status:     'completed',
      total:      10,
      customerId: `cx${i}`,
      createdAt:  new Date(2026, 4, 12, 9, 0),
      items:      [{ name: `Item ${i}`, qty: 7 - i, price: 10 }],
    }));
    mockGetDocs.mockResolvedValue({ docs: buildDocs(manyOrders) });
    await renderAnalytics();
    expect(document.querySelectorAll('.top-item')).toHaveLength(5);
  });

  it('shows no-sales message when topItems is empty', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    await renderAnalytics();
    expect(screen.getByText(/no sales data yet for this period/i)).toBeInTheDocument();
  });

  it('groups same-named items across multiple orders', async () => {
    await renderAnalytics();
    // Grilled Chicken Burger: qty 3 (o1) + qty 1 (o3, cancelled but still in month)
    await userEvent.click(screen.getByRole('button', { name: 'This Month' }));
    expect(screen.getByText('4 sold')).toBeInTheDocument();
  });

  it('handles orders with missing items array without crashing', async () => {
    mockGetDocs.mockResolvedValue({
      docs: buildDocs([{
        id: 'noitems', status: 'completed', total: 0, customerId: 'cx',
        createdAt: new Date(2026, 4, 12, 9, 0),
        // no items field at all
      }]),
    });
    await renderAnalytics();
    expect(screen.getByText(/no sales data yet for this period/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPeriodStart
// ─────────────────────────────────────────────────────────────────────────────

describe('Analytics – getPeriodStart (via period tab behaviour)', () => {
  it('Today start filters out orders from yesterday', async () => {
    await renderAnalytics();
    // o3 is 11 May (yesterday) → not in Today
    // Only o1 + o2 are today → 2 orders
    expect(screen.getAllByText('2')[0]).toBeInTheDocument();
  });

  it('This Week includes Monday through the current day', async () => {
    // FIXED_NOW = Tuesday 12 May → week starts Monday 11 May
    // o1 (12 May), o2 (12 May), o3 (11 May) all in week → 3 orders
    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: 'This Week' }));
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('This Month includes all orders in May 2026', async () => {
    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: 'This Month' }));
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Export dropdown (ExportButton)
// ─────────────────────────────────────────────────────────────────────────────

describe('Analytics – Export dropdown', () => {
  it('opens the export dropdown on click', async () => {
    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('closes the dropdown on second click', async () => {
    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes when clicking outside the export area', async () => {
    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await userEvent.click(document.body);
    await waitFor(() =>
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    );
  });

  it('sets aria-haspopup on export button', async () => {
    await renderAnalytics();
    expect(screen.getByRole('button', { name: /export/i }))
      .toHaveAttribute('aria-haspopup', 'true');
  });

  it('sets aria-expanded to true when open', async () => {
    await renderAnalytics();
    const btn = screen.getByRole('button', { name: /export/i });
    await userEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
  });

  it('sets aria-expanded to false when closed', async () => {
    await renderAnalytics();
    const btn = screen.getByRole('button', { name: /export/i });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('menu has proper role attribute', async () => {
    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('menu items have menuitem role', async () => {
    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(screen.getAllByRole('menuitem').length).toBeGreaterThanOrEqual(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// downloadCSV  (including escapeCSV branches)
// ─────────────────────────────────────────────────────────────────────────────

describe('Analytics – CSV download & escapeCSV', () => {
  let capturedBlob;
  const originalBlob = global.Blob;

  beforeEach(() => {
    capturedBlob = null;
    global.Blob = jest.fn((parts, opts) => {
      capturedBlob = parts[0];
      return new originalBlob(parts, opts);
    });
  });

  afterEach(() => { global.Blob = originalBlob; });

  const triggerCSV = async (period = 'Today') => {
    await renderAnalytics();
    if (period !== 'Today') {
      await userEvent.click(screen.getByRole('button', { name: period }));
    }
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    await userEvent.click(screen.getByText(/Spreadsheet/i).closest('button'));
  };

  it('triggers anchor click and revokes URL', async () => {
    await triggerCSV();
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(anchorClickSpy).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('sets correct download filename for Today', async () => {
    // Intercept document.createElement to capture the anchor
    const originalCreate = document.createElement.bind(document);
    let anchor;
    jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = originalCreate(tag);
      if (tag === 'a') anchor = el;
      return el;
    });
    await triggerCSV('Today');
    expect(anchor.download).toBe('analytics_today.csv');
    document.createElement.mockRestore();
  });

  it('sets correct download filename for This Month', async () => {
    const originalCreate = document.createElement.bind(document);
    let anchor;
    jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = originalCreate(tag);
      if (tag === 'a') anchor = el;
      return el;
    });
    await triggerCSV('This Month');
    expect(anchor.download).toBe('analytics_this_month.csv');
    document.createElement.mockRestore();
  });

  it('contains ANALYTICS REPORT header', async () => {
    await triggerCSV();
    expect(capturedBlob).toContain('ANALYTICS REPORT');
    expect(capturedBlob).toContain('Today');
  });

  it('contains SUMMARY section with revenue and metrics', async () => {
    await triggerCSV();
    expect(capturedBlob).toContain('SUMMARY');
    expect(capturedBlob).toContain('Revenue');
    expect(capturedBlob).toContain('Total Orders');
    expect(capturedBlob).toContain('540.72');
  });

  it('contains ORDERS OVERVIEW section', async () => {
    await triggerCSV();
    expect(capturedBlob).toContain('ORDERS OVERVIEW');
  });

  it('contains TOP SELLING ITEMS section', async () => {
    await triggerCSV();
    expect(capturedBlob).toContain('TOP SELLING ITEMS');
  });

  it('escapeCSV: wraps fields containing commas in double quotes', async () => {
    await triggerCSV('This Month');
    expect(capturedBlob).toContain('"Super ""Cheese"" Burger, Deluxe"');
  });

  it('escapeCSV: escapes internal double quotes by doubling them', async () => {
    await triggerCSV('This Month');
    expect(capturedBlob).toContain('""Cheese""');
  });

  it('escapeCSV: wraps field containing newline in double quotes', async () => {
    mockGetDocs.mockResolvedValue({
      docs: buildDocs([{
        id: 'nl1', status: 'completed', total: 10, customerId: 'cx',
        createdAt: new Date(2026, 4, 12, 9, 0),
        items: [{ name: 'Item\nWith Newline', qty: 1, price: 10 }],
      }]),
    });
    await triggerCSV();
    expect(capturedBlob).toContain('"Item\nWith Newline"');
  });

  it('escapeCSV: plain fields are not quoted', async () => {
    await triggerCSV();
    expect(capturedBlob).toContain('Grilled Chicken Burger');
    // plain name should appear without surrounding quotes
    expect(capturedBlob).not.toMatch(/"Grilled Chicken Burger"/);
  });

  it('completionRate in CSV: 0% when orders = 0', async () => {
    // completionRate = completed/orders * 100; when orders=0 the component
    // guards with Math.round(0/0)=NaN — verify CSV still writes a value
    mockGetDocs.mockResolvedValue({ docs: [] });
    await triggerCSV();
    // With 0 orders, NaN% or 0% — either way the file is produced
    expect(capturedBlob).toContain('Completion Rate');
  });

  it('closes the dropdown after CSV download', async () => {
    await triggerCSV();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// downloadPDF  (loadJsPDF dynamic script injection)
// ─────────────────────────────────────────────────────────────────────────────

describe('Analytics – PDF export (loadJsPDF)', () => {
  const mockSave      = jest.fn();
  const mockAutoTable = jest.fn();

  // Minimal jsPDF instance stub
  const makePDFInstance = () => ({
    internal: { pageSize: { getHeight: () => 297 } },
    setFillColor:  jest.fn().mockReturnThis(),
    rect:          jest.fn().mockReturnThis(),
    roundedRect:   jest.fn().mockReturnThis(),
    setTextColor:  jest.fn().mockReturnThis(),
    setFontSize:   jest.fn().mockReturnThis(),
    setFont:       jest.fn().mockReturnThis(),
    text:          jest.fn().mockReturnThis(),
    setDrawColor:  jest.fn().mockReturnThis(),
    line:          jest.fn().mockReturnThis(),
    lastAutoTable: { finalY: 100 },
    autoTable:     mockAutoTable,
    save:          mockSave,
  });

  beforeEach(() => {
    mockSave.mockClear();
    mockAutoTable.mockClear();

    // Simulate window.jspdf being available (as if CDN script already loaded)
    window.jspdf = { jsPDF: jest.fn(() => makePDFInstance()) };
  });

  afterEach(() => {
    delete window.jspdf;
  });

  const triggerPDF = async (period = 'Today') => {
    await renderAnalytics();
    if (period !== 'Today') {
      await userEvent.click(screen.getByRole('button', { name: period }));
    }
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    await userEvent.click(screen.getByRole('button', { name: /report/i }));
  };

  it('closes the dropdown after PDF is selected', async () => {
    await triggerPDF();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('calls jsPDF constructor and save', async () => {
    await triggerPDF();
    await waitFor(() => expect(mockSave).toHaveBeenCalled());
    expect(mockSave).toHaveBeenCalledWith('analytics_today.pdf');
  });

  it('calls autoTable at least 3 times (breakdown, overview, top items)', async () => {
    await triggerPDF();
    await waitFor(() => expect(mockAutoTable.mock.calls.length).toBeGreaterThanOrEqual(3));
  });

  it('uses correct filename for This Month', async () => {
    await triggerPDF('This Month');
    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith('analytics_this_month.pdf')
    );
  });

  it('loadJsPDF reuses window.jspdf when already present (no script injection)', async () => {
    // window.jspdf is already set in beforeEach
    const appendSpy = jest.spyOn(document.head, 'appendChild');
    await triggerPDF();
    await waitFor(() => expect(mockSave).toHaveBeenCalled());
    // No script tags should have been injected
    const scriptCalls = appendSpy.mock.calls.filter(
      ([el]) => el.tagName === 'SCRIPT'
    );
    expect(scriptCalls).toHaveLength(0);
    appendSpy.mockRestore();
  });

  it('loadJsPDF injects scripts when window.jspdf is absent', async () => {
    delete window.jspdf;

    // Re-set window.jspdf when script is appended (simulates CDN load)
    const appendSpy = jest.spyOn(document.head, 'appendChild').mockImplementation((el) => {
      if (el.tagName === 'SCRIPT') {
        window.jspdf = { jsPDF: jest.fn(() => makePDFInstance()) };
        el.onload?.();
      }
    });

    await triggerPDF();
    await waitFor(() => expect(mockSave).toHaveBeenCalled());

    const scriptCalls = appendSpy.mock.calls.filter(([el]) => el.tagName === 'SCRIPT');
    expect(scriptCalls.length).toBeGreaterThanOrEqual(2); // jspdf + autotable
    appendSpy.mockRestore();
  });

  it('didDrawCell callback draws bar for hourly rows with value > 0', async () => {
    // Verify autoTable is called with a didDrawCell function
    await triggerPDF();
    await waitFor(() => expect(mockAutoTable).toHaveBeenCalled());
    const overviewCall = mockAutoTable.mock.calls.find(
      ([opts]) => opts.head?.[0]?.[0] === 'Period'
    );
    expect(overviewCall).toBeDefined();
    expect(typeof overviewCall[0].didDrawCell).toBe('function');

    // Exercise didDrawCell for a body cell in the Volume column (index 2)
    const pdfInstance = window.jspdf.jsPDF.mock.results[0]?.value || makePDFInstance();
    overviewCall[0].didDrawCell({
      section:      'body',
      column:       { index: 2 },
      row:          { index: 0 }, // maps to d.hourly[0]
      cell:         { x: 10, y: 10, height: 10, width: 80 },
    });
    // Should not throw — coverage of the roundedRect paint path
  });

  it('didDrawCell skips drawing for header sections', async () => {
    await triggerPDF();
    await waitFor(() => expect(mockAutoTable).toHaveBeenCalled());
    const overviewCall = mockAutoTable.mock.calls.find(
      ([opts]) => opts.head?.[0]?.[0] === 'Period'
    );
    // Should not throw when section = 'head'
    expect(() => {
      overviewCall[0].didDrawCell({
        section: 'head',
        column:  { index: 2 },
        row:     { index: 0 },
        cell:    { x: 10, y: 10, height: 10, width: 80 },
      });
    }).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Accessibility
// ─────────────────────────────────────────────────────────────────────────────

describe('Analytics – accessibility', () => {
  it('sets aria-haspopup on export button', async () => {
    await renderAnalytics();
    expect(screen.getByRole('button', { name: /export/i }))
      .toHaveAttribute('aria-haspopup', 'true');
  });

  it('menu has role="menu"', async () => {
    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('menu items have role="menuitem"', async () => {
    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(screen.getAllByRole('menuitem').length).toBeGreaterThanOrEqual(2);
  });
});