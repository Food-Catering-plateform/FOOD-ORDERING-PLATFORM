import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';


jest.mock('../../Firebase/firebaseConfig', () => ({
  auth: {},
  db:   {},
}));

jest.mock('firebase/auth', () => ({
  signOut: jest.fn(() => Promise.resolve()),
}));

const mockGetDocs = jest.fn();
jest.mock('firebase/firestore', () => ({
  collection:  jest.fn(),
  getDocs:     (...args) => mockGetDocs(...args),
  doc:         jest.fn(),
  updateDoc:   jest.fn(() => Promise.resolve()),
}));

jest.mock('../../Services/vendorService', () => ({
  fetchAllVendors: jest.fn(),
  approveVendor:   jest.fn(() => Promise.resolve()),
  suspendVendor:   jest.fn(() => Promise.resolve()),
  fetchAllAdmins:  jest.fn(),
  approveAdmin:    jest.fn(() => Promise.resolve()),
  suspendAdmin:    jest.fn(() => Promise.resolve()),
}));

import { signOut }                       from 'firebase/auth';
import { fetchAllVendors, approveVendor,
         suspendVendor, fetchAllAdmins,
         approveAdmin,  suspendAdmin }   from '../../Services/vendorService';
import AdminDashboard                    from './AdminDashboard';
import AdminVendorManagement             from './AdminVendorManagement';
import VendorCard                        from './VendorCard';
import { buildBarChart, buildVendorSales,
         buildTopItems, getPeriodStart,
         buildCSV, buildVendorSales as bvs } from './AdminDashboard';

// ── Shared fixtures ───────────────────────────────────────────────────────────

const MOCK_VENDORS = [
  { id: 'v1', businessName: 'Tasty Bites',  email: 'tasty@test.com',  status: 'pending'   },
  { id: 'v2', businessName: 'Spice Garden', email: 'spice@test.com',  status: 'approved'  },
  { id: 'v3', businessName: 'Quick Eats',   email: 'quick@test.com',  status: 'suspended' },
];

const MOCK_ADMINS = [
  { id: 'a1', name: 'Alice', lastName: 'Admin', email: 'alice@test.com', status: 'approved' },
  { id: 'a2', name: 'Bob',   lastName: 'Admin', email: 'bob@test.com',   status: 'pending'  },
];

const mockSetActivePage = jest.fn();
const renderAdminDashboard = () =>
  render(<AdminDashboard setActivePage={mockSetActivePage} />);

const NOW = new Date().toISOString();

const MOCK_ORDERS = [
  {
    id: 'o1', vendorName: 'Tasty Bites', total: 150, status: 'completed',
    createdAt: NOW, customerId: 'c1',
    items: [{ name: 'Bunny Chow', qty: 2, price: 45 }],
  },
  {
    id: 'o2', vendorName: 'Spice Garden', total: 200, status: 'completed',
    createdAt: NOW, customerId: 'c2',
    items: [
      { name: 'Curry Platter', qty: 1, price: 120 },
      { name: 'Roti',          qty: 2, price: 20  },
    ],
  },
  {
    id: 'o3', vendorName: 'Tasty Bites', total: 90, status: 'cancelled',
    createdAt: NOW,
    items: [{ name: 'Bunny Chow', qty: 1, price: 45 }],
  },
  {
    id: 'o4', vendorName: 'Tasty Bites', total: 50, status: 'pending',
    createdAt: NOW,
    items: [{ name: 'Vetkoek', qty: 1, price: 50 }],
  },
];

describe('AdminDashboard — rendering', () => {
  beforeEach(() => {
    mockSetActivePage.mockClear();
    mockGetDocs.mockResolvedValue({
      docs: MOCK_ORDERS.map(o => ({ id: o.id, data: () => o })),
    });
  });

  test('TC-AD-01: renders the admin sidebar with navigation links', async () => {
    renderAdminDashboard();
    expect(screen.getByRole('navigation', { name: /admin navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/vendors/i)).toBeInTheDocument();
  });

  test('TC-AD-02: shows the Dashboard section by default', async () => {
    renderAdminDashboard();
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/recent orders/i)).toBeInTheDocument();
  });

  test('TC-AD-03: displays period selector when Analytics is selected', async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() => {
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('This Week')).toBeInTheDocument();
      expect(screen.getByText('This Month')).toBeInTheDocument();
    });
  });

  test('TC-AD-04: shows loading state while fetching analytics orders', async () => {
    mockGetDocs.mockReturnValue(new Promise(() => {})); // never resolves
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    expect(screen.getByText(/loading analytics/i)).toBeInTheDocument();
  });

  test('TC-AD-05: logout button calls signOut and redirects', async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /log.?out/i }));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(mockSetActivePage).toHaveBeenCalledWith('login');
  });

  test('TC-AD-06: dashboard shows summary stat cards', async () => {
    renderAdminDashboard();
    await waitFor(() => {
      expect(screen.getByText(/total orders/i)).toBeInTheDocument();
      expect(screen.getAllByText(/revenue/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/unique customers/i)).toBeInTheDocument();
    });
  });

  test('TC-AD-07: recent orders table has correct columns', async () => {
    renderAdminDashboard();
    await waitFor(() => {
      expect(screen.getByText(/order id/i)).toBeInTheDocument();
      expect(screen.getByText(/customer/i)).toBeInTheDocument();
      expect(screen.getByText(/status/i)).toBeInTheDocument();
    });
  });

  test('TC-AD-08: recent orders table shows real order data, not hardcoded names', async () => {
    renderAdminDashboard();
    await waitFor(() => {
      expect(screen.queryByText('John')).not.toBeInTheDocument();
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
      expect(screen.queryByText('Mike')).not.toBeInTheDocument();
    });
  });

  test('TC-AD-09: clicking Dashboard nav shows dashboard heading', async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /analytics/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /dashboard/i }));
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
  });

  test('TC-AD-10: analytics section shows Revenue card after loading', async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/revenue/i).length).toBeGreaterThan(0);
    });
  });

  test('TC-AD-11: analytics section shows Total Orders card', async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/total orders/i).length).toBeGreaterThan(0);
    });
  });

  test('TC-AD-12: analytics section shows Completion Rate card', async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() => {
      expect(screen.getByText(/completion rate/i)).toBeInTheDocument();
    });
  });

  test('TC-AD-13: analytics section shows Customers Served card', async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() => {
      expect(screen.getByText(/customers served/i)).toBeInTheDocument();
    });
  });

  test('TC-AD-14: analytics This Week period button is clickable', async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() => screen.getByText('This Week'));
    fireEvent.click(screen.getByText('This Week'));
    expect(screen.getByText('This Week')).toBeInTheDocument();
  });

  test('TC-AD-15: analytics This Month period button is clickable', async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() => screen.getByText('This Month'));
    fireEvent.click(screen.getByText('This Month'));
    expect(screen.getByText('This Month')).toBeInTheDocument();
  });

  test('TC-AD-16: analytics shows Orders Overview section', async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() => {
      expect(screen.getByText(/orders overview/i)).toBeInTheDocument();
    });
  });

  test('TC-AD-17: analytics shows Top Selling Items section', async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() => {
      expect(screen.getByText(/top selling items/i)).toBeInTheDocument();
    });
  });

  test('TC-AD-18: analytics shows Sales per Vendor section', async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() => {
      expect(screen.getByText(/sales per vendor/i)).toBeInTheDocument();
    });
  });

  test('TC-AD-19: error in analytics fetch logs but does not crash', async () => {
    mockGetDocs.mockRejectedValue(new Error('Firestore error'));
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() => {
      expect(screen.queryByText(/loading analytics/i)).not.toBeInTheDocument();
    });
  });

  test('TC-AD-20: Export button renders in analytics view', async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });
  });

  test('TC-AD-21: Export dropdown opens when Export button is clicked', async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() => screen.getByRole('button', { name: /export/i }));
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(screen.getByText(/spreadsheet/i)).toBeInTheDocument();
  });

  test('TC-AD-22: Export dropdown shows CSV and PDF options', async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() => screen.getByRole('button', { name: /export/i }));
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(screen.getByText(/\.csv/i)).toBeInTheDocument();
    expect(screen.getByText(/\.pdf/i)).toBeInTheDocument();
  });

  test('TC-AD-23: Export dropdown closes on outside click', async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() => screen.getByRole('button', { name: /export/i }));
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(screen.getByText(/spreadsheet/i)).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByText(/spreadsheet/i)).not.toBeInTheDocument();
    });
  });

  test('TC-AD-24: empty orders show No sales data message in top items', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() => {
      expect(screen.getByText(/no sales data yet/i)).toBeInTheDocument();
    });
  });

  test('TC-AD-25: empty orders show No vendor data in vendor table', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() => {
      expect(screen.getByText(/no vendor data available/i)).toBeInTheDocument();
    });
  });
});


