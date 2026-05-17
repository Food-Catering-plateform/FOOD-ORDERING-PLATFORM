import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Dashboard from './Dashboard';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../css/dashboard.css', () => {});

jest.mock('../../../Firebase/firebaseConfig', () => ({ db: {} }));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs:    jest.fn(),
}));

import { getDocs, collection } from 'firebase/firestore';

// ─── Fixture Helpers ──────────────────────────────────────────────────────────

const TODAY = new Date().toLocaleDateString('en-ZA', { weekday: 'long' });

const alwaysOpen = () => ({
  [TODAY]: { closed: false, open: '00:00', close: '23:59' },
});

const alwaysClosed = () => ({
  [TODAY]: { closed: true, open: '00:00', close: '00:00' },
});

const makeVendor = (overrides = {}) => ({
  id:           'v1',
  businessName: 'Test Shop',
  status:       'approved',
  category:     'Fast Food',
  description:  'A test shop',
  address:      '1 Test Street',
  imageUrl:     '',
  logoUrl:      '',
  hours:        alwaysClosed(),
  ...overrides,
});

const mockVendors = (vendors = []) => {
  getDocs.mockResolvedValue({
    docs: vendors.map(v => ({ id: v.id, data: () => ({ ...v }) })),
  });
};

// ─── Render Helper ────────────────────────────────────────────────────────────

const defaultProps = {
  setActivePage:   jest.fn(),
  setSelectedShop: jest.fn(),
  search:          '',
};

