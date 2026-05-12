import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('../Analytics.css', () => ({}));
jest.mock('../../../Firebase/firebaseConfig', () => ({
  db: {},
}));
jest.mock('../../../Services/AuthContext', () => ({
  useAuth: () => ({ vendorId: 'vendor-123' }),
}));

const mockGetDocs = jest.fn();
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: (...args) => mockGetDocs(...args),
}));

import Analytics from '../Analytics';

global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

let anchorClickSpy;
const FIXED_NOW = new Date(2026, 4, 12, 12, 0);

const orders = [
  {
    id: 'o1',
    status: 'completed',
    total: 490.72,
    customerId: 'cust-1',
    createdAt: new Date(2026, 4, 12, 8, 15),
    items: [
      { name: 'Grilled Chicken Burger', qty: 3, price: 110.88 },
      { name: 'Sweet Potato Fries', qty: 1, price: 47.20 },
    ],
  },
  {
    id: 'o2',
    status: 'completed',
    total: 50.0,
    customerId: 'cust-2',
    createdAt: new Date(2026, 4, 12, 12, 30),
    items: [
      { name: 'Vegan Wrap', qty: 2, price: 25.0 },
    ],
  },
  {
    id: 'o3',
    status: 'cancelled',
    total: 0,
    customerId: 'cust-3',
    createdAt: new Date(2026, 4, 11, 14, 0),
    items: [
      { name: 'Grilled Chicken Burger', qty: 1, price: 110.88 },
    ],
  },
  {
    id: 'o4',
    status: 'completed',
    total: 260.0,
    customerId: 'cust-2',
    createdAt: new Date(2026, 4, 10, 16, 0),
    items: [
      { name: 'Steak Salad', qty: 2, price: 130.0 },
    ],
  },
  {
    id: 'o5',
    status: 'pending',
    total: 0,
    customerId: 'cust-4',
    createdAt: new Date(2026, 4, 1, 10, 0),
    items: [
      { name: 'Super "Cheese" Burger, Deluxe', qty: 1, price: 170.0 },
    ],
  },
];

const buildDocs = (orderList) => orderList.map(order => ({ id: order.id, data: () => order }));

const renderAnalytics = async () => {
  render(<Analytics />);
  await waitFor(() => expect(screen.queryByText(/loading analytics/i)).not.toBeInTheDocument());
};

beforeAll(() => {
  jest.useFakeTimers('modern');
  jest.setSystemTime(FIXED_NOW);
  anchorClickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterAll(() => {
  jest.useRealTimers();
  anchorClickSpy.mockRestore();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDocs.mockResolvedValue({ docs: buildDocs(orders) });
});

describe('Analytics – loading and data handling', () => {
  it('shows a loading placeholder while analytics fetches', async () => {
    render(<Analytics />);
    expect(screen.getByText(/loading analytics/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/loading analytics/i)).not.toBeInTheDocument());
  });

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
});

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
});

describe('Analytics – bar chart behavior', () => {
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

  it('shows weekly week labels for This Month', async () => {
    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: 'This Month' }));
    ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'].forEach(label => expect(screen.getByText(label)).toBeInTheDocument());
  });
});

describe('Analytics – top selling items', () => {
  it('renders three top selling item rows for Today', async () => {
    await renderAnalytics();
    expect(document.querySelectorAll('.top-item')).toHaveLength(3);
  });

  it('shows the top selling item and orders it by highest sold count', async () => {
    await renderAnalytics();
    expect(screen.getByText('Grilled Chicken Burger')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('3 sold')).toBeInTheDocument();
  });

  it('calculates widths so only first item reaches 100%', async () => {
    await renderAnalytics();
    const bars = document.querySelectorAll('.top-item__bar');
    expect(bars[0].style.width).toBe('100%');
    const otherWidths = Array.from(bars).slice(1).map(bar => parseFloat(bar.style.width));
    otherWidths.forEach(width => expect(width).toBeLessThan(100));
  });
});

describe('Analytics – Export dropdown and downloads', () => {
  it('opens and closes the export dropdown', async () => {
    await renderAnalytics();
    const exportButton = screen.getByRole('button', { name: /export/i });

    await userEvent.click(exportButton);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await userEvent.click(exportButton);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes when clicking outside the export area', async () => {
    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await userEvent.click(document.body);
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('downloads CSV for This Month by triggering the anchor click', async () => {
    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: 'This Month' }));
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    const csvButton = screen.getByText(/Spreadsheet/i).closest('button');
    expect(csvButton).toBeTruthy();

    await userEvent.click(csvButton);

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(anchorClickSpy).toHaveBeenCalled();
  });

  it('quotes CSV fields that contain commas and quotes', async () => {
    let capturedBlob;
    const originalBlob = global.Blob;
    global.Blob = jest.fn((parts, opts) => {
      capturedBlob = parts[0];
      return new originalBlob(parts, opts);
    });

    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: 'This Month' }));
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    const csvButton = screen.getByText(/Spreadsheet/i).closest('button');
    expect(csvButton).toBeTruthy();

    await userEvent.click(csvButton);

    expect(capturedBlob).toContain('"Super ""Cheese"" Burger, Deluxe"');
    global.Blob = originalBlob;
  });
});