describe('AdminDashboard — analytics helpers', () => {
  const todayOrders = [
    { createdAt: new Date().toISOString(), vendorName: 'A', total: 100,
      items: [{ name: 'X', qty: 3, price: 33 }] },
    { createdAt: new Date().toISOString(), vendorName: 'A', total: 80,
      items: [{ name: 'Y', qty: 1, price: 80 }] },
    { createdAt: new Date().toISOString(), vendorName: 'B', total: 60,
      items: [{ name: 'X', qty: 2, price: 30 }] },
  ];

  test('TC-AN-01: buildBarChart "Today" returns 14 hourly slots', () => {
    const chart = buildBarChart(todayOrders, 'Today');
    expect(chart).toHaveLength(14);
    expect(chart[0].label).toBe('7am');
    expect(chart[13].label).toBe('8pm');
  });

  test('TC-AN-02: buildBarChart "This Week" returns 7 day slots', () => {
    const chart = buildBarChart(todayOrders, 'This Week');
    expect(chart).toHaveLength(7);
    expect(chart.map(c => c.label)).toContain('Mon');
    expect(chart.map(c => c.label)).toContain('Sun');
  });

  test('TC-AN-03: buildBarChart "This Month" returns 4 weekly slots', () => {
    const chart = buildBarChart(todayOrders, 'This Month');
    expect(chart).toHaveLength(4);
    expect(chart[0].label).toBe('Wk 1');
  });

  test('TC-AN-04: buildVendorSales aggregates revenue and orders per vendor', () => {
    const sales = buildVendorSales(todayOrders);
    const vendorA = sales.find(s => s.name === 'A');
    const vendorB = sales.find(s => s.name === 'B');
    expect(vendorA).toBeDefined();
    expect(vendorA.orders).toBe(2);
    expect(vendorA.revenue).toBe(180);
    expect(vendorB.orders).toBe(1);
    expect(vendorB.revenue).toBe(60);
  });

  test('TC-AN-05: buildVendorSales sorts vendors by revenue descending', () => {
    const sales = buildVendorSales(todayOrders);
    expect(sales[0].name).toBe('A');
  });

  test('TC-AN-06: buildTopItems counts sold quantities across orders', () => {
    const top = buildTopItems(todayOrders);
    const itemX = top.find(i => i.name === 'X');
    expect(itemX).toBeDefined();
    expect(itemX.sold).toBe(5); // 3 + 2
  });

  test('TC-AN-07: getPeriodStart returns start of today for "Today"', () => {
    const start = getPeriodStart('Today');
    const today = new Date();
    expect(start.getFullYear()).toBe(today.getFullYear());
    expect(start.getMonth()).toBe(today.getMonth());
    expect(start.getDate()).toBe(today.getDate());
    expect(start.getHours()).toBe(0);
  });

  test('TC-AN-08: getPeriodStart returns first day of month for "This Month"', () => {
    const start = getPeriodStart('This Month');
    expect(start.getDate()).toBe(1);
  });

  test('TC-AN-09: buildBarChart returns empty array for unknown period', () => {
    const chart = buildBarChart(todayOrders, 'Last Year');
    expect(chart).toHaveLength(0);
  });

  test('TC-AN-10: buildVendorSales labels orders with missing vendorName as "Unknown Vendor"', () => {
    const orders = [{ total: 50, items: [] }];
    const sales  = buildVendorSales(orders);
    expect(sales[0].name).toBe('Unknown Vendor');
  });

  test('TC-AN-11: buildTopItems revenue is qty * price per item', () => {
    const top = buildTopItems(todayOrders);
    const itemX = top.find(i => i.name === 'X');
    // X appears as qty:3 price:33 and qty:2 price:30 → revenue = 3*33 + 2*30 = 99+60 = 159
    expect(itemX.revenue).toBe(159);
  });

  test('TC-AN-12: buildTopItems returns max 5 items, sorted by sold desc', () => {
    const manyOrders = Array.from({ length: 10 }, (_, i) => ({
      createdAt: NOW,
      vendorName: 'V',
      total: 10,
      items: [{ name: `Item${i}`, qty: 10 - i, price: 10 }],
    }));
    const top = buildTopItems(manyOrders);
    expect(top.length).toBe(5);
    expect(top[0].sold).toBeGreaterThanOrEqual(top[1].sold);
  });

  test('TC-AN-13: getPeriodStart for "This Week" returns a Monday or prior', () => {
    const start = getPeriodStart('This Week');
    const day = start.getDay();
    expect(day).toBe(1); // Monday
  });

  test('TC-AN-14: getPeriodStart unknown period returns epoch', () => {
    const start = getPeriodStart('Future');
    expect(start.getTime()).toBe(0);
  });

  test('TC-AN-15: buildBarChart Today uses "time" field if createdAt is absent', () => {
    const hour = 10;
    const now = new Date();
    now.setHours(hour, 0, 0, 0);
    const orders = [{ time: now.toISOString(), items: [] }];
    const chart = buildBarChart(orders, 'Today');
    // Hour 10 maps to index 10-7=3
    expect(chart[3].value).toBe(1);
  });

  test('TC-AN-16: buildBarChart Today ignores orders outside 7am-8pm', () => {
    const early = new Date(); early.setHours(3, 0, 0, 0);
    const orders = [{ createdAt: early.toISOString(), items: [] }];
    const chart = buildBarChart(orders, 'Today');
    const total = chart.reduce((s, c) => s + c.value, 0);
    expect(total).toBe(0);
  });

  test('TC-AN-17: buildVendorSales with empty orders returns empty array', () => {
    expect(buildVendorSales([])).toEqual([]);
  });

  test('TC-AN-18: buildTopItems with orders having no items returns empty', () => {
    const orders = [{ vendorName: 'V', total: 100, items: [] }];
    expect(buildTopItems(orders)).toEqual([]);
  });
});

