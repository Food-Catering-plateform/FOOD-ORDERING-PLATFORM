import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MenuView from './MenuView';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../css/MenuView.css', () => {});

jest.mock('../../../Firebase/firebaseConfig', () => ({ db: {} }));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs:    jest.fn(),
  doc:        jest.fn(),
  getDoc:     jest.fn(),
}));

import { getDocs, getDoc, collection, doc } from 'firebase/firestore';

// ─── Fixture Helpers ──────────────────────────────────────────────────────────

const TODAY = new Date().toLocaleDateString('en-ZA', { weekday: 'long' });

const alwaysOpen = () => ({
  [TODAY]: { closed: false, open: '00:00', close: '23:59' },
});

const alwaysClosed = () => ({
  [TODAY]: { closed: true, open: '08:00', close: '22:00' },
});

const makeMenuItem = (overrides = {}) => ({
  id:          'item-1',
  name:        'Bunny Chow',
  price:       '45.00',
  description: 'A classic Durban dish',
  imageUrl:    '',
  isSoldOut:   false,
  qty:         undefined,
  dietary:     [],
  allergens:   [],
  ...overrides,
});

/**
 * Sets up both Firestore mocks every test needs:
 *   vendorData  – merged into the vendor document (hours, bannerImageUrl, etc.)
 *   menuItems   – array returned by the menuItems subcollection query
 */
const mockFirestore = ({ vendorData = {}, menuItems = [] } = {}) => {
  // getDoc → vendor document
  doc.mockReturnValue('vendor-doc-ref');
  getDoc.mockResolvedValue({
    exists: () => true,
    data: () => ({
      hours:          alwaysClosed(),   // safe default; override via vendorData
      bannerImageUrl: null,
      ...vendorData,
    }),
  });

  // getDocs → menuItems subcollection
  collection.mockReturnValue('menu-col-ref');
  getDocs.mockResolvedValue({
    forEach: (cb) =>
      menuItems.forEach((item) =>
        cb({ id: item.id, data: () => ({ ...item }) })
      ),
  });
};

// ─── Default props ────────────────────────────────────────────────────────────

const defaultProps = {
  shop:        { id: 'shop-1', name: 'Kota House' },
  onBack:      jest.fn(),
  addToBasket: jest.fn(),
};

const renderMenu = (props = {}) =>
  render(<MenuView {...defaultProps} {...props} />);

