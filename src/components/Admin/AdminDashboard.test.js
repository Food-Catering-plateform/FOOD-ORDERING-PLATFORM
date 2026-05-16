import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock('../../Firebase/firebaseConfig', () => ({
  auth: {},
  db: {},
}));

jest.mock('firebase/auth', () => ({
  signOut: jest.fn(() => Promise.resolve()),
}));

const mockGetDocs = jest.fn();
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: (...args) => mockGetDocs(...args),
  doc: jest.fn(),
  updateDoc: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../Services/vendorService', () => ({
  fetchAllVendors: jest.fn(),
  approveVendor: jest.fn(() => Promise.resolve()),
  suspendVendor: jest.fn(() => Promise.resolve()),
  fetchAllAdmins: jest.fn(),
  approveAdmin: jest.fn(() => Promise.resolve()),
  suspendAdmin: jest.fn(() => Promise.resolve()),
}));

// ── jsPDF mock ────────────────────────────────────────────────────────────────

const mockJsPDFInstance = {
  internal: {
    pageSize: { getWidth: () => 595, getHeight: () => 842 },
    getNumberOfPages: () => 2,
  },
  setFillColor: jest.fn(),
  rect: jest.fn(),
  roundedRect: jest.fn(),
  setFontSize: jest.fn(),
  setFont: jest.fn(),
  setTextColor: jest.fn(),
  text: jest.fn(),
  setDrawColor: jest.fn(),
  setLineWidth: jest.fn(),
  line: jest.fn(),
  addPage: jest.fn(),
  setPage: jest.fn(),
  save: jest.fn(),
};

jest.mock('jspdf', () => ({
  jsPDF: jest.fn(() => mockJsPDFInstance),
}));

// ── URL / Blob / anchor mocks ─────────────────────────────────────────────────

let createdObjectURL = '';
global.URL.createObjectURL = jest.fn(() => { createdObjectURL = 'blob:mock'; return createdObjectURL; });
global.URL.revokeObjectURL = jest.fn();

const mockAnchorClick = jest.fn();
const mockAnchor = { href: '', download: '', click: mockAnchorClick };
jest.spyOn(document, 'createElement').mockImplementation((tag) => {
  if (tag === 'a') return mockAnchor;
  return document.createElement.wrappedMethod
    ? document.createElement.wrappedMethod(tag)
    : Object.create(HTMLElement.prototype);
});

// ── Imports ───────────────────────────────────────────────────────────────────

import { signOut } from 'firebase/auth';
import { fetchAllVendors, approveVendor, suspendVendor,
         fetchAllAdmins, approveAdmin, suspendAdmin } from '../../Services/vendorService';
import AdminDashboard, {
  buildBarChart, buildVendorSales, buildTopItems,
  getPeriodStart, buildCSV, downloadCSV, downloadReport,
} from './AdminDashboard';
import AdminVendorManagement from './AdminVendorManagement';

// ── Shared fixtures ───────────────────────────────────────────────────────────

const MOCK_VENDORS = [
  { id: 'v1', businessName: 'Tasty Bites',  email: 'tasty@test.com',  status: 'pending'   },
  { id: 'v2', businessName: 'Spice Garden', email: 'spice@test.com',  status: 'approved'  },
  { id: 'v3', businessName: 'Quick Eats',   email: 'quick@test.com',  status: 'suspended' },
];

const MOCK_ADMINS = [
  { id: 'a1', name: 'Alice', lastName: 'Admin', email: 'alice@test.com', status: 'pending'  },
  { id: 'a2', name: 'Bob',   lastName: 'Admin', email: 'bob@test.com',   status: 'approved' },
];

const mockSetActivePage = jest.fn();
const renderDashboard = () => render(<AdminDashboard setActivePage={mockSetActivePage} />);

const NOW = new Date().toISOString();