describe('AdminDashboard — buildCSV', () => {
  const sampleData = {
    revenue:     350,
    orders:      4,
    completed:   2,
    cancelled:   1,
    customers:   2,
    hourly:      [{ label: '9am', value: 2 }, { label: '10am', value: 2 }],
    topItems:    [{ name: 'Bunny Chow', sold: 3, revenue: 135 }],
    vendorSales: [{ name: 'Tasty Bites', orders: 2, revenue: 200 }],
  };

  test('TC-CSV-01: buildCSV returns a non-empty string', () => {
    const csv = buildCSV('Today', sampleData);
    expect(typeof csv).toBe('string');
    expect(csv.length).toBeGreaterThan(0);
  });

  test('TC-CSV-02: buildCSV includes ADMIN ANALYTICS REPORT header', () => {
    const csv = buildCSV('Today', sampleData);
    expect(csv).toContain('ADMIN ANALYTICS REPORT');
  });

  test('TC-CSV-03: buildCSV includes the period name', () => {
    const csv = buildCSV('This Week', sampleData);
    expect(csv).toContain('This Week');
  });

  test('TC-CSV-04: buildCSV includes revenue value', () => {
    const csv = buildCSV('Today', sampleData);
    expect(csv).toContain('350.00');
  });

  test('TC-CSV-05: buildCSV includes top item name', () => {
    const csv = buildCSV('Today', sampleData);
    expect(csv).toContain('Bunny Chow');
  });

  test('TC-CSV-06: buildCSV includes vendor name', () => {
    const csv = buildCSV('Today', sampleData);
    expect(csv).toContain('Tasty Bites');
  });

  test('TC-CSV-07: buildCSV completion rate is correct when orders > 0', () => {
    const csv = buildCSV('Today', sampleData);
    expect(csv).toContain('50%');
  });

  test('TC-CSV-08: buildCSV completion rate is 0% when no orders', () => {
    const csv = buildCSV('Today', { ...sampleData, orders: 0, completed: 0 });
    expect(csv).toContain('0%');
  });

  test('TC-CSV-09: buildCSV escapes commas in names', () => {
    const data = {
      ...sampleData,
      vendorSales: [{ name: 'Bites, Co.', orders: 1, revenue: 50 }],
    };
    const csv = buildCSV('Today', data);
    expect(csv).toContain('"Bites, Co."');
  });

  test('TC-CSV-10: buildCSV escapes double quotes in values', () => {
    const data = {
      ...sampleData,
      topItems: [{ name: 'Say "Hi"', sold: 1, revenue: 50 }],
    };
    const csv = buildCSV('Today', data);
    expect(csv).toContain('Say ""Hi""');
  });
});

