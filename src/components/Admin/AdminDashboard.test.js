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
    expect(screen.getByText(/total orders/i)).toBeInTheDocument();
    expect(screen.getByText(/revenue/i)).toBeInTheDocument();
    expect(screen.getByText(/new users/i)).toBeInTheDocument();
  });

  test('TC-AD-07: recent orders table has correct columns', async () => {
    renderAdminDashboard();
    expect(screen.getByText(/order id/i)).toBeInTheDocument();
    expect(screen.getByText(/customer/i)).toBeInTheDocument();
    expect(screen.getByText(/status/i)).toBeInTheDocument();
  });

  test('TC-AD-08: recent orders table renders static rows', async () => {
    renderAdminDashboard();
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Mike')).toBeInTheDocument();
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
      // should not show "Loading analytics..." anymore after error
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
    // completionRate = round(2/4*100) = 50
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
    // First filter by pending, then reset to all
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
    // Bob is pending, so Approve button should be visible
    const approveBtn = screen.getByRole('button', { name: /approve bob@test\.com/i });
    fireEvent.click(approveBtn);
    await waitFor(() => expect(approveAdmin).toHaveBeenCalledWith('a2'));
  });

  test('TC-VM-18: admin suspend calls suspendAdmin', async () => {
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => screen.getByText('Tasty Bites'));
    fireEvent.click(screen.getByRole('button', { name: /admin requests/i }));
    await waitFor(() => screen.getByText(/alice/i));
    // Alice is approved, suspend is available
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
    // Filter to pending
    fireEvent.click(screen.getByRole('button', { name: /^pending/i }));
    // Switch to admins
    fireEvent.click(screen.getByRole('button', { name: /admin requests/i }));
    // Switch back — filter should reset to All
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


describe('AdminDashboard — navigation', () => {
  beforeEach(() => {
    mockSetActivePage.mockClear();
    mockGetDocs.mockResolvedValue({ docs: [] });
  });

  test('TC-NAV-01: clicking "Vendors" nav item calls setActivePage', async () => {
    renderAdminDashboard();
    fireEvent.click(await screen.findByRole('button', { name: /vendors/i }));
    expect(mockSetActivePage).toHaveBeenCalledWith('admin-vendor-management');
  });

  test('TC-NAV-02: clicking "Analytics" shows analytics heading', async () => {
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
    expect(screen.getByText(/recent orders/i)).toBeInTheDocument();
  });
});