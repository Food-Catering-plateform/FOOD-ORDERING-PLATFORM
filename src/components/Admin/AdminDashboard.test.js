/** @jest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Module mocks ──────────────────────────────────────────────────────────────

jest.mock('../../Firebase/firebaseConfig', () => ({
  auth: {},
  db:   {},
}));

jest.mock('firebase/auth', () => ({
  signOut: jest.fn(() => Promise.resolve()),
}));

const mockGetDocs = jest.fn();
const mockDocs    = jest.fn();
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

jest.mock('jspdf', () => ({
  jsPDF: jest.fn(() => ({
    internal: {
      pageSize: { getWidth: () => 595, getHeight: () => 842 },
      getNumberOfPages: jest.fn(() => 1),
    },
    setFillColor: jest.fn(),
    setFontSize: jest.fn(),
    setFont: jest.fn(),
    setTextColor: jest.fn(),
    setDrawColor: jest.fn(),
    setLineWidth: jest.fn(),
    setPage: jest.fn(),
    text: jest.fn(),
    rect: jest.fn(),
    addPage: jest.fn(),
    roundedRect: jest.fn(),
    line: jest.fn(),
    save: jest.fn(),
  })),
}));

jest.mock('./styles.css', () => ({}));
jest.mock('./AdminVendorManagement.css', () => ({}));
jest.mock('../Vendor/MenuManagement.css', () => ({}));

import { signOut }                         from 'firebase/auth';
import { fetchAllVendors, approveVendor,
         suspendVendor, fetchAllAdmins }   from '../../Services/vendorService';
import AdminDashboard                      from './AdminDashboard';
import AdminVendorManagement               from './AdminVendorManagement';
import { buildBarChart, buildVendorSales,
         buildTopItems, getPeriodStart }   from './AdminDashboard';
import { jsPDF }                           from 'jspdf';

// Helpers to keep tests clean
const MOCK_VENDORS = [
  { id: 'v1', businessName: 'Tasty Bites',   email: 'tasty@test.com',  status: 'pending'   },
  { id: 'v2', businessName: 'Spice Garden',   email: 'spice@test.com',  status: 'approved'  },
  { id: 'v3', businessName: 'Quick Eats',     email: 'quick@test.com',  status: 'suspended' },
];

const MOCK_ADMINS = [
  { id: 'a1', name: 'Alice Admin', email: 'alice@test.com', status: 'approved' },
  { id: 'a2', name: 'Bob Admin',   email: 'bob@test.com',   status: 'pending'  },
];

const mockSetActivePage = jest.fn();
const renderAdminDashboard = () => render(<AdminDashboard setActivePage={mockSetActivePage} />);

beforeAll(() => {
  global.URL = global.URL || {};
  global.URL.createObjectURL = jest.fn(() => 'blob:url');
  global.URL.revokeObjectURL = jest.fn();
  global.Blob = class {
    constructor(parts, options = {}) {
      this.parts = parts;
      this.type = options.type || '';
    }
  };
});

const MOCK_ORDERS = [
  {
    id: 'o1', vendorName: 'Tasty Bites', total: 150, status: 'completed',
    createdAt: new Date().toISOString(),
    items: [{ name: 'Bunny Chow', qty: 2, price: 45 }],
  },
  {
    id: 'o2', vendorName: 'Spice Garden', total: 200, status: 'completed',
    createdAt: new Date().toISOString(),
    items: [
      { name: 'Curry Platter', qty: 1, price: 120 },
      { name: 'Roti',          qty: 2, price: 20  },
    ],
  },
  {
    id: 'o3', vendorName: 'Tasty Bites', total: 90, status: 'pending',
    createdAt: new Date().toISOString(),
    items: [{ name: 'Bunny Chow', qty: 1, price: 45 }],
  },
];

describe('AdminDashboard — rendering', () => {
  beforeEach(() => {
    mockSetActivePage.mockClear();
    signOut.mockClear();
    global.URL.createObjectURL.mockClear();
    jsPDF.mockClear();
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
    const logoutBtn = screen.getByRole('button', { name: /log.?out/i });
    fireEvent.click(logoutBtn);
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(mockSetActivePage).toHaveBeenCalledWith('login');
  });

  test('TC-AD-06: export menu opens and CSV download is triggered', async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /spreadsheet/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /spreadsheet/i }));
    await waitFor(() => expect(global.URL.createObjectURL).toHaveBeenCalled());
  });

  test('TC-AD-07: export menu opens and PDF download calls jsPDF save', async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /analytics/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /report/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /report/i }));
    await waitFor(() => expect(jsPDF).toHaveBeenCalled());
  });

  test('TC-AD-08: sidebar navigation buttons can be clicked without crashing', async () => {
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /orders/i }));
    fireEvent.click(screen.getByRole('button', { name: /users/i }));
    fireEvent.click(screen.getByRole('button', { name: /payments/i }));
    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Vendors$/i }));
    expect(mockSetActivePage).toHaveBeenCalledWith('admin-vendor-management');
  });

  test('TC-AD-09: logout failure does not redirect to login', async () => {
    signOut.mockRejectedValueOnce(new Error('Auth failed'));
    renderAdminDashboard();
    fireEvent.click(screen.getByRole('button', { name: /log.?out/i }));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(mockSetActivePage).not.toHaveBeenCalledWith('login');
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

  test('TC-AN-11: buildBarChart uses time when createdAt is absent', () => {
    const orders = [{ time: new Date().toISOString() }];
    const chart = buildBarChart(orders, 'Today');
    expect(chart).toHaveLength(14);
    expect(chart.some(slot => typeof slot.value === 'number')).toBe(true);
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
    const approveBtn = screen.getByRole('button', { name: /approve tasty@test\.com/i });
    fireEvent.click(approveBtn);
    await waitFor(() => expect(approveVendor).toHaveBeenCalledWith('v1'));
  });

  test('TC-VM-04: "Suspend" button calls suspendVendor with correct ID', async () => {
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => screen.getByText('Spice Garden'));
    const suspendBtn = screen.getByRole('button', { name: /suspend spice@test\.com/i });
    fireEvent.click(suspendBtn);
    await waitFor(() => expect(suspendVendor).toHaveBeenCalledWith('v2'));
  });

  test('TC-VM-05: vendor status updates optimistically after approval', async () => {
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => screen.getByText('Tasty Bites'));
    const approveBtn = screen.getByRole('button', { name: /approve tasty@test\.com/i });
    fireEvent.click(approveBtn);
    await waitFor(() => {
      const cards = screen.getAllByText(/approved/i);
      expect(cards.length).toBeGreaterThan(1);
    });
  });

  test('TC-VM-06: filter "pending" shows only pending vendors', async () => {
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => screen.getByText('Tasty Bites'));
    const pendingFilter = screen.getByRole('button', { name: /pending/i });
    fireEvent.click(pendingFilter);
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
    const adminTab = screen.getByRole('button', { name: /admin requests/i });
    fireEvent.click(adminTab);
    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
      expect(screen.getByText('Bob Admin')).toBeInTheDocument();
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
});


import { DIETARY_OPTIONS, ALLERGENS, ALLERGEN_ICONS } from '../Vendor/MenuManagement';

describe('Dietary & Allergen — standardised data source', () => {
  test('TC-DA-01: DIETARY_OPTIONS includes Halal', () => {
    const keys = DIETARY_OPTIONS.map(d => d.key);
    expect(keys).toContain('halal');
  });

  test('TC-DA-02: DIETARY_OPTIONS includes Vegan', () => {
    const keys = DIETARY_OPTIONS.map(d => d.key);
    expect(keys).toContain('vegan');
  });

  test('TC-DA-03: DIETARY_OPTIONS includes Nut-Free', () => {
    const keys = DIETARY_OPTIONS.map(d => d.key);
    expect(keys).toContain('nut-free');
  });

  test('TC-DA-04: DIETARY_OPTIONS includes Gluten-Free', () => {
    const keys = DIETARY_OPTIONS.map(d => d.key);
    expect(keys).toContain('gluten-free');
  });

  test('TC-DA-05: DIETARY_OPTIONS includes Vegetarian', () => {
    const keys = DIETARY_OPTIONS.map(d => d.key);
    expect(keys).toContain('vegetarian');
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

  test('TC-DA-09: DIETARY_OPTIONS keys are all lowercase (consistent storage)', () => {
    DIETARY_OPTIONS.forEach(d => {
      expect(d.key).toBe(d.key.toLowerCase());
    });
  });

  test('TC-DA-10: no duplicate keys in DIETARY_OPTIONS', () => {
    const keys = DIETARY_OPTIONS.map(d => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('TC-DA-11: no duplicate entries in ALLERGENS', () => {
    expect(new Set(ALLERGENS).size).toBe(ALLERGENS.length);
  });
});


describe('AdminDashboard — navigation', () => {
  beforeEach(() => {
    mockSetActivePage.mockClear();
    mockGetDocs.mockResolvedValue({ docs: [] });
  });

  test('TC-NAV-01: clicking "Vendor Management" nav item changes active page', async () => {
    renderAdminDashboard();
    const navItem = await screen.findByRole('button', { name: /vendors/i });
    fireEvent.click(navItem);
    expect(mockSetActivePage).toHaveBeenCalledWith('admin-vendor-management');
  });

  test('TC-NAV-02: clicking "Analytics" nav item shows analytics section', async () => {
    renderAdminDashboard();
    const analyticsLink = screen.getByRole('button', { name: /analytics/i });
    fireEvent.click(analyticsLink);
    await waitFor(() => expect(screen.getByRole('heading', { name: /analytics/i })).toBeInTheDocument());
  });
});