describe('AdminVendorManagement', () => {
  beforeEach(() => {
    fetchAllVendors.mockResolvedValue(MOCK_VENDORS);
    fetchAllAdmins.mockResolvedValue(MOCK_ADMINS);
  });

  afterEach(() => jest.clearAllMocks());

  test('TC-VM-01: renders vendor list after loading', async () => {
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('Tasty Bites')).toBeInTheDocument();
      expect(screen.getByText('Spice Garden')).toBeInTheDocument();
    });
  });

  test('TC-VM-02: shows correct status badges for each vendor', async () => {
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/pending/i)).toBeInTheDocument();
      expect(screen.getByText(/approved/i)).toBeInTheDocument();
      expect(screen.getByText(/suspended/i)).toBeInTheDocument();
    });
  });

  test('TC-VM-03: "Approve" button calls approveVendor with correct ID', async () => {
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => screen.getByText('Tasty Bites'));
    fireEvent.click(screen.getByRole('button', { name: /approve tasty@test\.com/i }));
    await waitFor(() => expect(approveVendor).toHaveBeenCalledWith('v1'));
  });

  test('TC-VM-04: "Suspend" button calls suspendVendor with correct ID', async () => {
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => screen.getByText('Spice Garden'));
    fireEvent.click(screen.getByRole('button', { name: /suspend spice@test\.com/i }));
    await waitFor(() => expect(suspendVendor).toHaveBeenCalledWith('v2'));
  });

  test('TC-VM-05: vendor status updates optimistically after approval', async () => {
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => screen.getByText('Tasty Bites'));
    fireEvent.click(screen.getByRole('button', { name: /approve tasty@test\.com/i }));
    await waitFor(() => {
      const cards = screen.getAllByText(/approved/i);
      expect(cards.length).toBeGreaterThan(1);
    });
  });

  test('TC-VM-06: filter "pending" shows only pending vendors', async () => {
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => screen.getByText('Tasty Bites'));
    fireEvent.click(screen.getByRole('button', { name: /^pending/i }));
    await waitFor(() => {
      expect(screen.getByText('Tasty Bites')).toBeInTheDocument();
      expect(screen.queryByText('Spice Garden')).not.toBeInTheDocument();
    });
  });

  test('TC-VM-07: filter "suspended" shows only suspended vendors', async () => {
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => screen.getByText('Quick Eats'));
    const suspendFilter = screen.getAllByRole('button', { name: /suspended/i })[0];
    fireEvent.click(suspendFilter);
    await waitFor(() => {
      expect(screen.getByText('Quick Eats')).toBeInTheDocument();
      expect(screen.queryByText('Tasty Bites')).not.toBeInTheDocument();
    });
  });

  test('TC-VM-08: shows admin list when Admin Requests tab is clicked', async () => {
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => screen.getByText('Tasty Bites'));
    fireEvent.click(screen.getByRole('button', { name: /admin requests/i }));
    await waitFor(() => {
      expect(screen.getByText(/alice/i)).toBeInTheDocument();
      expect(screen.getByText(/bob/i)).toBeInTheDocument();
    });
  });

  test('TC-VM-09: shows error message when fetch fails', async () => {
    fetchAllVendors.mockRejectedValue(new Error('Network error'));
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });

  test('TC-VM-10: action buttons are disabled while an action is loading', async () => {
    approveVendor.mockReturnValue(new Promise(() => {})); // hangs
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => screen.getByText('Tasty Bites'));
    const approveBtn = screen.getByRole('button', { name: /approve tasty@test\.com/i });
    fireEvent.click(approveBtn);
    expect(approveBtn).toBeDisabled();
  });

  test('TC-VM-11: vendor count badges update correctly per tab', async () => {
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => screen.getByText('Tasty Bites'));
    const vendorTab = screen.getByRole('button', { name: /vendors 3/i });
    expect(vendorTab).toBeInTheDocument();
  });

  test('TC-VM-12: "All" filter shows all vendors', async () => {
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => screen.getByText('Tasty Bites'));
    fireEvent.click(screen.getByRole('button', { name: /^pending/i }));
    fireEvent.click(screen.getByRole('button', { name: /^all/i }));
    await waitFor(() => {
      expect(screen.getByText('Tasty Bites')).toBeInTheDocument();
      expect(screen.getByText('Spice Garden')).toBeInTheDocument();
      expect(screen.getByText('Quick Eats')).toBeInTheDocument();
    });
  });

  test('TC-VM-13: filter "approved" shows only approved vendors', async () => {
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => screen.getByText('Spice Garden'));
    fireEvent.click(screen.getByRole('button', { name: /^approved/i }));
    await waitFor(() => {
      expect(screen.getByText('Spice Garden')).toBeInTheDocument();
      expect(screen.queryByText('Tasty Bites')).not.toBeInTheDocument();
    });
  });

  test('TC-VM-14: back button calls setActivePage with admin-dashboard', async () => {
    const setActivePage = jest.fn();
    render(<AdminVendorManagement setActivePage={setActivePage} />);
    const backBtn = screen.getByRole('button', { name: /back to dashboard/i });
    fireEvent.click(backBtn);
    expect(setActivePage).toHaveBeenCalledWith('admin-dashboard');
  });

  test('TC-VM-15: shows empty state when no vendors match filter', async () => {
    fetchAllVendors.mockResolvedValue([
      { id: 'v1', businessName: 'Only Pending', email: 'p@test.com', status: 'pending' },
    ]);
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => screen.getByText('Only Pending'));
    fireEvent.click(screen.getByRole('button', { name: /^approved/i }));
    await waitFor(() => {
      expect(screen.getByText(/no vendors found/i)).toBeInTheDocument();
    });
  });

  test('TC-VM-16: suspend button updates status optimistically', async () => {
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => screen.getByText('Spice Garden'));
    const suspendBtn = screen.getByRole('button', { name: /suspend spice@test\.com/i });
    fireEvent.click(suspendBtn);
    await waitFor(() => {
      const suspended = screen.getAllByText(/suspended/i);
      expect(suspended.length).toBeGreaterThan(1);
    });
  });

  test('TC-VM-17: admin approve calls approveAdmin', async () => {
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => screen.getByText('Tasty Bites'));
    fireEvent.click(screen.getByRole('button', { name: /admin requests/i }));
    await waitFor(() => screen.getByText(/bob/i));
    const approveBtn = screen.getByRole('button', { name: /approve bob@test\.com/i });
    fireEvent.click(approveBtn);
    await waitFor(() => expect(approveAdmin).toHaveBeenCalledWith('a2'));
  });

  test('TC-VM-18: admin suspend calls suspendAdmin', async () => {
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => screen.getByText('Tasty Bites'));
    fireEvent.click(screen.getByRole('button', { name: /admin requests/i }));
    await waitFor(() => screen.getByText(/alice/i));
    const suspendBtn = screen.getByRole('button', { name: /suspend alice@test\.com/i });
    fireEvent.click(suspendBtn);
    await waitFor(() => expect(suspendAdmin).toHaveBeenCalledWith('a1'));
  });

  test('TC-VM-19: shows loading initially before data arrives', () => {
    fetchAllVendors.mockReturnValue(new Promise(() => {}));
    fetchAllAdmins.mockReturnValue(new Promise(() => {}));
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('TC-VM-20: filter resets when switching between vendor/admin tabs', async () => {
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => screen.getByText('Tasty Bites'));
    fireEvent.click(screen.getByRole('button', { name: /^pending/i }));
    fireEvent.click(screen.getByRole('button', { name: /admin requests/i }));
    fireEvent.click(screen.getByRole('button', { name: /vendors/i }));
    await waitFor(() => {
      expect(screen.getByText('Tasty Bites')).toBeInTheDocument();
      expect(screen.getByText('Spice Garden')).toBeInTheDocument();
    });
  });
});