// helper: wait until Firestore data has loaded (getDocs resolves)
const waitForLoad = () => waitFor(() => expect(getDocs).toHaveBeenCalled());

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MenuView.js', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    // doNotFake Date so checkIsOpen's new Date() works correctly.
    // We only need fake timers for the setTimeout revert test.
    jest.useFakeTimers({ doNotFake: ['Date'] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Header ────────────────────────────────────────────────────────────────────

  describe('Header Rendering', () => {
    it('renders without crashing', async () => {
      mockFirestore();
      renderMenu();
      await waitForLoad();
    });

    it('displays the shop name as the heading', async () => {
      mockFirestore();
      renderMenu();
      expect(await screen.findByRole('heading', { name: 'Kota House' })).toBeInTheDocument();
    });

    it('falls back to "Menu" when shop name is undefined', async () => {
      mockFirestore();
      renderMenu({ shop: { id: 'shop-1', name: undefined } });
      expect(await screen.findByRole('heading', { name: 'Menu' })).toBeInTheDocument();
    });

    it('renders the main element with class "menu-container"', async () => {
      mockFirestore();
      renderMenu();
      await waitForLoad();
      expect(document.querySelector('main.menu-container')).toBeInTheDocument();
    });
  });

  // ── Firestore Integration ─────────────────────────────────────────────────────

  describe('Firestore Integration', () => {
    it('calls getDoc with the correct vendor ref on mount', async () => {
      mockFirestore();
      renderMenu();
      await waitForLoad();
      expect(doc).toHaveBeenCalledWith({}, 'Vendors', 'shop-1');
      expect(getDoc).toHaveBeenCalledTimes(1);
    });

    it('calls getDocs for the menuItems subcollection', async () => {
      mockFirestore();
      renderMenu();
      await waitForLoad();
      expect(collection).toHaveBeenCalledWith({}, 'Vendors', 'shop-1', 'menuItems');
      expect(getDocs).toHaveBeenCalledTimes(1);
    });

    it('does not call getDoc when shop is null', async () => {
      mockFirestore();
      renderMenu({ shop: null });
      // give the effect a chance to fire
      await act(async () => {});
      expect(getDoc).not.toHaveBeenCalled();
    });

    it('renders a menu item fetched from Firestore', async () => {
      mockFirestore({ menuItems: [makeMenuItem({ name: 'Peri Peri Wrap' })] });
      renderMenu();
      expect(await screen.findByText('Peri Peri Wrap')).toBeInTheDocument();
    });

    it('renders multiple menu items', async () => {
      mockFirestore({
        menuItems: [
          makeMenuItem({ id: 'i1', name: 'Item One'   }),
          makeMenuItem({ id: 'i2', name: 'Item Two'   }),
          makeMenuItem({ id: 'i3', name: 'Item Three' }),
        ],
      });
      renderMenu();
      expect(await screen.findByText('Item One')).toBeInTheDocument();
      expect(screen.getByText('Item Two')).toBeInTheDocument();
      expect(screen.getByText('Item Three')).toBeInTheDocument();
    });
  });

  // ── Open / Closed Status ──────────────────────────────────────────────────────

  describe('Open / Closed Status', () => {
    it('shows "Open now" when shop hours cover current time', async () => {
      mockFirestore({ vendorData: { hours: alwaysOpen() } });
      renderMenu();
      expect(await screen.findByText('Open now')).toBeInTheDocument();
    });

    it('shows "Closed" when shop is closed today', async () => {
      mockFirestore({ vendorData: { hours: alwaysClosed() } });
      renderMenu();
      expect(await screen.findByText('Closed')).toBeInTheDocument();
    });

    it('shows "Closed" when vendor has no hours', async () => {
      mockFirestore({ vendorData: { hours: null } });
      renderMenu();
      expect(await screen.findByText('Closed')).toBeInTheDocument();
    });

    it('applies open CSS class when open', async () => {
      mockFirestore({ vendorData: { hours: alwaysOpen() } });
      renderMenu();
      await waitForLoad();
      expect(document.querySelector('.menu-status-banner--open')).toBeInTheDocument();
    });

    it('applies closed CSS class when closed', async () => {
      mockFirestore({ vendorData: { hours: alwaysClosed() } });
      renderMenu();
      await waitForLoad();
      expect(document.querySelector('.menu-status-banner--closed')).toBeInTheDocument();
    });

    it('shows order instruction when shop is open', async () => {
      mockFirestore({ vendorData: { hours: alwaysOpen() } });
      renderMenu();
      expect(await screen.findByText(/select items to add to your order/i)).toBeInTheDocument();
    });

    it('hides order instruction when shop is closed', async () => {
      mockFirestore({ vendorData: { hours: alwaysClosed() } });
      renderMenu();
      await waitForLoad();
      expect(screen.queryByText(/select items to add to your order/i)).not.toBeInTheDocument();
    });
  });

  // ── todayLabel ────────────────────────────────────────────────────────────────

  describe('Today Hours Label', () => {
    it('shows open and close times when shop has hours for today', async () => {
      mockFirestore({ vendorData: { hours: alwaysOpen() } });
      renderMenu();
      expect(await screen.findByText(/08:00\s*–\s*22:00/)).toBeInTheDocument();
    });

    it('shows "Closed today" when today entry has closed:true', async () => {
      mockFirestore({ vendorData: { hours: alwaysClosed() } });
      renderMenu();
      expect(await screen.findByText(/closed today/i)).toBeInTheDocument();
    });

    it('shows "No hours listed for today" when today key is missing', async () => {
      mockFirestore({ vendorData: { hours: {} } });
      renderMenu();
      expect(await screen.findByText(/no hours listed for today/i)).toBeInTheDocument();
    });

    it('shows no hours label when vendor has no hours object', async () => {
      mockFirestore({ vendorData: { hours: null } });
      renderMenu();
      await waitForLoad();
      expect(screen.queryByText(/today:/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/no hours/i)).not.toBeInTheDocument();
    });
  });

  // ── Banner ────────────────────────────────────────────────────────────────────

  describe('Banner Image', () => {
    it('renders the banner image when bannerImageUrl is present', async () => {
      mockFirestore({ vendorData: { bannerImageUrl: 'https://example.com/banner.jpg' } });
      renderMenu();
      await waitForLoad();
      const img = document.querySelector('.menu-banner__img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/banner.jpg');
    });

    it('does not render the banner when bannerImageUrl is null', async () => {
      mockFirestore({ vendorData: { bannerImageUrl: null } });
      renderMenu();
      await waitForLoad();
      expect(document.querySelector('.menu-banner')).not.toBeInTheDocument();
    });
  });

  // ── Menu Item Rendering ───────────────────────────────────────────────────────

  describe('Menu Item Rendering', () => {
    it('displays the item name', async () => {
      mockFirestore({ menuItems: [makeMenuItem({ name: 'Kota Special' })] });
      renderMenu();
      expect(await screen.findByText('Kota Special')).toBeInTheDocument();
    });

    it('formats the price with R prefix and 2 decimal places', async () => {
      mockFirestore({ menuItems: [makeMenuItem({ price: '35' })] });
      renderMenu();
      expect(await screen.findByText('R35.00')).toBeInTheDocument();
    });

    it('shows R0.00 when price is missing', async () => {
      mockFirestore({ menuItems: [makeMenuItem({ price: undefined })] });
      renderMenu();
      expect(await screen.findByText('R0.00')).toBeInTheDocument();
    });

    it('displays the item description when present', async () => {
      mockFirestore({ menuItems: [makeMenuItem({ description: 'Spicy and delicious' })] });
      renderMenu();
      expect(await screen.findByText('Spicy and delicious')).toBeInTheDocument();
    });

    it('does not render description when absent', async () => {
      mockFirestore({ menuItems: [makeMenuItem({ description: undefined })] });
      renderMenu();
      await waitForLoad();
      expect(document.querySelector('.menu-item__description')).not.toBeInTheDocument();
    });

    it('renders item image when imageUrl is present', async () => {
      mockFirestore({ menuItems: [makeMenuItem({ name: 'Wrap', imageUrl: 'https://example.com/food.jpg' })] });
      renderMenu();
      const img = await screen.findByRole('img', { name: 'Wrap' });
      expect(img).toHaveAttribute('src', 'https://example.com/food.jpg');
    });

    it('does not render item image when imageUrl is absent', async () => {
      mockFirestore({ menuItems: [makeMenuItem({ imageUrl: '' })] });
      renderMenu();
      await waitForLoad();
      expect(document.querySelector('.menu-item__img')).not.toBeInTheDocument();
    });
  });

  // ── Availability Logic ────────────────────────────────────────────────────────

  describe('Availability Logic', () => {
    it('shows "● Available" when isSoldOut is false and qty is undefined', async () => {
      mockFirestore({ menuItems: [makeMenuItem({ isSoldOut: false, qty: undefined })] });
      renderMenu();
      expect(await screen.findByText('● Available')).toBeInTheDocument();
    });

    it('shows "○ Sold Out" when isSoldOut is true', async () => {
      mockFirestore({ menuItems: [makeMenuItem({ isSoldOut: true })] });
      renderMenu();
      expect(await screen.findByText('○ Sold Out')).toBeInTheDocument();
    });

    it('shows "○ Sold Out" when qty is "0"', async () => {
      mockFirestore({ menuItems: [makeMenuItem({ isSoldOut: false, qty: '0' })] });
      renderMenu();
      expect(await screen.findByText('○ Sold Out')).toBeInTheDocument();
    });

    it('shows "● Available" when qty is empty string', async () => {
      mockFirestore({ menuItems: [makeMenuItem({ isSoldOut: false, qty: '' })] });
      renderMenu();
      expect(await screen.findByText('● Available')).toBeInTheDocument();
    });

    it('shows "● Available" when qty is greater than 0', async () => {
      mockFirestore({ menuItems: [makeMenuItem({ isSoldOut: false, qty: '5' })] });
      renderMenu();
      expect(await screen.findByText('● Available')).toBeInTheDocument();
    });

    it('applies "menu-item--sold-out" class when item is unavailable', async () => {
      mockFirestore({ menuItems: [makeMenuItem({ isSoldOut: true })] });
      renderMenu();
      await waitForLoad();
      expect(document.querySelector('.menu-item--sold-out')).toBeInTheDocument();
    });

    it('does not apply "menu-item--sold-out" class when item is available', async () => {
      mockFirestore({ menuItems: [makeMenuItem({ isSoldOut: false })] });
      renderMenu();
      await waitForLoad();
      expect(document.querySelector('.menu-item--sold-out')).not.toBeInTheDocument();
    });
  });

  // ── Add to Basket — Shop Open ─────────────────────────────────────────────────

  describe('Add to Basket — Shop Open', () => {
    const openShop = { vendorData: { hours: alwaysOpen() } };

    it('renders "Add to Basket" when shop is open and item is available', async () => {
      mockFirestore({ ...openShop, menuItems: [makeMenuItem()] });
      renderMenu();
      expect(await screen.findByRole('button', { name: /add to basket/i })).toBeInTheDocument();
    });

    it('calls addToBasket with item and shop when clicked', async () => {
      const item = makeMenuItem({ id: 'i1', name: 'Kota' });
      mockFirestore({ ...openShop, menuItems: [item] });
      renderMenu();
      fireEvent.click(await screen.findByRole('button', { name: /add to basket/i }));
      expect(defaultProps.addToBasket).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'i1', name: 'Kota' }),
        defaultProps.shop
      );
    });

    it('shows "✓ Added!" immediately after clicking', async () => {
      mockFirestore({ ...openShop, menuItems: [makeMenuItem()] });
      renderMenu();
      fireEvent.click(await screen.findByRole('button', { name: /add to basket/i }));
      expect(screen.getByRole('button', { name: /✓ added!/i })).toBeInTheDocument();
    });

    it('reverts to "Add to Basket" after 1000ms', async () => {
      mockFirestore({ ...openShop, menuItems: [makeMenuItem()] });
      renderMenu();
      fireEvent.click(await screen.findByRole('button', { name: /add to basket/i }));
      act(() => jest.advanceTimersByTime(1000));
      expect(await screen.findByRole('button', { name: /add to basket/i })).toBeInTheDocument();
    });

    it('renders "Sold Out" on the button when item is unavailable', async () => {
      mockFirestore({ ...openShop, menuItems: [makeMenuItem({ isSoldOut: true })] });
      renderMenu();
      // The add button shows "Sold Out" text when item is unavailable and shop is open
      await waitForLoad();
      expect(document.querySelector('.menu-item__add-btn')).toHaveTextContent('Sold Out');
    });

    it('disables the button when item is sold out', async () => {
      mockFirestore({ ...openShop, menuItems: [makeMenuItem({ isSoldOut: true })] });
      renderMenu();
      await waitForLoad();
      expect(document.querySelector('.menu-item__add-btn')).toBeDisabled();
    });

    it('does not call addToBasket when sold-out button is clicked', async () => {
      mockFirestore({ ...openShop, menuItems: [makeMenuItem({ isSoldOut: true })] });
      renderMenu();
      await waitForLoad();
      fireEvent.click(document.querySelector('.menu-item__add-btn'));
      expect(defaultProps.addToBasket).not.toHaveBeenCalled();
    });

    it('applies "disabled" class to button when item is sold out', async () => {
      mockFirestore({ ...openShop, menuItems: [makeMenuItem({ isSoldOut: true })] });
      renderMenu();
      await waitForLoad();
      expect(document.querySelector('.menu-item__add-btn.disabled')).toBeInTheDocument();
    });
  });

  // ── Add to Basket — Shop Closed ───────────────────────────────────────────────

  describe('Add to Basket — Shop Closed', () => {
    const closedShop = { vendorData: { hours: alwaysClosed() } };

    it('renders "Shop Closed" button when shop is closed', async () => {
      mockFirestore({ ...closedShop, menuItems: [makeMenuItem()] });
      renderMenu();
      expect(await screen.findByRole('button', { name: /shop closed/i })).toBeInTheDocument();
    });

    it('"Shop Closed" button is disabled', async () => {
      mockFirestore({ ...closedShop, menuItems: [makeMenuItem()] });
      renderMenu();
      expect(await screen.findByRole('button', { name: /shop closed/i })).toBeDisabled();
    });

    it('does not call addToBasket when "Shop Closed" is clicked', async () => {
      mockFirestore({ ...closedShop, menuItems: [makeMenuItem()] });
      renderMenu();
      fireEvent.click(await screen.findByRole('button', { name: /shop closed/i }));
      expect(defaultProps.addToBasket).not.toHaveBeenCalled();
    });
  });

  // ── Back Button ───────────────────────────────────────────────────────────────

  describe('Back Button', () => {
    it('renders "← Back to Shops"', async () => {
      mockFirestore();
      renderMenu();
      expect(await screen.findByRole('button', { name: /← back to shops/i })).toBeInTheDocument();
    });

    it('calls onBack when clicked', async () => {
      mockFirestore();
      renderMenu();
      fireEvent.click(await screen.findByRole('button', { name: /← back to shops/i }));
      expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
    });
  });

  // ── DietaryInfo Sub-component ─────────────────────────────────────────────────

  describe('DietaryInfo Component', () => {
    it('does not render toggle when item has no dietary or allergen data', async () => {
      mockFirestore({ menuItems: [makeMenuItem({ dietary: [], allergens: [] })] });
      renderMenu();
      await waitForLoad();
      expect(screen.queryByText(/dietary & allergen info/i)).not.toBeInTheDocument();
    });

    it('renders the toggle button when item has dietary flags', async () => {
      mockFirestore({ menuItems: [makeMenuItem({ dietary: ['halal'] })] });
      renderMenu();
      expect(await screen.findByText(/▼ Dietary & Allergen Info/)).toBeInTheDocument();
    });

    it('renders the toggle button when item has allergens', async () => {
      mockFirestore({ menuItems: [makeMenuItem({ allergens: ['Gluten'] })] });
      renderMenu();
      expect(await screen.findByText(/▼ Dietary & Allergen Info/)).toBeInTheDocument();
    });

    it('hides dietary details before toggle is clicked', async () => {
      mockFirestore({ menuItems: [makeMenuItem({ dietary: ['vegan'] })] });
      renderMenu();
      await screen.findByText(/dietary & allergen info/i);
      expect(screen.queryByText('Dietary')).not.toBeInTheDocument();
    });

    it('expands dietary details when toggle is clicked', async () => {
      mockFirestore({ menuItems: [makeMenuItem({ dietary: ['vegan'] })] });
      renderMenu();
      fireEvent.click(await screen.findByText(/▼ Dietary & Allergen Info/));
      expect(screen.getByText('Dietary')).toBeInTheDocument();
    });

    it('toggles ▲/▼ arrow on repeated clicks', async () => {
      mockFirestore({ menuItems: [makeMenuItem({ dietary: ['vegan'] })] });
      renderMenu();
      fireEvent.click(await screen.findByText(/▼ Dietary & Allergen Info/));
      expect(screen.getByText(/▲ Dietary & Allergen Info/)).toBeInTheDocument();
      fireEvent.click(screen.getByText(/▲ Dietary & Allergen Info/));
      expect(screen.getByText(/▼ Dietary & Allergen Info/)).toBeInTheDocument();
    });

    it('sets aria-expanded correctly on the toggle', async () => {
      mockFirestore({ menuItems: [makeMenuItem({ dietary: ['halal'] })] });
      renderMenu();
      const toggle = await screen.findByRole('button', { name: /dietary & allergen info/i });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });

    it('renders icon and label for a known dietary flag (halal)', async () => {
      mockFirestore({ menuItems: [makeMenuItem({ dietary: ['halal'] })] });
      renderMenu();
      fireEvent.click(await screen.findByText(/dietary & allergen info/i));
      expect(screen.getByText(/Halal/)).toBeInTheDocument();
    });

    it('renders a fallback pill for an unknown dietary flag', async () => {
      mockFirestore({ menuItems: [makeMenuItem({ dietary: ['keto'] })] });
      renderMenu();
      fireEvent.click(await screen.findByText(/dietary & allergen info/i));
      expect(screen.getByText(/keto/i)).toBeInTheDocument();
    });

    it('shows "⚠️ Contains Allergens" when allergens are present', async () => {
      mockFirestore({ menuItems: [makeMenuItem({ allergens: ['Gluten'] })] });
      renderMenu();
      fireEvent.click(await screen.findByText(/dietary & allergen info/i));
      expect(screen.getByText(/⚠️ Contains Allergens/)).toBeInTheDocument();
    });

    it('renders the correct allergen icon for a known allergen (Dairy)', async () => {
      mockFirestore({ menuItems: [makeMenuItem({ allergens: ['Dairy'] })] });
      renderMenu();
      fireEvent.click(await screen.findByText(/dietary & allergen info/i));
      expect(screen.getByText(/Dairy/)).toBeInTheDocument();
    });

    it('renders ⚠️ fallback for an unknown allergen', async () => {
      mockFirestore({ menuItems: [makeMenuItem({ allergens: ['Mustard'] })] });
      renderMenu();
      fireEvent.click(await screen.findByText(/dietary & allergen info/i));
      expect(screen.getByText(/Mustard/)).toBeInTheDocument();
    });
  });

});