const renderDashboard = (props = {}) =>
  render(<Dashboard {...defaultProps} {...props} />);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Dashboard.js', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    collection.mockReturnValue('vendors-ref');
  });

  // ── Loading State ────────────────────────────────────────────────────────────

  describe('Loading State', () => {
    it('renders 6 skeleton cards while data is loading', () => {
      getDocs.mockReturnValue(new Promise(() => {})); // never resolves
      renderDashboard();
      expect(document.querySelectorAll('.db-skeleton')).toHaveLength(6);
    });

    it('removes skeleton cards after data loads', async () => {
      mockVendors([]);
      renderDashboard();
      await waitFor(() =>
        expect(document.querySelectorAll('.db-skeleton')).toHaveLength(0)
      );
    });
  });

  // ── Firestore Integration ────────────────────────────────────────────────────

  describe('Firestore Integration', () => {
    it('calls getDocs on mount', async () => {
      mockVendors([]);
      renderDashboard();
      await waitFor(() => expect(getDocs).toHaveBeenCalledTimes(1));
    });

    it('calls collection with db and "Vendors"', async () => {
      mockVendors([]);
      renderDashboard();
      await waitFor(() =>
        expect(collection).toHaveBeenCalledWith({}, 'Vendors')
      );
    });

    it('filters out vendors whose status is not "approved"', async () => {
      mockVendors([
        makeVendor({ id: 'v1', businessName: 'Approved Shop', status: 'approved' }),
        makeVendor({ id: 'v2', businessName: 'Pending Shop',  status: 'pending'  }),
      ]);
      renderDashboard();
      await waitFor(() =>
        expect(screen.getByText('Approved Shop')).toBeInTheDocument()
      );
      expect(screen.queryByText('Pending Shop')).not.toBeInTheDocument();
    });

    it('filters out vendors without a businessName', async () => {
      mockVendors([
        makeVendor({ id: 'v1', businessName: 'Good Shop' }),
        makeVendor({ id: 'v2', businessName: ''          }),
      ]);
      renderDashboard();
      await waitFor(() =>
        expect(screen.getByText('Good Shop')).toBeInTheDocument()
      );
      expect(document.querySelectorAll('.db-card')).toHaveLength(1);
    });
  });

  // ── Empty State ───────────────────────────────────────────────────────────────

  describe('Empty State', () => {
    it('shows "No shops found" when no vendors match', async () => {
      mockVendors([]);
      renderDashboard();
      await waitFor(() =>
        expect(screen.getByText('No shops found')).toBeInTheDocument()
      );
    });

    it('shows the hint text in the empty state', async () => {
      mockVendors([]);
      renderDashboard();
      await waitFor(() =>
        expect(
          screen.getByText(/try a different search or category/i)
        ).toBeInTheDocument()
      );
    });

    it('shows the 🍽️ icon in the empty state', async () => {
      mockVendors([]);
      renderDashboard();
      await waitFor(() =>
        expect(screen.getByText('🍽️')).toBeInTheDocument()
      );
    });
  });

  // ── Stats Bar ─────────────────────────────────────────────────────────────────

  describe('Stats Bar', () => {
    it('shows singular "shop" when only 1 vendor matches', async () => {
      mockVendors([makeVendor({ id: 'v1' })]);
      renderDashboard();
      await waitFor(() =>
        expect(screen.getByText(/shop available/i)).toBeInTheDocument()
      );
    });

    it('shows plural "shops" when multiple vendors match', async () => {
      mockVendors([
        makeVendor({ id: 'v1', businessName: 'Shop A' }),
        makeVendor({ id: 'v2', businessName: 'Shop B' }),
      ]);
      renderDashboard();
      await waitFor(() =>
        expect(screen.getByText(/shops available/i)).toBeInTheDocument()
      );
    });

    it('counts open vendors correctly in the stats bar', async () => {
      mockVendors([
        makeVendor({ id: 'v1', businessName: 'Open Shop',   hours: alwaysOpen()   }),
        makeVendor({ id: 'v2', businessName: 'Closed Shop', hours: alwaysClosed() }),
      ]);
      renderDashboard();
      await waitFor(() =>
        expect(screen.getByText(/open now/i)).toBeInTheDocument()
      );
      const statsBar = document.querySelector('.db-stats');
      expect(statsBar).toHaveTextContent('1');
    });
  });

  // ── Vendor Cards ──────────────────────────────────────────────────────────────

  describe('Vendor Cards', () => {
    it('renders a card for each approved vendor', async () => {
      mockVendors([
        makeVendor({ id: 'v1', businessName: 'Shop A' }),
        makeVendor({ id: 'v2', businessName: 'Shop B' }),
        makeVendor({ id: 'v3', businessName: 'Shop C' }),
      ]);
      renderDashboard();
      await waitFor(() =>
        expect(document.querySelectorAll('.db-card')).toHaveLength(3)
      );
    });

    it('displays the vendor businessName', async () => {
      mockVendors([makeVendor({ businessName: 'Mama Afrika Kitchen' })]);
      renderDashboard();
      await waitFor(() =>
        expect(screen.getByText('Mama Afrika Kitchen')).toBeInTheDocument()
      );
    });

    it('displays the vendor description when present', async () => {
      mockVendors([makeVendor({ description: 'Best bunny chow in town' })]);
      renderDashboard();
      await waitFor(() =>
        expect(screen.getByText('Best bunny chow in town')).toBeInTheDocument()
      );
    });

    it('displays the vendor address with pin emoji when present', async () => {
      mockVendors([makeVendor({ address: '42 Main Road' })]);
      renderDashboard();
      await waitFor(() =>
        expect(screen.getByText(/📍.*42 Main Road/)).toBeInTheDocument()
      );
    });

    it('shows "● Open" badge for an open vendor', async () => {
      mockVendors([makeVendor({ hours: alwaysOpen() })]);
      renderDashboard();
      await waitFor(() =>
        expect(screen.getByText(/● Open/)).toBeInTheDocument()
      );
    });

    it('shows "○ Closed" badge for a closed vendor', async () => {
      mockVendors([makeVendor({ hours: alwaysClosed() })]);
      renderDashboard();
      await waitFor(() =>
        expect(screen.getByText(/○ Closed/)).toBeInTheDocument()
      );
    });

    it('renders an <img> when vendor has imageUrl', async () => {
      mockVendors([makeVendor({ imageUrl: 'https://example.com/img.jpg' })]);
      renderDashboard();
      await waitFor(() => {
        const img = screen.getByRole('img', { name: /test shop/i });
        expect(img).toHaveAttribute('src', 'https://example.com/img.jpg');
      });
    });

    it('falls back to logoUrl when imageUrl is absent', async () => {
      mockVendors([makeVendor({ imageUrl: '', logoUrl: 'https://example.com/logo.png' })]);
      renderDashboard();
      await waitFor(() => {
        const img = screen.getByRole('img', { name: /test shop/i });
        expect(img).toHaveAttribute('src', 'https://example.com/logo.png');
      });
    });

    it('renders the category emoji when no imageUrl or logoUrl', async () => {
      mockVendors([makeVendor({ imageUrl: '', logoUrl: '', category: 'Fast Food' })]);
      renderDashboard();
      await waitFor(() =>
        expect(screen.getByText('🍔')).toBeInTheDocument()
      );
    });

    it('renders the category tag on the card', async () => {
      mockVendors([makeVendor({ category: 'Halal' })]);
      renderDashboard();
      await waitFor(() =>
        expect(screen.getByText('Halal')).toBeInTheDocument()
      );
    });

    it('renders "View Menu →" on every card', async () => {
      mockVendors([
        makeVendor({ id: 'v1', businessName: 'Shop A' }),
        makeVendor({ id: 'v2', businessName: 'Shop B' }),
      ]);
      renderDashboard();
      await waitFor(() =>
        expect(screen.getAllByText('View Menu →')).toHaveLength(2)
      );
    });

    it('does not render description element when absent', async () => {
      mockVendors([makeVendor({ description: undefined })]);
      renderDashboard();
      await waitFor(() =>
        expect(document.querySelector('.db-card__desc')).not.toBeInTheDocument()
      );
    });

    it('does not render address element when absent', async () => {
      mockVendors([makeVendor({ address: undefined })]);
      renderDashboard();
      await waitFor(() =>
        expect(document.querySelector('.db-card__address')).not.toBeInTheDocument()
      );
    });
  });

  // ── Card Click → Navigation ───────────────────────────────────────────────────

  describe('Card Click Navigation', () => {
    it('calls setSelectedShop with correct id and name when a card is clicked', async () => {
      mockVendors([makeVendor({ id: 'v1', businessName: 'Kota House' })]);
      renderDashboard();
      await waitFor(() => screen.getByText('Kota House'));
      fireEvent.click(screen.getByText('Kota House').closest('.db-card'));
      expect(defaultProps.setSelectedShop).toHaveBeenCalledWith({
        id: 'v1', name: 'Kota House',
      });
    });

    it('calls setActivePage with "menu-view" when a card is clicked', async () => {
      mockVendors([makeVendor({ id: 'v1', businessName: 'Kota House' })]);
      renderDashboard();
      await waitFor(() => screen.getByText('Kota House'));
      fireEvent.click(screen.getByText('Kota House').closest('.db-card'));
      expect(defaultProps.setActivePage).toHaveBeenCalledWith('menu-view');
    });

    it('calls both setSelectedShop and setActivePage on the same click', async () => {
      mockVendors([makeVendor({ id: 'v1', businessName: 'Kota House' })]);
      renderDashboard();
      await waitFor(() => screen.getByText('Kota House'));
      fireEvent.click(screen.getByText('Kota House').closest('.db-card'));
      expect(defaultProps.setSelectedShop).toHaveBeenCalledTimes(1);
      expect(defaultProps.setActivePage).toHaveBeenCalledTimes(1);
    });
  });

  // ── Category Filter Pills ─────────────────────────────────────────────────────

  describe('Category Filter Pills', () => {
    const ALL_FILTERS = [
      'All', 'Traditional', 'Halal', 'Fast Food',
      'Desserts & Drinks', 'Grills & Braai', 'Other',
    ];

    it('renders all 7 filter pills', async () => {
      mockVendors([]);
      renderDashboard();
      await waitFor(() =>
        ALL_FILTERS.forEach(f =>
          expect(screen.getByRole('button', { name: new RegExp(f, 'i') })).toBeInTheDocument()
        )
      );
    });

    it('"All" pill is active by default', async () => {
      mockVendors([]);
      renderDashboard();
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /^all$/i })).toHaveClass('db-pill--active')
      );
    });

    it('sets the clicked pill as active and deactivates "All"', async () => {
      mockVendors([]);
      renderDashboard();
      await waitFor(() => screen.getByRole('button', { name: /halal/i }));
      fireEvent.click(screen.getByRole('button', { name: /halal/i }));
      expect(screen.getByRole('button', { name: /halal/i })).toHaveClass('db-pill--active');
      expect(screen.getByRole('button', { name: /^all$/i })).not.toHaveClass('db-pill--active');
    });

    it('filters vendors by the selected category', async () => {
      mockVendors([
        makeVendor({ id: 'v1', businessName: 'Halal Hub',   category: 'Halal'     }),
        makeVendor({ id: 'v2', businessName: 'Burger Barn', category: 'Fast Food' }),
      ]);
      renderDashboard();
      await waitFor(() => screen.getByText('Halal Hub'));
      fireEvent.click(screen.getByRole('button', { name: /halal/i }));
      expect(screen.getByText('Halal Hub')).toBeInTheDocument();
      expect(screen.queryByText('Burger Barn')).not.toBeInTheDocument();
    });

    it('shows all vendors again when "All" is re-selected', async () => {
      mockVendors([
        makeVendor({ id: 'v1', businessName: 'Halal Hub',   category: 'Halal'     }),
        makeVendor({ id: 'v2', businessName: 'Burger Barn', category: 'Fast Food' }),
      ]);
      renderDashboard();
      await waitFor(() => screen.getByText('Halal Hub'));
      fireEvent.click(screen.getByRole('button', { name: /halal/i }));
      fireEvent.click(screen.getByRole('button', { name: /^all$/i }));
      expect(screen.getByText('Halal Hub')).toBeInTheDocument();
      expect(screen.getByText('Burger Barn')).toBeInTheDocument();
    });

    it('shows category icons on non-All pills', async () => {
      mockVendors([]);
      renderDashboard();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /🍔.*fast food/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /🍲.*traditional/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /☪️.*halal/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /🔥.*grills/i })).toBeInTheDocument();
      });
    });

    it('shows empty state when a category filter yields no results', async () => {
      mockVendors([makeVendor({ category: 'Halal' })]);
      renderDashboard();
      await waitFor(() => screen.getByText('Test Shop'));
      fireEvent.click(screen.getByRole('button', { name: /traditional/i }));
      expect(screen.getByText('No shops found')).toBeInTheDocument();
    });
  });

  // ── Search Prop ───────────────────────────────────────────────────────────────

  describe('Search Filtering', () => {
    it('filters vendors by businessName match', async () => {
      mockVendors([
        makeVendor({ id: 'v1', businessName: 'Peri Peri Palace' }),
        makeVendor({ id: 'v2', businessName: 'Sushi World'      }),
      ]);
      renderDashboard({ search: 'peri' });
      await waitFor(() =>
        expect(screen.getByText('Peri Peri Palace')).toBeInTheDocument()
      );
      expect(screen.queryByText('Sushi World')).not.toBeInTheDocument();
    });

    it('filters vendors by description match', async () => {
      mockVendors([
        makeVendor({ id: 'v1', businessName: 'Shop A', description: 'spicy chicken wings' }),
        makeVendor({ id: 'v2', businessName: 'Shop B', description: 'fresh sushi rolls'   }),
      ]);
      renderDashboard({ search: 'spicy' });
      await waitFor(() =>
        expect(screen.getByText('Shop A')).toBeInTheDocument()
      );
      expect(screen.queryByText('Shop B')).not.toBeInTheDocument();
    });

    it('search matching is case-insensitive', async () => {
      mockVendors([makeVendor({ businessName: 'Mama Afrika' })]);
      renderDashboard({ search: 'MAMA' });
      await waitFor(() =>
        expect(screen.getByText('Mama Afrika')).toBeInTheDocument()
      );
    });

    it('shows empty state when search yields no results', async () => {
      mockVendors([makeVendor({ businessName: 'Burger Barn' })]);
      renderDashboard({ search: 'pizza' });
      await waitFor(() =>
        expect(screen.getByText('No shops found')).toBeInTheDocument()
      );
    });

    it('search and category filter work together', async () => {
      mockVendors([
        makeVendor({ id: 'v1', businessName: 'Halal Peri', category: 'Halal',     description: 'peri peri' }),
        makeVendor({ id: 'v2', businessName: 'Fast Peri',  category: 'Fast Food', description: 'peri peri' }),
      ]);
      renderDashboard({ search: 'peri' });
      await waitFor(() => screen.getByText('Halal Peri'));
      fireEvent.click(screen.getByRole('button', { name: /halal/i }));
      expect(screen.getByText('Halal Peri')).toBeInTheDocument();
      expect(screen.queryByText('Fast Peri')).not.toBeInTheDocument();
    });

    it('empty search string shows all vendors', async () => {
      mockVendors([
        makeVendor({ id: 'v1', businessName: 'Shop A' }),
        makeVendor({ id: 'v2', businessName: 'Shop B' }),
      ]);
      renderDashboard({ search: '' });
      await waitFor(() => {
        expect(screen.getByText('Shop A')).toBeInTheDocument();
        expect(screen.getByText('Shop B')).toBeInTheDocument();
      });
    });
  });

  // ── isOpenNow Edge Cases ──────────────────────────────────────────────────────

  describe('isOpenNow Edge Cases', () => {
    it('treats a vendor with no hours as closed', async () => {
      mockVendors([makeVendor({ hours: undefined })]);
      renderDashboard();
      await waitFor(() =>
        expect(screen.getByText(/○ Closed/)).toBeInTheDocument()
      );
    });

    it('treats a vendor with closed:true for today as closed', async () => {
      mockVendors([makeVendor({ hours: alwaysClosed() })]);
      renderDashboard();
      await waitFor(() =>
        expect(screen.getByText(/○ Closed/)).toBeInTheDocument()
      );
    });

    it('does not crash when today\'s hours entry is missing', async () => {
      mockVendors([makeVendor({ hours: {} })]);
      renderDashboard();
      await waitFor(() =>
        expect(document.querySelector('.db-card__badge')).toBeInTheDocument()
      );
    });
  });

});