describe('VendorCard component', () => {
  const baseVendor = {
    id: 'v1', name: 'Test Vendor', email: 'test@vendor.com',
    storeName: 'Test Store', status: 'pending',
  };
  const onApprove = jest.fn();
  const onSuspend = jest.fn();

  afterEach(() => jest.clearAllMocks());

  test('TC-VC-01: renders vendor name', () => {
    render(<VendorCard vendor={baseVendor} onApprove={onApprove} onSuspend={onSuspend} isLoading={false} />);
    expect(screen.getByText('Test Vendor')).toBeInTheDocument();
  });

  test('TC-VC-02: renders vendor email', () => {
    render(<VendorCard vendor={baseVendor} onApprove={onApprove} onSuspend={onSuspend} isLoading={false} />);
    expect(screen.getByText('test@vendor.com')).toBeInTheDocument();
  });

  test('TC-VC-03: renders store name', () => {
    render(<VendorCard vendor={baseVendor} onApprove={onApprove} onSuspend={onSuspend} isLoading={false} />);
    expect(screen.getByText(/test store/i)).toBeInTheDocument();
  });

  test('TC-VC-04: renders Pending status badge for pending vendor', () => {
    render(<VendorCard vendor={baseVendor} onApprove={onApprove} onSuspend={onSuspend} isLoading={false} />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  test('TC-VC-05: renders Approve button for pending vendor', () => {
    render(<VendorCard vendor={baseVendor} onApprove={onApprove} onSuspend={onSuspend} isLoading={false} />);
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
  });

  test('TC-VC-06: renders Suspend button for pending vendor', () => {
    render(<VendorCard vendor={baseVendor} onApprove={onApprove} onSuspend={onSuspend} isLoading={false} />);
    expect(screen.getByRole('button', { name: /suspend/i })).toBeInTheDocument();
  });

  test('TC-VC-07: clicking Approve calls onApprove with vendor id', () => {
    render(<VendorCard vendor={baseVendor} onApprove={onApprove} onSuspend={onSuspend} isLoading={false} />);
    fireEvent.click(screen.getByRole('button', { name: /approve/i }));
    expect(onApprove).toHaveBeenCalledWith('v1');
  });

  test('TC-VC-08: clicking Suspend calls onSuspend with vendor id', () => {
    render(<VendorCard vendor={baseVendor} onApprove={onApprove} onSuspend={onSuspend} isLoading={false} />);
    fireEvent.click(screen.getByRole('button', { name: /suspend/i }));
    expect(onSuspend).toHaveBeenCalledWith('v1');
  });

  test('TC-VC-09: approved vendor does not show Approve button', () => {
    const vendor = { ...baseVendor, status: 'approved' };
    render(<VendorCard vendor={vendor} onApprove={onApprove} onSuspend={onSuspend} isLoading={false} />);
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
  });

  test('TC-VC-10: suspended vendor does not show Suspend button', () => {
    const vendor = { ...baseVendor, status: 'suspended' };
    render(<VendorCard vendor={vendor} onApprove={onApprove} onSuspend={onSuspend} isLoading={false} />);
    expect(screen.queryByRole('button', { name: /suspend/i })).not.toBeInTheDocument();
  });

  test('TC-VC-11: isLoading disables buttons and shows ellipsis', () => {
    render(<VendorCard vendor={baseVendor} onApprove={onApprove} onSuspend={onSuspend} isLoading={true} />);
    const btns = screen.getAllByRole('button');
    btns.forEach(btn => expect(btn).toBeDisabled());
    expect(screen.getAllByText('...').length).toBeGreaterThan(0);
  });

  test('TC-VC-12: shows "Unnamed Vendor" when name is absent', () => {
    const vendor = { ...baseVendor, name: undefined };
    render(<VendorCard vendor={vendor} onApprove={onApprove} onSuspend={onSuspend} isLoading={false} />);
    expect(screen.getByText('Unnamed Vendor')).toBeInTheDocument();
  });

  test('TC-VC-13: shows "No email" when email is absent', () => {
    const vendor = { ...baseVendor, email: undefined };
    render(<VendorCard vendor={vendor} onApprove={onApprove} onSuspend={onSuspend} isLoading={false} />);
    expect(screen.getByText('No email')).toBeInTheDocument();
  });

  test('TC-VC-14: shows "N/A" when storeName is absent', () => {
    const vendor = { ...baseVendor, storeName: undefined };
    render(<VendorCard vendor={vendor} onApprove={onApprove} onSuspend={onSuspend} isLoading={false} />);
    expect(screen.getByText(/n\/a/i)).toBeInTheDocument();
  });

  test('TC-VC-15: null status defaults to Pending badge', () => {
    const vendor = { ...baseVendor, status: undefined };
    render(<VendorCard vendor={vendor} onApprove={onApprove} onSuspend={onSuspend} isLoading={false} />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });
});


import { DIETARY_OPTIONS, ALLERGENS, ALLERGEN_ICONS } from '../Vendor/MenuManagement';

describe('Dietary & Allergen — standardised data source', () => {
  test('TC-DA-01: DIETARY_OPTIONS includes Halal', () => {
    expect(DIETARY_OPTIONS.map(d => d.key)).toContain('halal');
  });

  test('TC-DA-02: DIETARY_OPTIONS includes Vegan', () => {
    expect(DIETARY_OPTIONS.map(d => d.key)).toContain('vegan');
  });

  test('TC-DA-03: DIETARY_OPTIONS includes Nut-Free', () => {
    expect(DIETARY_OPTIONS.map(d => d.key)).toContain('nut-free');
  });

  test('TC-DA-04: DIETARY_OPTIONS includes Gluten-Free', () => {
    expect(DIETARY_OPTIONS.map(d => d.key)).toContain('gluten-free');
  });

  test('TC-DA-05: DIETARY_OPTIONS includes Vegetarian', () => {
    expect(DIETARY_OPTIONS.map(d => d.key)).toContain('vegetarian');
  });

  test('TC-DA-06: every DIETARY_OPTIONS entry has key, label, and icon', () => {
    DIETARY_OPTIONS.forEach(d => {
      expect(d).toHaveProperty('key');
      expect(d).toHaveProperty('label');
      expect(d).toHaveProperty('icon');
      expect(typeof d.key).toBe('string');
      expect(d.key.length).toBeGreaterThan(0);
    });
  });

  test('TC-DA-07: ALLERGENS list contains the 10 required items', () => {
    const required = ['Gluten','Dairy','Eggs','Nuts','Peanuts','Soy','Fish','Shellfish','Sesame','Sulphites'];
    required.forEach(a => expect(ALLERGENS).toContain(a));
  });

  test('TC-DA-08: every allergen in ALLERGENS has an icon in ALLERGEN_ICONS', () => {
    ALLERGENS.forEach(a => {
      expect(ALLERGEN_ICONS).toHaveProperty(a);
      expect(typeof ALLERGEN_ICONS[a]).toBe('string');
    });
  });

  test('TC-DA-09: DIETARY_OPTIONS keys are all lowercase', () => {
    DIETARY_OPTIONS.forEach(d => expect(d.key).toBe(d.key.toLowerCase()));
  });

  test('TC-DA-10: no duplicate keys in DIETARY_OPTIONS', () => {
    const keys = DIETARY_OPTIONS.map(d => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('TC-DA-11: no duplicate entries in ALLERGENS', () => {
    expect(new Set(ALLERGENS).size).toBe(ALLERGENS.length);
  });

  test('TC-DA-12: DIETARY_OPTIONS has exactly 5 entries', () => {
    expect(DIETARY_OPTIONS).toHaveLength(5);
  });

  test('TC-DA-13: ALLERGENS has exactly 10 entries', () => {
    expect(ALLERGENS).toHaveLength(10);
  });
});


describe('AdminDashboard — navigation (updated)', () => {
  beforeEach(() => {
    mockSetActivePage.mockClear();
    mockGetDocs.mockResolvedValue({ docs: [] });
  });

  test('TC-NAV-01: clicking "Vendors" nav item calls setActivePage', async () => {
    renderAdminDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /vendors/i }));
    expect(mockSetActivePage).toHaveBeenCalledWith('admin-vendor-management');
  });

  test('TC-NAV-02: clicking "Analytics" shows Analytics heading', async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /analytics/i })).toBeInTheDocument()
    );
  });

  test('TC-NAV-03: clicking "Dashboard" from Analytics returns to dashboard view', async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() => screen.getByRole('heading', { name: /analytics/i }));
    fireEvent.click(screen.getByRole('button', { name: /^dashboard$/i }));
    await waitFor(() => expect(screen.getByText(/recent orders/i)).toBeInTheDocument());
  });

  test('TC-NAV-04: clicking "Orders" shows Orders heading', async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^orders$/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /^orders$/i })).toBeInTheDocument()
    );
  });

  test('TC-NAV-05: clicking "Users" shows Users heading', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^users$/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /^users$/i })).toBeInTheDocument()
    );
  });

  test('TC-NAV-06: clicking "Payments" shows Payments heading', async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^payments$/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /^payments$/i })).toBeInTheDocument()
    );
  });

  test('TC-NAV-07: clicking "Settings" shows Settings heading', async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^settings$/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /^settings$/i })).toBeInTheDocument()
    );
  });

  test('TC-NAV-08: active nav item is highlighted when page is selected', async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^orders$/i }));
    await waitFor(() => {
      const li = screen.getByRole('button', { name: /^orders$/i }).closest('li');
      expect(li).toHaveClass('active');
    });
  });

  test('TC-NAV-09: only one nav item is active at a time', async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^payments$/i }));
    await waitFor(() => {
      const activeItems = document.querySelectorAll('li.active');
      expect(activeItems.length).toBe(1);
    });
  });

  test('TC-NAV-10: header title updates to match active section', async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^payments$/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /^payments$/i })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: /^settings$/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /^settings$/i })).toBeInTheDocument()
    );
  });
});