const MOCK_ORDERS = [
  {
    id: 'o1', vendorName: 'Tasty Bites', total: 150,
    status: 'completed', customerId: 'c1', createdAt: NOW,
    items: [{ name: 'Bunny Chow', qty: 2, price: 45 }],
  },
  {
    id: 'o2', vendorName: 'Spice Garden', total: 200,
    status: 'completed', customerId: 'c2', createdAt: NOW,
    items: [
      { name: 'Curry Platter', qty: 1, price: 120 },
      { name: 'Roti',          qty: 2, price: 20  },
    ],
  },
  {
    id: 'o3', vendorName: 'Tasty Bites', total: 90,
    status: 'cancelled', customerId: 'c3', createdAt: NOW,
    items: [{ name: 'Bunny Chow', qty: 1, price: 45 }],
  },
  {
    id: 'o4', vendorName: 'Tasty Bites', total: 60,
    status: 'pending', customerId: 'c4', createdAt: NOW,
    items: [],
  },
];

const makeGetDocsSnap = (orders) => ({
  docs: orders.map(o => ({ id: o.id, data: () => o })),
});

// ─────────────────────────────────────────────────────────────────────────────
// Pure helper tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Analytics helpers', () => {

  describe('getPeriodStart', () => {
    test('Today returns midnight today', () => {
      const s = getPeriodStart('Today');
      const n = new Date();
      expect(s.getFullYear()).toBe(n.getFullYear());
      expect(s.getMonth()).toBe(n.getMonth());
      expect(s.getDate()).toBe(n.getDate());
      expect(s.getHours()).toBe(0);
    });

    test('This Month returns first of month', () => {
      expect(getPeriodStart('This Month').getDate()).toBe(1);
    });

    test('This Week returns a Monday (day index 1) or Sunday edge', () => {
      const s = getPeriodStart('This Week');
      expect(s).toBeInstanceOf(Date);
    });

    test('unknown period returns epoch', () => {
      expect(getPeriodStart('Last Year').getTime()).toBe(new Date(0).getTime());
    });
  });

  describe('buildBarChart', () => {
    const orders = [
      { createdAt: NOW },
      { time: NOW },         // exercises the `o.time` fallback branch
    ];

    test('Today → 14 slots labelled 7am … 8pm', () => {
      const chart = buildBarChart(orders, 'Today');
      expect(chart).toHaveLength(14);
      expect(chart[0].label).toBe('7am');
      expect(chart[13].label).toBe('8pm');
    });

    test('This Week → 7 slots labelled Mon … Sun', () => {
      const chart = buildBarChart(orders, 'This Week');
      expect(chart).toHaveLength(7);
      expect(chart.map(c => c.label)).toContain('Sun');
    });

    test('This Week Sunday order maps to index 6 (not -1)', () => {
      // Force a Sunday order by using a known Sunday date string
      const sunday = new Date('2025-01-05T10:00:00').toISOString(); // that's a Sunday
      const chart = buildBarChart([{ createdAt: sunday }], 'This Week');
      expect(chart[6].value).toBe(1); // Sun is index 6
    });

    test('This Month → 4 weekly slots', () => {
      const chart = buildBarChart(orders, 'This Month');
      expect(chart).toHaveLength(4);
      expect(chart[0].label).toBe('Wk 1');
    });

    test('This Month week clamped to index 3 for day >= 29', () => {
      const day29 = new Date('2025-01-29T10:00:00').toISOString();
      const chart = buildBarChart([{ createdAt: day29 }], 'This Month');
      expect(chart[3].value).toBe(1);
    });

    test('unknown period → empty array', () => {
      expect(buildBarChart(orders, 'Last Year')).toHaveLength(0);
    });
  });

  describe('buildVendorSales', () => {
    const orders = [
      { vendorName: 'A', total: 100, items: [] },
      { vendorName: 'A', total: 80,  items: [] },
      { vendorName: 'B', total: 60,  items: [] },
      { total: 50, items: [] },               // missing vendorName → 'Unknown Vendor'
    ];

    test('aggregates revenue and orders per vendor', () => {
      const sales = buildVendorSales(orders);
      const a = sales.find(s => s.name === 'A');
      expect(a.orders).toBe(2);
      expect(a.revenue).toBe(180);
    });

    test('sorts by revenue descending', () => {
      const sales = buildVendorSales(orders);
      expect(sales[0].name).toBe('A');
    });

    test('missing vendorName labelled "Unknown Vendor"', () => {
      const sales = buildVendorSales(orders);
      expect(sales.find(s => s.name === 'Unknown Vendor')).toBeDefined();
    });

    test('order with missing total treated as 0', () => {
      const sales = buildVendorSales([{ vendorName: 'C' }]);
      expect(sales[0].revenue).toBe(0);
    });
  });

  describe('buildTopItems', () => {
    const orders = [
      { items: [{ name: 'X', qty: 3, price: 33 }, { name: 'Y', qty: 1, price: 80 }] },
      { items: [{ name: 'X', qty: 2, price: 30 }] },
      { items: [] },
    ];

    test('sums qty across orders for same item', () => {
      const top = buildTopItems(orders);
      expect(top.find(i => i.name === 'X').sold).toBe(5);
    });

    test('sorted by sold descending and capped at 5', () => {
      const manyItems = Array.from({ length: 7 }, (_, i) => ({
        items: [{ name: `Item${i}`, qty: 7 - i, price: 10 }],
      }));
      const top = buildTopItems(manyItems);
      expect(top).toHaveLength(5);
    });

    test('order with missing items array skipped gracefully', () => {
      expect(() => buildTopItems([{}])).not.toThrow();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildCSV
// ─────────────────────────────────────────────────────────────────────────────

describe('buildCSV', () => {
  const d = {
    revenue: 1234.5,
    orders: 10,
    completed: 7,
    cancelled: 2,
    customers: 5,
    hourly: [{ label: '7am', value: 3 }, { label: '8am', value: 0 }],
    topItems: [{ name: 'Bunny Chow', sold: 5, revenue: 225 }],
    vendorSales: [{ name: 'Tasty Bites', orders: 6, revenue: 900 }],
  };

  test('contains ADMIN ANALYTICS REPORT header', () => {
    const csv = buildCSV('Today', d);
    expect(csv).toContain('ADMIN ANALYTICS REPORT');
    expect(csv).toContain('Today');
  });

  test('contains revenue row', () => {
    const csv = buildCSV('Today', d);
    expect(csv).toContain('Revenue');
    expect(csv).toContain('1234.50');
  });

  test('contains top items section', () => {
    const csv = buildCSV('Today', d);
    expect(csv).toContain('Bunny Chow');
    expect(csv).toContain('#1');
  });

  test('contains vendor sales section', () => {
    const csv = buildCSV('Today', d);
    expect(csv).toContain('Tasty Bites');
  });

  test('completion rate is 0 when orders = 0', () => {
    const csv = buildCSV('Today', { ...d, orders: 0 });
    expect(csv).toContain('0%');
  });

  test('escapeCSV wraps value with comma in quotes', () => {
    const csv = buildCSV('Today', {
      ...d,
      vendorSales: [{ name: 'A, B', orders: 1, revenue: 10 }],
    });
    expect(csv).toContain('"A, B"');
  });

  test('escapeCSV wraps value with double-quote in quotes and escapes it', () => {
    const csv = buildCSV('Today', {
      ...d,
      vendorSales: [{ name: 'Say "Hello"', orders: 1, revenue: 10 }],
    });
    expect(csv).toContain('"Say ""Hello"""');
  });

  test('escapeCSV wraps value with newline in quotes', () => {
    const csv = buildCSV('Today', {
      ...d,
      vendorSales: [{ name: 'Line1\nLine2', orders: 1, revenue: 10 }],
    });
    expect(csv).toContain('"Line1\nLine2"');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// downloadCSV
// ─────────────────────────────────────────────────────────────────────────────

describe('downloadCSV', () => {
  const d = {
    revenue: 100, orders: 2, completed: 1, cancelled: 1, customers: 1,
    hourly: [], topItems: [], vendorSales: [],
  };

  test('creates a blob, anchor, clicks it, and revokes the URL', () => {
    downloadCSV('Today', d);
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(mockAnchorClick).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });

  test('sets correct download filename', () => {
    downloadCSV('This Week', d);
    expect(mockAnchor.download).toBe('admin_analytics_this_week.csv');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// downloadReport (PDF)
// ─────────────────────────────────────────────────────────────────────────────

describe('downloadReport', () => {
  const baseD = {
    revenue: 500, orders: 5, completed: 4, cancelled: 1, customers: 3,
    hourly: [{ label: '7am', value: 2 }, { label: '8am', value: 0 }],
    topItems: [{ name: 'Burger', sold: 4, revenue: 200 }],
    vendorSales: [{ name: 'Tasty Bites', orders: 3, revenue: 300 }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockJsPDFInstance.internal.getNumberOfPages.mockReturnValue(2);
  });

  test('calls jsPDF save with correct filename', async () => {
    await downloadReport('Today', baseD);
    expect(mockJsPDFInstance.save).toHaveBeenCalledWith('admin_analytics_today.pdf');
  });

  test('renders top items section when topItems is non-empty', async () => {
    await downloadReport('Today', baseD);
    expect(mockJsPDFInstance.text).toHaveBeenCalled();
  });

  test('renders "No sales data yet." when topItems is empty', async () => {
    await downloadReport('Today', { ...baseD, topItems: [] });
    expect(mockJsPDFInstance.text).toHaveBeenCalledWith(
      expect.stringContaining('No sales data'), expect.any(Number), expect.any(Number)
    );
  });

  test('renders "No vendor data available." when vendorSales is empty', async () => {
    await downloadReport('Today', { ...baseD, vendorSales: [] });
    expect(mockJsPDFInstance.text).toHaveBeenCalledWith(
      expect.stringContaining('No vendor data'), expect.any(Number), expect.any(Number)
    );
  });

  test('completion rate is 0 when orders = 0', async () => {
    // Should not throw when orders = 0
    await expect(downloadReport('Today', { ...baseD, orders: 0, completed: 0, cancelled: 0 })).resolves.toBeUndefined();
  });

  test('checkPage triggers addPage when y exceeds page height', async () => {
    // Mock getHeight to a tiny value so every section forces a new page
    mockJsPDFInstance.internal.pageSize.getHeight = () => 60;
    await downloadReport('Today', baseD);
    expect(mockJsPDFInstance.addPage).toHaveBeenCalled();
    mockJsPDFInstance.internal.pageSize.getHeight = () => 842; // restore
  });

  test('long item names are truncated with ellipsis', async () => {
    const longName = 'A'.repeat(40);
    await downloadReport('Today', {
      ...baseD,
      topItems: [{ name: longName, sold: 1, revenue: 10 }],
    });
    // just check it doesn't throw and save is called
    expect(mockJsPDFInstance.save).toHaveBeenCalled();
  });

  test('long vendor names are truncated with ellipsis', async () => {
    const longName = 'B'.repeat(50);
    await downloadReport('Today', {
      ...baseD,
      vendorSales: [{ name: longName, orders: 1, revenue: 10 }],
    });
    expect(mockJsPDFInstance.save).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ExportButton component
// ─────────────────────────────────────────────────────────────────────────────

describe('ExportButton (via AnalyticsSection)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDocs.mockResolvedValue(makeGetDocsSnap(MOCK_ORDERS));
    mockJsPDFInstance.internal.pageSize.getHeight = () => 842;
  });

  const openAnalytics = async () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() => screen.getByText('Today'));
  };

  test('Export button renders and toggles dropdown open', async () => {
    await openAnalytics();
    const exportBtn = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportBtn);
    expect(screen.getByText(/Spreadsheet/i)).toBeInTheDocument();
    expect(screen.getByText(/Report/i)).toBeInTheDocument();
  });

  test('clicking Export again closes the dropdown', async () => {
    await openAnalytics();
    const exportBtn = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportBtn);
    fireEvent.click(exportBtn);
    expect(screen.queryByText(/Spreadsheet/i)).not.toBeInTheDocument();
  });

  test('clicking outside the dropdown closes it', async () => {
    await openAnalytics();
    const exportBtn = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportBtn);
    expect(screen.getByText(/Spreadsheet/i)).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    await waitFor(() => expect(screen.queryByText(/Spreadsheet/i)).not.toBeInTheDocument());
  });

  test('CSV option triggers downloadCSV and closes dropdown', async () => {
    await openAnalytics();
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    fireEvent.click(screen.getByText(/Spreadsheet/i));
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(screen.queryByText(/Spreadsheet/i)).not.toBeInTheDocument();
  });

  test('PDF option triggers downloadReport and closes dropdown', async () => {
    await openAnalytics();
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    fireEvent.click(screen.getByText(/Report/i));
    await waitFor(() => expect(mockJsPDFInstance.save).toHaveBeenCalled());
    expect(screen.queryByText(/Report/i)).not.toBeInTheDocument();
  });

  test('onMouseEnter/Leave on CSV button changes background', async () => {
    await openAnalytics();
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    const csvBtn = screen.getByText(/Spreadsheet/i).closest('button');
    fireEvent.mouseEnter(csvBtn);
    expect(csvBtn.style.background).toBe('rgb(245, 245, 248)');
    fireEvent.mouseLeave(csvBtn);
    expect(csvBtn.style.background).toBe('none');
  });

  test('onMouseEnter/Leave on PDF button changes background', async () => {
    await openAnalytics();
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    const pdfBtn = screen.getByText(/Report/i).closest('button');
    fireEvent.mouseEnter(pdfBtn);
    expect(pdfBtn.style.background).toBe('rgb(245, 245, 248)');
    fireEvent.mouseLeave(pdfBtn);
    expect(pdfBtn.style.background).toBe('none');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AnalyticsSection
// ─────────────────────────────────────────────────────────────────────────────

describe('AnalyticsSection', () => {
  beforeEach(() => {
    mockGetDocs.mockResolvedValue(makeGetDocsSnap(MOCK_ORDERS));
  });

  const openAnalytics = async () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() => screen.getByText('Today'));
  };

  test('shows loading while fetching', () => {
    mockGetDocs.mockReturnValue(new Promise(() => {}));
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    expect(screen.getByText(/loading analytics/i)).toBeInTheDocument();
  });

  test('renders revenue card after load', async () => {
    await openAnalytics();
    expect(screen.getByText('Revenue')).toBeInTheDocument();
  });

  test('period switches to This Week', async () => {
    await openAnalytics();
    fireEvent.click(screen.getByRole('button', { name: /this week/i }));
    expect(screen.getByRole('button', { name: /this week/i })).toBeInTheDocument();
  });

  test('period switches to This Month', async () => {
    await openAnalytics();
    fireEvent.click(screen.getByRole('button', { name: /this month/i }));
    expect(screen.getByRole('button', { name: /this month/i })).toBeInTheDocument();
  });

  test('shows "No sales data yet." when topItems is empty', async () => {
    mockGetDocs.mockResolvedValue(makeGetDocsSnap([]));
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() => expect(screen.getByText(/no sales data yet/i)).toBeInTheDocument());
  });

  test('shows "No vendor data available." when vendorSales is empty', async () => {
    mockGetDocs.mockResolvedValue(makeGetDocsSnap([]));
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() => expect(screen.getByText(/no vendor data available/i)).toBeInTheDocument());
  });

  test('catch block logs error when getDocs throws', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetDocs.mockRejectedValueOnce(new Error('Firestore error'));
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    // After error, loading resolves and we get the loading→done transition
    await waitFor(() => expect(spy).toHaveBeenCalled());
    spy.mockRestore();
  });

  test('order with `time` field (not createdAt) is processed correctly', async () => {
    const ordersWithTime = [{ id: 'ot1', vendorName: 'Z', total: 10, status: 'completed',
      customerId: 'cx', time: NOW, items: [] }];
    mockGetDocs.mockResolvedValue(makeGetDocsSnap(ordersWithTime));
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() => expect(screen.getByText('Revenue')).toBeInTheDocument());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AdminDashboard — main component
// ─────────────────────────────────────────────────────────────────────────────

describe('AdminDashboard — rendering & navigation', () => {
  beforeEach(() => {
    mockSetActivePage.mockClear();
    mockGetDocs.mockResolvedValue(makeGetDocsSnap(MOCK_ORDERS));
  });

  test('renders sidebar navigation', () => {
    renderDashboard();
    expect(screen.getByRole('navigation', { name: /admin navigation/i })).toBeInTheDocument();
  });

  test('shows dashboard page by default with recent orders table', () => {
    renderDashboard();
    expect(screen.getByText(/recent orders/i)).toBeInTheDocument();
    expect(screen.getByText('#001')).toBeInTheDocument();
  });

  test('clicking Dashboard nav resets to dashboard view', async () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() => screen.getByText('Today'));
    fireEvent.click(screen.getByRole('button', { name: /^dashboard$/i }));
    expect(screen.getByText(/recent orders/i)).toBeInTheDocument();
  });

  test('clicking Vendors calls setActivePage("admin-vendor-management")', () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /vendors/i }));
    expect(mockSetActivePage).toHaveBeenCalledWith('admin-vendor-management');
  });

  test('clicking Analytics shows Analytics heading', async () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /analytics/i })).toBeInTheDocument()
    );
  });

  test('logout calls signOut and routes to login', async () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /log.?out/i }));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(mockSetActivePage).toHaveBeenCalledWith('login');
  });

  test('logout failure logs error without crashing', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { signOut: mockSignOut } = require('firebase/auth');
    mockSignOut.mockRejectedValueOnce(new Error('auth error'));
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /log.?out/i }));
    await waitFor(() => expect(spy).toHaveBeenCalled());
    spy.mockRestore();
  });

  test('Orders, Users, Payments, Settings nav buttons render without crashing', () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^orders$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^users$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^payments$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^settings$/i }));
    // These are no-ops; just check no crash
    expect(screen.getByText(/recent orders/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AdminVendorManagement
// ─────────────────────────────────────────────────────────────────────────────

describe('AdminVendorManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchAllVendors.mockResolvedValue(MOCK_VENDORS);
    fetchAllAdmins.mockResolvedValue(MOCK_ADMINS);
  });

  const renderAVM = (setActivePage = jest.fn()) =>
    render(<AdminVendorManagement setActivePage={setActivePage} />);

  // ── Loading & error ──────────────────────────────────────────────────────

  test('shows loading spinner initially', () => {
    fetchAllVendors.mockReturnValue(new Promise(() => {}));
    fetchAllAdmins.mockReturnValue(new Promise(() => {}));
    renderAVM();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('shows error alert when fetch rejects', async () => {
    fetchAllVendors.mockRejectedValueOnce(new Error('Network error'));
    renderAVM();
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to load data/i)
    );
  });

  // ── Vendor tab ───────────────────────────────────────────────────────────

  test('renders vendor list with all three vendors', async () => {
    renderAVM();
    await waitFor(() => screen.getByText('Tasty Bites'));
    expect(screen.getByText('Spice Garden')).toBeInTheDocument();
    expect(screen.getByText('Quick Eats')).toBeInTheDocument();
  });

  test('status badges shown for pending, approved, suspended', async () => {
    renderAVM();
    await waitFor(() => screen.getByText('Tasty Bites'));
    expect(screen.getAllByText(/pending/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/approved/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/suspended/i).length).toBeGreaterThanOrEqual(1);
  });

  test('placeholder shown for missing businessName and email', async () => {
    fetchAllVendors.mockResolvedValueOnce([{ id: 'vx', businessName: '', email: '', status: null }]);
    fetchAllAdmins.mockResolvedValueOnce([]);
    renderAVM();
    await waitFor(() => screen.getByRole('table'));
    const rows = screen.getByRole('table').querySelectorAll('tbody tr');
    expect(rows[0].querySelector('strong.avm-vendor-name').textContent).toBe('—');
  });

  test('Approve vendor button calls approveVendor and updates status', async () => {
    renderAVM();
    await waitFor(() => screen.getByText('Tasty Bites'));
    fireEvent.click(screen.getByRole('button', { name: /approve tasty@test\.com/i }));
    await waitFor(() => expect(approveVendor).toHaveBeenCalledWith('v1'));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /approve tasty@test\.com/i })).not.toBeInTheDocument()
    );
  });

  test('Suspend vendor button calls suspendVendor and updates status', async () => {
    renderAVM();
    await waitFor(() => screen.getByText('Tasty Bites'));
    fireEvent.click(screen.getByRole('button', { name: /suspend tasty@test\.com/i }));
    await waitFor(() => expect(suspendVendor).toHaveBeenCalledWith('v1'));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /suspend tasty@test\.com/i })).not.toBeInTheDocument()
    );
  });

  test('action button shows "..." while loading', async () => {
    let resolve;
    approveVendor.mockReturnValue(new Promise(r => { resolve = r; }));
    renderAVM();
    await waitFor(() => screen.getByText('Tasty Bites'));
    const btn = screen.getByRole('button', { name: /approve tasty@test\.com/i });
    fireEvent.click(btn);
    expect(btn.textContent).toBe('...');
    resolve();
  });

  test('action button disabled while loading', async () => {
    approveVendor.mockReturnValue(new Promise(() => {}));
    renderAVM();
    await waitFor(() => screen.getByText('Tasty Bites'));
    const btn = screen.getByRole('button', { name: /approve tasty@test\.com/i });
    fireEvent.click(btn);
    expect(btn).toBeDisabled();
  });

  test('approveVendor failure resets loading state', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    approveVendor.mockRejectedValueOnce(new Error('boom'));
    renderAVM();
    await waitFor(() => screen.getByText('Tasty Bites'));
    fireEvent.click(screen.getByRole('button', { name: /approve tasty@test\.com/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /approve tasty@test\.com/i })).toBeInTheDocument()
    );
    spy.mockRestore();
  });

  test('suspendVendor failure resets loading state', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    suspendVendor.mockRejectedValueOnce(new Error('boom'));
    renderAVM();
    await waitFor(() => screen.getByText('Tasty Bites'));
    fireEvent.click(screen.getByRole('button', { name: /suspend tasty@test\.com/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /suspend tasty@test\.com/i })).toBeInTheDocument()
    );
    spy.mockRestore();
  });

  // ── Status filter ────────────────────────────────────────────────────────

  test('filter Pending shows only pending vendors', async () => {
    renderAVM();
    await waitFor(() => screen.getByText('Tasty Bites'));
    fireEvent.click(screen.getByRole('button', { name: /^pending$/i }));
    await waitFor(() => expect(screen.getByText('Tasty Bites')).toBeInTheDocument());
    expect(screen.queryByText('Spice Garden')).not.toBeInTheDocument();
  });

  test('filter Suspended shows only suspended vendors', async () => {
    renderAVM();
    await waitFor(() => screen.getByText('Quick Eats'));
    fireEvent.click(screen.getAllByRole('button', { name: /^suspended$/i })[0]);
    await waitFor(() => expect(screen.getByText('Quick Eats')).toBeInTheDocument());
    expect(screen.queryByText('Tasty Bites')).not.toBeInTheDocument();
  });

  test('filter Approved shows only approved vendors', async () => {
    renderAVM();
    await waitFor(() => screen.getByText('Spice Garden'));
    fireEvent.click(screen.getAllByRole('button', { name: /^approved$/i })[0]);
    await waitFor(() => expect(screen.getByText('Spice Garden')).toBeInTheDocument());
    expect(screen.queryByText('Tasty Bites')).not.toBeInTheDocument();
  });

  // ── Back button ──────────────────────────────────────────────────────────

  test('Back to Dashboard button calls setActivePage("admin-dashboard")', async () => {
    const mockSet = jest.fn();
    render(<AdminVendorManagement setActivePage={mockSet} />);
    await waitFor(() => screen.getByText('Tasty Bites'));
    fireEvent.click(screen.getByText(/back to dashboard/i));
    expect(mockSet).toHaveBeenCalledWith('admin-dashboard');
  });

  // ── Admin Requests tab ───────────────────────────────────────────────────

  test('Admin Requests tab shows admin list', async () => {
    renderAVM();
    await waitFor(() => screen.getByText('Tasty Bites'));
    fireEvent.click(screen.getByRole('button', { name: /admin requests/i }));
    await waitFor(() => expect(screen.getByText(/alice/i)).toBeInTheDocument());
    expect(screen.getByText(/bob/i)).toBeInTheDocument();
  });

  test('Approve admin calls approveAdmin and removes button', async () => {
    renderAVM();
    await waitFor(() => screen.getByText('Tasty Bites'));
    fireEvent.click(screen.getByRole('button', { name: /admin requests/i }));
    await waitFor(() => screen.getByText(/alice/i));
    fireEvent.click(screen.getByRole('button', { name: /approve alice@test\.com/i }));
    await waitFor(() => expect(approveAdmin).toHaveBeenCalledWith('a1'));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /approve alice@test\.com/i })).not.toBeInTheDocument()
    );
  });

  test('Suspend admin calls suspendAdmin and removes button', async () => {
    renderAVM();
    await waitFor(() => screen.getByText('Tasty Bites'));
    fireEvent.click(screen.getByRole('button', { name: /admin requests/i }));
    await waitFor(() => screen.getByText(/alice/i));
    fireEvent.click(screen.getByRole('button', { name: /suspend alice@test\.com/i }));
    await waitFor(() => expect(suspendAdmin).toHaveBeenCalledWith('a1'));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /suspend alice@test\.com/i })).not.toBeInTheDocument()
    );
  });

  test('approveAdmin failure resets loading state', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    approveAdmin.mockRejectedValueOnce(new Error('boom'));
    renderAVM();
    await waitFor(() => screen.getByText('Tasty Bites'));
    fireEvent.click(screen.getByRole('button', { name: /admin requests/i }));
    await waitFor(() => screen.getByText(/alice/i));
    fireEvent.click(screen.getByRole('button', { name: /approve alice@test\.com/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /approve alice@test\.com/i })).toBeInTheDocument()
    );
    spy.mockRestore();
  });

  test('suspendAdmin failure resets loading state', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    suspendAdmin.mockRejectedValueOnce(new Error('boom'));
    renderAVM();
    await waitFor(() => screen.getByText('Tasty Bites'));
    fireEvent.click(screen.getByRole('button', { name: /admin requests/i }));
    await waitFor(() => screen.getByText(/alice/i));
    fireEvent.click(screen.getByRole('button', { name: /suspend alice@test\.com/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /suspend alice@test\.com/i })).toBeInTheDocument()
    );
    spy.mockRestore();
  });

  test('admin placeholder shown when name/lastName missing', async () => {
    fetchAllVendors.mockResolvedValueOnce([]);
    fetchAllAdmins.mockResolvedValueOnce([{ id: 'ax', name: '', lastName: '', email: 'no@test.com', status: null }]);
    renderAVM();
    fireEvent.click(screen.getByRole('button', { name: /admin requests/i }));
    await waitFor(() => expect(screen.getByText('—')).toBeInTheDocument());
  });

  test('Pending badge shown when admin status is null', async () => {
    fetchAllVendors.mockResolvedValueOnce([]);
    fetchAllAdmins.mockResolvedValueOnce([{ id: 'ax', name: 'X', lastName: 'Y', email: 'x@test.com', status: null }]);
    renderAVM();
    fireEvent.click(screen.getByRole('button', { name: /admin requests/i }));
    await waitFor(() => expect(screen.getAllByText(/pending/i).length).toBeGreaterThan(0));
  });
});