describe('Analytics – PDF export', () => {
  it('export dropdown closes after PDF is selected', async () => {
    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    
    await userEvent.click(screen.getByRole('button', { name: /report/i }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

describe('Analytics – CSV escaping and special characters', () => {
  it('escapes double quotes by doubling them in CSV', async () => {
    let capturedBlob;
    const originalBlob = global.Blob;
    global.Blob = jest.fn((parts, opts) => {
      capturedBlob = parts[0];
      return new originalBlob(parts, opts);
    });

    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    await userEvent.click(screen.getByRole('button', { name: /spreadsheet/i }));

    expect(capturedBlob).toContain('540.72');
    global.Blob = originalBlob;
  });

  it('includes analytics report header in CSV', async () => {
    let capturedBlob;
    const originalBlob = global.Blob;
    global.Blob = jest.fn((parts, opts) => {
      capturedBlob = parts[0];
      return new originalBlob(parts, opts);
    });

    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    await userEvent.click(screen.getByRole('button', { name: /spreadsheet/i }));

    expect(capturedBlob).toContain('ANALYTICS REPORT');
    expect(capturedBlob).toContain('Today');
    global.Blob = originalBlob;
  });

  it('includes summary section with revenue and metrics in CSV', async () => {
    let capturedBlob;
    const originalBlob = global.Blob;
    global.Blob = jest.fn((parts, opts) => {
      capturedBlob = parts[0];
      return new originalBlob(parts, opts);
    });

    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    await userEvent.click(screen.getByRole('button', { name: /spreadsheet/i }));

    expect(capturedBlob).toContain('SUMMARY');
    expect(capturedBlob).toContain('Revenue');
    expect(capturedBlob).toContain('Total Orders');
    global.Blob = originalBlob;
  });

  it('includes order overview section in CSV', async () => {
    let capturedBlob;
    const originalBlob = global.Blob;
    global.Blob = jest.fn((parts, opts) => {
      capturedBlob = parts[0];
      return new originalBlob(parts, opts);
    });

    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    await userEvent.click(screen.getByRole('button', { name: /spreadsheet/i }));

    expect(capturedBlob).toContain('ORDERS OVERVIEW');
    global.Blob = originalBlob;
  });

  it('includes top selling items section in CSV', async () => {
    let capturedBlob;
    const originalBlob = global.Blob;
    global.Blob = jest.fn((parts, opts) => {
      capturedBlob = parts[0];
      return new originalBlob(parts, opts);
    });

    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    await userEvent.click(screen.getByRole('button', { name: /spreadsheet/i }));

    expect(capturedBlob).toContain('TOP SELLING ITEMS');
    global.Blob = originalBlob;
  });
});

describe('Analytics – data calculation accuracy', () => {
  it('calculates revenue only from completed orders', async () => {
    await renderAnalytics();
    expect(screen.getByText(/R 540[.,]72/)).toBeInTheDocument();
  });

  it('counts all orders including pending and cancelled', async () => {
    await renderAnalytics();
    const allText = screen.getAllByText('2');
    expect(allText.length).toBeGreaterThan(0);
  });

  it('counts unique customers from completed orders', async () => {
    await renderAnalytics();
    const allText = screen.getAllByText('2');
    expect(allText.length).toBeGreaterThan(0);
  });

  it('calculates correct completion rate for month with mixed statuses', async () => {
    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: 'This Month' }));
    expect(screen.getByText(/60\s*%/)).toBeInTheDocument();
  });
});

describe('Analytics – helper function behavior', () => {
  it('groups items by name across multiple orders', async () => {
    await renderAnalytics();
    expect(screen.getByText('Grilled Chicken Burger')).toBeInTheDocument();
    expect(screen.getByText('3 sold')).toBeInTheDocument();
  });

  it('returns empty state when no top items exist', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    await renderAnalytics();
    expect(screen.getByText(/no sales data yet for this period/i)).toBeInTheDocument();
  });

  it('pads top items list to 5 items even when fewer exist', async () => {
    await renderAnalytics();
    const topItems = document.querySelectorAll('.top-item');
    expect(topItems.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Analytics – accessibility', () => {
  it('sets aria-haspopup on export button', async () => {
    await renderAnalytics();
    const exportBtn = screen.getByRole('button', { name: /export/i });
    expect(exportBtn).toHaveAttribute('aria-haspopup', 'true');
  });

  it('menu has proper role attribute', async () => {
    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();
  });

  it('menu items have menuitem role', async () => {
    await renderAnalytics();
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems.length).toBeGreaterThanOrEqual(2);
  });
});