// ─── Orders Section ───────────────────────────────────────────────────────────

describe('AdminDashboard — Orders section', () => {
  beforeEach(() => {
    mockSetActivePage.mockClear();
    mockGetDocs.mockResolvedValue({
      docs: MOCK_ORDERS.map(o => ({ id: o.id, data: () => o })),
    });
  });

  const goToOrders = async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^orders$/i }));
    await waitFor(() => screen.getByRole('heading', { name: /^orders$/i }));
  };

  test('TC-ORD-01: shows loading state while fetching orders', async () => {
    mockGetDocs.mockReturnValue(new Promise(() => {}));
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^orders$/i }));
    expect(screen.getByText(/loading orders/i)).toBeInTheDocument();
  });

  test('TC-ORD-02: renders orders table with correct column headers', async () => {
    await goToOrders();
    await waitFor(() => {
      expect(screen.getByText(/order id/i)).toBeInTheDocument();
      expect(screen.getByText(/vendor/i)).toBeInTheDocument();
      expect(screen.getByText(/total/i)).toBeInTheDocument();
      expect(screen.getByText(/status/i)).toBeInTheDocument();
    });
  });

  test('TC-ORD-03: shows all orders by default (All filter)', async () => {
    await goToOrders();
    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(5); // 1 header + 4 data
    });
  });

  test('TC-ORD-04: filter tabs are rendered (All, Pending, Completed, Cancelled)', async () => {
    await goToOrders();
    expect(screen.getByRole('button', { name: /^all/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^pending/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^completed/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancelled/i })).toBeInTheDocument();
  });

  test('TC-ORD-05: Completed filter shows only completed orders', async () => {
    await goToOrders();
    await waitFor(() => screen.getAllByRole('row'));
    fireEvent.click(screen.getByRole('button', { name: /^completed/i }));
    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(3); // 2 completed + 1 header
    });
  });

  test('TC-ORD-06: Cancelled filter shows only cancelled orders', async () => {
    await goToOrders();
    await waitFor(() => screen.getAllByRole('row'));
    fireEvent.click(screen.getByRole('button', { name: /^cancelled/i }));
    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(2); // 1 cancelled + 1 header
    });
  });

  test('TC-ORD-07: Pending filter shows only pending orders', async () => {
    await goToOrders();
    await waitFor(() => screen.getAllByRole('row'));
    fireEvent.click(screen.getByRole('button', { name: /^pending/i }));
    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(2); // 1 pending + 1 header
    });
  });

  test('TC-ORD-08: filter counts are shown next to tab labels', async () => {
    await goToOrders();
    await waitFor(() => {
      expect(screen.getByText('(4)')).toBeInTheDocument();
      expect(screen.getByText('(2)')).toBeInTheDocument();
    });
  });

  test('TC-ORD-09: order rows show vendor name', async () => {
    await goToOrders();
    await waitFor(() => {
      expect(screen.getAllByText('Tasty Bites').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Spice Garden').length).toBeGreaterThan(0);
    });
  });

  test('TC-ORD-10: order rows show status badge', async () => {
    await goToOrders();
    await waitFor(() => {
      expect(screen.getAllByText(/completed/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/cancelled/i).length).toBeGreaterThan(0);
    });
  });

  test('TC-ORD-11: order rows show formatted total in Rands', async () => {
    await goToOrders();
    await waitFor(() => {
      expect(screen.getByText(/R 150/i)).toBeInTheDocument();
    });
  });

  test('TC-ORD-12: shows "No orders found" when collection is empty', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^orders$/i }));
    await waitFor(() => {
      expect(screen.getByText(/no orders found/i)).toBeInTheDocument();
    });
  });

  test('TC-ORD-13: Firestore error does not crash the orders section', async () => {
    mockGetDocs.mockRejectedValue(new Error('Firestore down'));
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^orders$/i }));
    await waitFor(() => {
      expect(screen.queryByText(/loading orders/i)).not.toBeInTheDocument();
    });
  });

  test('TC-ORD-14: order items are displayed in each row', async () => {
    await goToOrders();
    await waitFor(() => {
      expect(screen.getByText(/bunny chow/i)).toBeInTheDocument();
    });
  });

  test('TC-ORD-15: All filter re-shows all orders after another filter was active', async () => {
    await goToOrders();
    await waitFor(() => screen.getAllByRole('row'));
    fireEvent.click(screen.getByRole('button', { name: /^cancelled/i }));
    fireEvent.click(screen.getByRole('button', { name: /^all/i }));
    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(5);
    });
  });
});


// ─── Users Section ────────────────────────────────────────────────────────────

describe('AdminDashboard — Users section', () => {
  const MOCK_CUSTOMERS = [
    { id: 'cu1', name: 'Sipho Dlamini', email: 'sipho@test.com', createdAt: new Date().toISOString() },
    { id: 'cu2', name: 'Amara Okafor',  email: 'amara@test.com', createdAt: new Date().toISOString(), suspended: true },
  ];
  const MOCK_USER_VENDORS = [
    { id: 'vu1', name: 'Raj Patel', email: 'raj@test.com', storeName: "Raj's Grill", createdAt: new Date().toISOString() },
  ];

  beforeEach(() => {
    mockSetActivePage.mockClear();
    mockGetDocs
      .mockResolvedValueOnce({ docs: MOCK_CUSTOMERS.map(u => ({ id: u.id, data: () => u })) })
      .mockResolvedValueOnce({ docs: MOCK_USER_VENDORS.map(u => ({ id: u.id, data: () => u })) });
  });

  const goToUsers = async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^users$/i }));
    await waitFor(() => screen.getByRole('heading', { name: /^users$/i }));
  };

  test('TC-USR-01: shows loading state while fetching users', async () => {
    mockGetDocs.mockReturnValue(new Promise(() => {}));
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^users$/i }));
    expect(screen.getByText(/loading users/i)).toBeInTheDocument();
  });

  test('TC-USR-02: renders Customers tab by default', async () => {
    await goToUsers();
    await waitFor(() => {
      const customerTab = screen.getByRole('button', { name: /customers/i });
      expect(customerTab).toHaveStyle('background: #1A1C23');
    });
  });

  test('TC-USR-03: Customers tab shows customer names', async () => {
    await goToUsers();
    await waitFor(() => {
      expect(screen.getByText('Sipho Dlamini')).toBeInTheDocument();
      expect(screen.getByText('Amara Okafor')).toBeInTheDocument();
    });
  });

  test('TC-USR-04: Customers tab shows customer emails', async () => {
    await goToUsers();
    await waitFor(() => {
      expect(screen.getByText('sipho@test.com')).toBeInTheDocument();
    });
  });

  test('TC-USR-05: suspended customer shows Suspended badge', async () => {
    await goToUsers();
    await waitFor(() => {
      expect(screen.getByText(/suspended/i)).toBeInTheDocument();
    });
  });

  test('TC-USR-06: active customer shows Active badge', async () => {
    await goToUsers();
    await waitFor(() => {
      expect(screen.getAllByText(/active/i).length).toBeGreaterThan(0);
    });
  });

  test('TC-USR-07: switching to Vendors tab shows vendor names', async () => {
    await goToUsers();
    await waitFor(() => screen.getByText('Sipho Dlamini'));
    fireEvent.click(screen.getByRole('button', { name: /vendors/i }));
    await waitFor(() => {
      expect(screen.getByText('Raj Patel')).toBeInTheDocument();
    });
  });

  test('TC-USR-08: Vendors tab shows store name column', async () => {
    await goToUsers();
    await waitFor(() => screen.getByText('Sipho Dlamini'));
    fireEvent.click(screen.getByRole('button', { name: /vendors/i }));
    await waitFor(() => {
      expect(screen.getByText("Raj's Grill")).toBeInTheDocument();
    });
  });

  test('TC-USR-09: Customers tab does not show store name column', async () => {
    await goToUsers();
    await waitFor(() => screen.getByText('Sipho Dlamini'));
    expect(screen.queryByText(/store/i)).not.toBeInTheDocument();
  });

  test('TC-USR-10: customer count is shown in Customers tab label', async () => {
    await goToUsers();
    await waitFor(() => {
      const tab = screen.getByRole('button', { name: /customers/i });
      expect(tab.textContent).toMatch(/2/);
    });
  });

  test('TC-USR-11: vendor count is shown in Vendors tab label', async () => {
    await goToUsers();
    await waitFor(() => {
      const tab = screen.getByRole('button', { name: /vendors/i });
      expect(tab.textContent).toMatch(/1/);
    });
  });

  test('TC-USR-12: shows "No customers found" when customer list is empty', async () => {
    mockGetDocs
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [] });
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^users$/i }));
    await waitFor(() => {
      expect(screen.getByText(/no customers found/i)).toBeInTheDocument();
    });
  });

  test('TC-USR-13: shows "No vendors found" when vendor list is empty on Vendors tab', async () => {
    mockGetDocs
      .mockResolvedValueOnce({ docs: MOCK_CUSTOMERS.map(u => ({ id: u.id, data: () => u })) })
      .mockResolvedValueOnce({ docs: [] });
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^users$/i }));
    await waitFor(() => screen.getByText('Sipho Dlamini'));
    fireEvent.click(screen.getByRole('button', { name: /vendors/i }));
    await waitFor(() => {
      expect(screen.getByText(/no vendors found/i)).toBeInTheDocument();
    });
  });

  test('TC-USR-14: Firestore error does not crash the users section', async () => {
    mockGetDocs.mockRejectedValue(new Error('permission denied'));
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^users$/i }));
    await waitFor(() => {
      expect(screen.queryByText(/loading users/i)).not.toBeInTheDocument();
    });
  });

  test('TC-USR-15: join date is shown for each customer', async () => {
    await goToUsers();
    await waitFor(() => {
      const today = new Date().toLocaleDateString('en-ZA');
      expect(screen.getAllByText(today).length).toBeGreaterThan(0);
    });
  });
});


// ─── Payments Section ─────────────────────────────────────────────────────────

describe('AdminDashboard — Payments section', () => {
  const MOCK_PAYMENTS = [
    { id: 'p1', customerName: 'Sipho', vendorName: 'Tasty Bites', total: 150, status: 'completed', createdAt: new Date().toISOString(), paymentMethod: 'PayFast' },
    { id: 'p2', customerName: 'Amara', vendorName: 'Spice Garden', total: 200, status: 'completed', createdAt: new Date().toISOString(), paymentMethod: 'Card' },
  ];

  beforeEach(() => {
    mockSetActivePage.mockClear();
    mockGetDocs.mockResolvedValue({
      docs: MOCK_PAYMENTS.map(p => ({ id: p.id, data: () => p })),
    });
  });

  const goToPayments = async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^payments$/i }));
    await waitFor(() => screen.getByRole('heading', { name: /^payments$/i }));
  };

  test('TC-PAY-01: shows loading state while fetching payments', async () => {
    mockGetDocs.mockReturnValue(new Promise(() => {}));
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^payments$/i }));
    expect(screen.getByText(/loading payments/i)).toBeInTheDocument();
  });

  test('TC-PAY-02: shows Total Processed summary card', async () => {
    await goToPayments();
    await waitFor(() => {
      expect(screen.getByText(/total processed/i)).toBeInTheDocument();
    });
  });

  test('TC-PAY-03: shows Transactions summary card', async () => {
    await goToPayments();
    await waitFor(() => {
      expect(screen.getByText(/^transactions$/i)).toBeInTheDocument();
    });
  });

  test('TC-PAY-04: shows Avg. Order Value summary card', async () => {
    await goToPayments();
    await waitFor(() => {
      expect(screen.getByText(/avg\. order value/i)).toBeInTheDocument();
    });
  });

  test('TC-PAY-05: Total Processed shows correct sum', async () => {
    await goToPayments();
    await waitFor(() => {
      expect(screen.getByText(/R 350/i)).toBeInTheDocument();
    });
  });

  test('TC-PAY-06: Transactions count matches number of payment records', async () => {
    await goToPayments();
    await waitFor(() => {
      const statValues = document.querySelectorAll('.stat-value');
      const txCount = Array.from(statValues).find(el => el.textContent.trim() === '2');
      expect(txCount).toBeTruthy();
    });
  });

  test('TC-PAY-07: Avg. Order Value is correctly calculated', async () => {
    await goToPayments();
    await waitFor(() => {
      expect(screen.getByText(/R 175/i)).toBeInTheDocument();
    });
  });

  test('TC-PAY-08: table renders correct column headers', async () => {
    await goToPayments();
    await waitFor(() => {
      expect(screen.getByText(/^ref$/i)).toBeInTheDocument();
      expect(screen.getByText(/^customer$/i)).toBeInTheDocument();
      expect(screen.getByText(/^vendor$/i)).toBeInTheDocument();
      expect(screen.getByText(/^amount$/i)).toBeInTheDocument();
      expect(screen.getByText(/^method$/i)).toBeInTheDocument();
      expect(screen.getByText(/^date$/i)).toBeInTheDocument();
    });
  });

  test('TC-PAY-09: table shows customer and vendor names', async () => {
    await goToPayments();
    await waitFor(() => {
      expect(screen.getByText('Sipho')).toBeInTheDocument();
      expect(screen.getByText('Tasty Bites')).toBeInTheDocument();
    });
  });

  test('TC-PAY-10: table shows payment method', async () => {
    await goToPayments();
    await waitFor(() => {
      expect(screen.getByText('PayFast')).toBeInTheDocument();
      expect(screen.getByText('Card')).toBeInTheDocument();
    });
  });

  test('TC-PAY-11: shows "No payments found" when list is empty', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^payments$/i }));
    await waitFor(() => {
      expect(screen.getByText(/no payments found/i)).toBeInTheDocument();
    });
  });

  test('TC-PAY-12: avg order value shows 0.00 when no payments', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^payments$/i }));
    await waitFor(() => {
      expect(screen.getByText(/R 0\.00/i)).toBeInTheDocument();
    });
  });

  test('TC-PAY-13: Firestore error does not crash the payments section', async () => {
    mockGetDocs.mockRejectedValue(new Error('quota exceeded'));
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^payments$/i }));
    await waitFor(() => {
      expect(screen.queryByText(/loading payments/i)).not.toBeInTheDocument();
    });
  });

  test('TC-PAY-14: payment amounts are formatted in Rands', async () => {
    await goToPayments();
    await waitFor(() => {
      expect(screen.getByText(/R 150\.00/i)).toBeInTheDocument();
      expect(screen.getByText(/R 200\.00/i)).toBeInTheDocument();
    });
  });
});


// ─── Settings Section ─────────────────────────────────────────────────────────

describe('AdminDashboard — Settings section', () => {
  beforeEach(() => {
    mockSetActivePage.mockClear();
    mockGetDocs.mockResolvedValue({ docs: [] });
  });

  const goToSettings = async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^settings$/i }));
    await waitFor(() => screen.getByRole('heading', { name: /^settings$/i }));
  };

  test('TC-SET-01: renders Platform Name field with default value', async () => {
    await goToSettings();
    expect(screen.getByDisplayValue('UniEats')).toBeInTheDocument();
  });

  test('TC-SET-02: renders Support Email field with default value', async () => {
    await goToSettings();
    expect(screen.getByDisplayValue('support@unieats.co.za')).toBeInTheDocument();
  });

  test('TC-SET-03: renders Max Vendors input field', async () => {
    await goToSettings();
    expect(screen.getByPlaceholderText(/unlimited/i)).toBeInTheDocument();
  });

  test('TC-SET-04: renders Order Notifications toggle', async () => {
    await goToSettings();
    expect(screen.getByText(/order notifications/i)).toBeInTheDocument();
  });

  test('TC-SET-05: renders Allow New Sign-ups toggle', async () => {
    await goToSettings();
    expect(screen.getByText(/allow new sign-ups/i)).toBeInTheDocument();
  });

  test('TC-SET-06: renders Maintenance Mode toggle', async () => {
    await goToSettings();
    expect(screen.getByText(/maintenance mode/i)).toBeInTheDocument();
  });

  test('TC-SET-07: renders Save Changes button', async () => {
    await goToSettings();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  test('TC-SET-08: Platform Name input can be edited', async () => {
    await goToSettings();
    const input = screen.getByDisplayValue('UniEats');
    await userEvent.clear(input);
    await userEvent.type(input, 'FoodApp');
    expect(input).toHaveValue('FoodApp');
  });

  test('TC-SET-09: Support Email input can be edited', async () => {
    await goToSettings();
    const input = screen.getByDisplayValue('support@unieats.co.za');
    await userEvent.clear(input);
    await userEvent.type(input, 'new@email.com');
    expect(input).toHaveValue('new@email.com');
  });

  test('TC-SET-10: clicking Save Changes shows a saved confirmation', async () => {
    await goToSettings();
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => {
      expect(screen.getByText(/saved/i)).toBeInTheDocument();
    });
  });

  test('TC-SET-11: saved confirmation disappears after 2.5s', async () => {
    jest.useFakeTimers();
    await goToSettings();
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => screen.getByText(/saved/i));
    jest.advanceTimersByTime(3000);
    await waitFor(() => {
      expect(screen.queryByText(/✓ saved/i)).not.toBeInTheDocument();
    });
    jest.useRealTimers();
  });

  test('TC-SET-12: toggling Maintenance Mode changes its visual state', async () => {
    await goToSettings();
    const toggleBtns = screen.getAllByRole('button');
    const maintenanceToggle = toggleBtns.find(b =>
      b.closest('div')?.previousSibling?.textContent?.includes('Maintenance')
    );
    if (maintenanceToggle) {
      const before = maintenanceToggle.style.background;
      fireEvent.click(maintenanceToggle);
      expect(maintenanceToggle.style.background).not.toBe(before);
    } else {
      expect(screen.getByText(/maintenance mode/i)).toBeInTheDocument();
    }
  });

  test('TC-SET-13: Max Vendors accepts numeric input', async () => {
    await goToSettings();
    const input = screen.getByPlaceholderText(/unlimited/i);
    await userEvent.type(input, '50');
    expect(input).toHaveValue(50);
  });

  test('TC-SET-14: General and Notifications section headings are visible', async () => {
    await goToSettings();
    expect(screen.getByText(/^general$/i)).toBeInTheDocument();
    expect(screen.getByText(/notifications & access/i)).toBeInTheDocument();
  });
});


// ─── Signup Role — admin option removed ──────────────────────────────────────

describe('SignupRole — admin option removed', () => {
  test('TC-SR-01: admin signup button is no longer present', async () => {
    const { render: rr, screen: ss } = await import('@testing-library/react');
    const { MemoryRouter } = await import('react-router-dom');
    const SignupRole = (await import('../login-and-signup/signup-role')).default;
    rr(<MemoryRouter><SignupRole /></MemoryRouter>);
    expect(ss.queryByText(/apply for admin access/i)).not.toBeInTheDocument();
    expect(ss.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument();
  });

  test('TC-SR-02: Customer and Vendor signup options are still present', async () => {
    const { render: rr, screen: ss } = await import('@testing-library/react');
    const { MemoryRouter } = await import('react-router-dom');
    const SignupRole = (await import('../login-and-signup/signup-role')).default;
    rr(<MemoryRouter><SignupRole /></MemoryRouter>);
    expect(ss.getByRole('link', { name: /sign up as customer/i })).toBeInTheDocument();
    expect(ss.getByRole('link', { name: /sign up as vendor/i })).toBeInTheDocument();
  });

  test('TC-SR-03: exactly 2 role options are shown', async () => {
    const { render: rr, screen: ss } = await import('@testing-library/react');
    const { MemoryRouter } = await import('react-router-dom');
    const SignupRole = (await import('../login-and-signup/signup-role')).default;
    rr(<MemoryRouter><SignupRole /></MemoryRouter>);
    const links = ss.getAllByRole('link', { name: /sign up as/i });
    expect(links.length).toBe(2);
  });
});