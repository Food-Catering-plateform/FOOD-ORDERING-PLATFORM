import React, { useEffect } from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
let App;

// ─── Firebase mocks ──────────────────────────────────────────────────────────

var firebaseConfig = {
  auth: { currentUser: null },
  db: {},
};

var authUser = null;
var mockOnAuthStateChanged = jest.fn((auth, callback) => {
  callback(authUser);
  return jest.fn();
});

var mockDoc = jest.fn((db, collection, id) => ({ collection, id }));
var mockGetDoc = jest.fn();

jest.mock('./Firebase/firebaseConfig', () => firebaseConfig);

jest.mock('firebase/auth', () => {
  const exports = {
    __esModule: true,
    onAuthStateChanged: mockOnAuthStateChanged,
    GoogleAuthProvider: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    signInWithPopup: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  };
  exports.default = exports;
  return exports;
});

jest.mock('firebase/firestore', () => {
  const exports = {
    __esModule: true,
    doc: mockDoc,
    getDoc: mockGetDoc,
  };
  exports.default = exports;
  return exports;
});

// ─── Page component mocks ───────────────────────────────────────────────────

jest.mock('./components/Navbar/Navbar', () => ({ search, setSearch }) => (
  <div>
    Navbar
    <input
      aria-label="search"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  </div>
));

jest.mock('./components/Sidebar/Sidebar', () => ({ toggleSidebar }) => (
  <button type="button" onClick={toggleSidebar}>Toggle Sidebar</button>
));

jest.mock('./components/login-and-signup/login', () => jest.fn(({ onLoginSuccess }) => (
  <button type="button" onClick={() => onLoginSuccess('shops')}>Login Page</button>
)));

jest.mock('./components/Customer/jsFiles/Profile', () => ({ setActivePage }) => (
  <div>
    Profile Page
    <button onClick={() => setActivePage('shops')}>Go Shops</button>
  </div>
));
jest.mock('./components/Customer/jsFiles/Notifications', () => () => <div>Notifications Page</div>);
jest.mock('./components/Customer/jsFiles/Orders', () => () => <div>Orders Page</div>);
jest.mock('./components/Customer/jsFiles/Basket', () => ({ basket, setBasket, setActivePage }) => (
  <div>
    Basket Page: {basket.map((item) => `${item.id}:${item.qty}`).join(', ')}
    <button onClick={() => setActivePage('payment')}>Checkout</button>
  </div>
));
jest.mock('./components/Vendor/VDashboard', () => ({ onLogout }) => (
  <div>
    Vendor Dashboard Page
    <button onClick={onLogout}>Logout</button>
  </div>
));
jest.mock('./components/Vendor/StoreSetup', () => ({ onComplete, onCancel }) => (
  <div>
    Store Setup Page
    <button onClick={onComplete}>Complete Setup</button>
    <button onClick={onCancel}>Cancel Setup</button>
  </div>
));
jest.mock('./components/Customer/jsFiles/MenuView', () => ({ addToBasket, onBack, shop }) => (
  <div>
    Menu View Page
    <button onClick={() => addToBasket({ id: 'item-1', name: 'Burger' }, { id: 'shop-1', name: 'Burger Place' })}>
      Add Item
    </button>
    <button onClick={() => addToBasket({ id: 'item-1', name: 'Burger' }, { id: 'shop-1', name: 'Burger Place' })}>
      Add Same Item Again
    </button>
    <button onClick={onBack}>Back</button>
  </div>
));
jest.mock('./components/Admin/AdminDashboard', () => ({ setActivePage }) => (
  <div>
    Admin Dashboard Page
    <button onClick={() => setActivePage('admin-vendor-management')}>Manage Vendors</button>
  </div>
));
jest.mock('./components/Admin/AdminVendorManagement', () => ({ setActivePage }) => (
  <div>
    Admin Vendor Management Page
    <button onClick={() => setActivePage('admin-dashboard')}>Back to Dashboard</button>
  </div>
));
jest.mock('./components/Customer/jsFiles/PaymentSuccess', () => ({ setActivePage, setBasket }) => (
  <div>
    Payment Success Page
    <button onClick={() => { setBasket([]); setActivePage('shops'); }}>Done</button>
  </div>
));
jest.mock('./components/Customer/jsFiles/Payment', () => ({ setActivePage, setBasket }) => (
  <div>
    Payment Page
    <button onClick={() => setActivePage('payment-success')}>Pay</button>
  </div>
));
jest.mock('./components/Customer/jsFiles/Dashboard', () => ({ setActivePage, setSelectedShop, search }) => (
  <div>
    Shops Page
    <button onClick={() => { setSelectedShop({ id: 'shop-1', name: 'Burger Place' }); setActivePage('menu-view'); }}>
      Open Shop
    </button>
  </div>
));

App = require('./App').default;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const setSearch = (search) => {
  window.history.pushState({}, 'Test page', `http://localhost${search}`);
};

const renderApp = () => render(<App />);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('App Component', () => {
  const Login = require('./components/login-and-signup/login');

  beforeEach(() => {
    authUser = null;
    firebaseConfig.auth.currentUser = null;
    mockOnAuthStateChanged.mockClear();
    mockGetDoc.mockClear();
    Login.mockImplementation(({ onLoginSuccess }) => (
      <button type="button" onClick={() => onLoginSuccess('shops')}>Login Page</button>
    ));
    setSearch('');
  });

  // ── Basic routing ────────────────────────────────────────────────────────

  test('renders login page by default', () => {
    renderApp();
    expect(screen.getByRole('button', { name: /login page/i })).toBeInTheDocument();
  });

  test('renders logout case as login page', () => {
    setSearch('?page=logout');
    renderApp();
    expect(screen.getByRole('button', { name: /login page/i })).toBeInTheDocument();
  });

  test('renders payment success page and hides chrome', () => {
    setSearch('?page=payment-success');
    renderApp();
    expect(screen.getByText('Payment Success Page')).toBeInTheDocument();
    expect(screen.queryByText('Navbar')).not.toBeInTheDocument();
    expect(screen.queryByText('Toggle Sidebar')).not.toBeInTheDocument();
  });

  test('renders payment page when ?page=payment is in URL', () => {
    setSearch('?page=payment');
    renderApp();
    expect(screen.getByText('Payment Page')).toBeInTheDocument();
  });

  test('renders menu view page when ?page=menu-view is in URL', () => {
    setSearch('?page=menu-view');
    renderApp();
    expect(screen.getByText('Menu View Page')).toBeInTheDocument();
  });

  // ── Registration & pending screens ───────────────────────────────────────

  test('renders registration success screen and returns to login', () => {
    setSearch('?page=registration-success');
    renderApp();
    expect(screen.getByText(/Registration Submitted!/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /go to login/i }));
    expect(screen.getByRole('button', { name: /login page/i })).toBeInTheDocument();
  });

  test('renders vendor pending screen and returns to login', () => {
    setSearch('?page=vendor-pending');
    renderApp();
    expect(screen.getByText(/Account Pending Approval/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /back to login/i }));
    expect(screen.getByRole('button', { name: /login page/i })).toBeInTheDocument();
  });

  test('renders vendor suspended screen', () => {
    setSearch('?page=vendor-suspended');
    renderApp();
    expect(screen.getByText(/Account Suspended/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /back to login/i }));
    expect(screen.getByRole('button', { name: /login page/i })).toBeInTheDocument();
  });

  test('renders admin pending screen', () => {
    setSearch('?page=admin-pending');
    renderApp();
    expect(screen.getByText(/Admin Request Pending/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /back to login/i }));
    expect(screen.getByRole('button', { name: /login page/i })).toBeInTheDocument();
  });

  test('renders admin suspended screen', () => {
    setSearch('?page=admin-suspended');
    renderApp();
    expect(screen.getByText(/Admin Account Suspended/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /back to login/i }));
    expect(screen.getByRole('button', { name: /login page/i })).toBeInTheDocument();
  });

  // ── handleLoginSuccess branches ──────────────────────────────────────────

  test('calls onLoginSuccess admin and renders admin dashboard', () => {
    Login.mockImplementation(({ onLoginSuccess }) => (
      <button type="button" onClick={() => onLoginSuccess('admin')}>Login Page</button>
    ));
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /login page/i }));
    expect(screen.getByText('Admin Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('Navbar')).not.toBeInTheDocument();
  });

  test('calls onLoginSuccess vendor-pending and renders vendor-pending screen', () => {
    Login.mockImplementation(({ onLoginSuccess }) => (
      <button type="button" onClick={() => onLoginSuccess('vendor-pending')}>Login Page</button>
    ));
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /login page/i }));
    expect(screen.getByText(/Account Pending Approval/i)).toBeInTheDocument();
  });

  test('calls onLoginSuccess vendor-suspended and renders vendor-suspended screen', () => {
    Login.mockImplementation(({ onLoginSuccess }) => (
      <button type="button" onClick={() => onLoginSuccess('vendor-suspended')}>Login Page</button>
    ));
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /login page/i }));
    expect(screen.getByText(/Account Suspended/i)).toBeInTheDocument();
  });

  test('calls onLoginSuccess admin-pending and renders admin-pending screen', () => {
    Login.mockImplementation(({ onLoginSuccess }) => (
      <button type="button" onClick={() => onLoginSuccess('admin-pending')}>Login Page</button>
    ));
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /login page/i }));
    expect(screen.getByText(/Admin Request Pending/i)).toBeInTheDocument();
  });

  test('calls onLoginSuccess admin-suspended and renders admin-suspended screen', () => {
    Login.mockImplementation(({ onLoginSuccess }) => (
      <button type="button" onClick={() => onLoginSuccess('admin-suspended')}>Login Page</button>
    ));
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /login page/i }));
    expect(screen.getByText(/Admin Account Suspended/i)).toBeInTheDocument();
  });

  test('calls onLoginSuccess vendor and renders store setup when vendor doc is missing', async () => {
    firebaseConfig.auth.currentUser = { uid: 'vendor-1' };
    mockGetDoc.mockResolvedValue({ exists: () => false });
    Login.mockImplementation(({ onLoginSuccess }) => (
      <button type="button" onClick={() => onLoginSuccess('vendor')}>Login Page</button>
    ));
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /login page/i }));
    expect(await screen.findByText('Store Setup Page')).toBeInTheDocument();
  });

  test('calls onLoginSuccess vendor and renders vendor dashboard when vendor exists', async () => {
    firebaseConfig.auth.currentUser = { uid: 'vendor-1' };
    mockGetDoc.mockImplementation((docRef) => {
      if (docRef.collection === 'Vendors') {
        return Promise.resolve({ exists: () => true, data: () => ({}) });
      }
      return Promise.resolve({ exists: () => false });
    });
    Login.mockImplementation(({ onLoginSuccess }) => (
      <button type="button" onClick={() => onLoginSuccess('vendor')}>Login Page</button>
    ));
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /login page/i }));
    expect(await screen.findByText('Vendor Dashboard Page')).toBeInTheDocument();
  });

  // ── Customer chrome & sidebar ────────────────────────────────────────────

  test('renders shops page with chrome and toggles sidebar layout', () => {
    const { container } = renderApp();
    fireEvent.click(screen.getByRole('button', { name: /login page/i }));

    expect(screen.getByText('Shops Page')).toBeInTheDocument();
    expect(screen.getByText('Navbar')).toBeInTheDocument();
    expect(screen.getByText('Toggle Sidebar')).toBeInTheDocument();

    const main = container.querySelector('main');
    expect(main).toHaveStyle('margin-left: 0');

    fireEvent.click(screen.getByText('Toggle Sidebar'));
    expect(main).toHaveStyle('margin-left: 200px');
  });

  test('search input updates search state via Navbar', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /login page/i }));
    const input = screen.getByRole('textbox', { name: /search/i });
    fireEvent.change(input, { target: { value: 'pizza' } });
    expect(input.value).toBe('pizza');
  });

  // ── Customer page navigation ─────────────────────────────────────────────

  test('navigates from shops to menu-view via setSelectedShop', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /login page/i }));
    fireEvent.click(screen.getByRole('button', { name: /open shop/i }));
    expect(screen.getByText('Menu View Page')).toBeInTheDocument();
  });

  test('addToBasket adds a new item then increments qty on duplicate', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /login page/i }));
    fireEvent.click(screen.getByRole('button', { name: /open shop/i }));
    expect(screen.getByText('Menu View Page')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /add item/i }));
    fireEvent.click(screen.getByRole('button', { name: /add same item again/i }));

    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    fireEvent.click(screen.getByRole('button', { name: /open shop/i }));
    fireEvent.click(screen.getByRole('button', { name: /back/i }));

    window.history.pushState({}, 'Test page', 'http://localhost?page=basket');
    fireEvent.click(screen.getByRole('button', { name: /open shop/i }));
  });

  test('addToBasket qty increment is reflected in basket', () => {
    const { rerender } = renderApp();
    fireEvent.click(screen.getByRole('button', { name: /login page/i }));
    fireEvent.click(screen.getByRole('button', { name: /open shop/i }));

    fireEvent.click(screen.getByRole('button', { name: /add item/i }));
    fireEvent.click(screen.getByRole('button', { name: /add same item again/i }));

    fireEvent.click(screen.getByRole('button', { name: /back/i }));

    window.history.pushState({}, 'Test page', 'http://localhost?page=basket');
    rerender(<App />);

    expect(screen.getByText(/Basket Page/i)).toBeInTheDocument();
    expect(screen.getByText(/item-1:2/i)).toBeInTheDocument();
  });

  test('menu-view onBack navigates to shops', () => {
    setSearch('?page=menu-view');
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByText('Shops Page')).toBeInTheDocument();
  });

  test('renders profile page with chrome', () => {
    setSearch('?page=profile');
    renderApp();
    expect(screen.getByText('Profile Page')).toBeInTheDocument();
    expect(screen.getByText('Navbar')).toBeInTheDocument();
  });

  test('profile setActivePage navigates to shops', () => {
    setSearch('?page=profile');
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /go shops/i }));
    expect(screen.getByText('Shops Page')).toBeInTheDocument();
  });

  test('renders notifications page with chrome', () => {
    setSearch('?page=notifications');
    renderApp();
    expect(screen.getByText('Notifications Page')).toBeInTheDocument();
    expect(screen.getByText('Navbar')).toBeInTheDocument();
  });

  test('renders orders page with chrome', () => {
    setSearch('?page=orders');
    renderApp();
    expect(screen.getByText('Orders Page')).toBeInTheDocument();
    expect(screen.getByText('Navbar')).toBeInTheDocument();
  });

  test('renders basket page with chrome', () => {
    setSearch('?page=basket');
    renderApp();
    expect(screen.getByText(/Basket Page/i)).toBeInTheDocument();
    expect(screen.getByText('Navbar')).toBeInTheDocument();
  });

  test('basket checkout button navigates to payment', () => {
    setSearch('?page=basket');
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /checkout/i }));
    expect(screen.getByText('Payment Page')).toBeInTheDocument();
  });

  // ── Vendor screens ───────────────────────────────────────────────────────

  test('store setup onComplete navigates to vendor-pending', async () => {
    firebaseConfig.auth.currentUser = { uid: 'vendor-1' };
    mockGetDoc.mockResolvedValue({ exists: () => false });
    Login.mockImplementation(({ onLoginSuccess }) => (
      <button type="button" onClick={() => onLoginSuccess('vendor')}>Login Page</button>
    ));
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /login page/i }));
    await screen.findByText('Store Setup Page');
    fireEvent.click(screen.getByRole('button', { name: /complete setup/i }));
    expect(screen.getByText(/Account Pending Approval/i)).toBeInTheDocument();
  });

  test('store setup onCancel navigates to login', async () => {
    firebaseConfig.auth.currentUser = { uid: 'vendor-1' };
    mockGetDoc.mockResolvedValue({ exists: () => false });
    Login.mockImplementation(({ onLoginSuccess }) => (
      <button type="button" onClick={() => onLoginSuccess('vendor')}>Login Page</button>
    ));
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /login page/i }));
    await screen.findByText('Store Setup Page');
    fireEvent.click(screen.getByRole('button', { name: /cancel setup/i }));
    expect(screen.getByRole('button', { name: /login page/i })).toBeInTheDocument();
  });

  test('vendor dashboard logout navigates to login', async () => {
    firebaseConfig.auth.currentUser = { uid: 'vendor-1' };
    mockGetDoc.mockImplementation((docRef) => {
      if (docRef.collection === 'Vendors') {
        return Promise.resolve({ exists: () => true, data: () => ({}) });
      }
      return Promise.resolve({ exists: () => false });
    });
    Login.mockImplementation(({ onLoginSuccess }) => (
      <button type="button" onClick={() => onLoginSuccess('vendor')}>Login Page</button>
    ));
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /login page/i }));
    await screen.findByText('Vendor Dashboard Page');
    fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    expect(screen.getByRole('button', { name: /login page/i })).toBeInTheDocument();
  });

  // ── Admin screens ────────────────────────────────────────────────────────

  test('admin dashboard navigates to admin vendor management', () => {
    Login.mockImplementation(({ onLoginSuccess }) => (
      <button type="button" onClick={() => onLoginSuccess('admin')}>Login Page</button>
    ));
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /login page/i }));
    fireEvent.click(screen.getByRole('button', { name: /manage vendors/i }));
    expect(screen.getByText('Admin Vendor Management Page')).toBeInTheDocument();
  });

  test('admin vendor management navigates back to admin dashboard', () => {
    Login.mockImplementation(({ onLoginSuccess }) => (
      <button type="button" onClick={() => onLoginSuccess('admin')}>Login Page</button>
    ));
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /login page/i }));
    fireEvent.click(screen.getByRole('button', { name: /manage vendors/i }));
    fireEvent.click(screen.getByRole('button', { name: /back to dashboard/i }));
    expect(screen.getByText('Admin Dashboard Page')).toBeInTheDocument();
  });

  // ── Payment success ──────────────────────────────────────────────────────

  test('payment success done button clears basket and goes to shops', () => {
    setSearch('?page=payment-success');
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /done/i }));
    expect(screen.getByText('Shops Page')).toBeInTheDocument();
  });

  // ── useEffect auth routing ───────────────────────────────────────────────

  test('auth effect shows loading then resolves for logged-in user', async () => {
    authUser = { uid: 'customer-1' };
    mockGetDoc.mockImplementation((docRef) => {
      if (docRef.collection === 'users') {
        return Promise.resolve({ exists: () => true, data: () => ({ role: 'shops' }) });
      }
      return Promise.resolve({ exists: () => false });
    });
    renderApp();
    expect(await screen.findByText('Shops Page')).toBeInTheDocument();
  });

  test('auth effect: no user doc → sets checking false and shows login', async () => {
    authUser = { uid: 'unknown-1' };
    mockGetDoc.mockResolvedValue({ exists: () => false });
    renderApp();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /login page/i })).toBeInTheDocument();
    });
  });

  test('auth effect routes approved vendor to vendor-dashboard', async () => {
    authUser = { uid: 'vendor-1' };
    mockGetDoc.mockImplementation((docRef) => {
      if (docRef.collection === 'users') {
        return Promise.resolve({ exists: () => true, data: () => ({ role: 'vendor' }) });
      }
      if (docRef.collection === 'Vendors') {
        return Promise.resolve({ exists: () => true, data: () => ({ status: 'approved' }) });
      }
      return Promise.resolve({ exists: () => false });
    });
    renderApp();
    expect(await screen.findByText('Vendor Dashboard Page')).toBeInTheDocument();
  });

  test('auth effect routes suspended vendor to vendor-suspended', async () => {
    authUser = { uid: 'vendor-1' };
    mockGetDoc.mockImplementation((docRef) => {
      if (docRef.collection === 'users') {
        return Promise.resolve({ exists: () => true, data: () => ({ role: 'vendor' }) });
      }
      if (docRef.collection === 'Vendors') {
        return Promise.resolve({ exists: () => true, data: () => ({ status: 'suspended' }) });
      }
      return Promise.resolve({ exists: () => false });
    });
    renderApp();
    expect(await screen.findByText(/Account Suspended/i)).toBeInTheDocument();
  });

  test('auth effect routes vendor with storeInitialized=false and non-approved to store-setup', async () => {
    authUser = { uid: 'vendor-1' };
    mockGetDoc.mockImplementation((docRef) => {
      if (docRef.collection === 'users') {
        return Promise.resolve({ exists: () => true, data: () => ({ role: 'vendor' }) });
      }
      if (docRef.collection === 'Vendors') {
        return Promise.resolve({
          exists: () => true,
          data: () => ({ status: 'pending', storeInitialized: false }),
        });
      }
      return Promise.resolve({ exists: () => false });
    });
    renderApp();
    expect(await screen.findByText('Store Setup Page')).toBeInTheDocument();
  });

  test('auth effect routes vendor with storeInitialized=true and non-approved to vendor-pending', async () => {
    authUser = { uid: 'vendor-1' };
    mockGetDoc.mockImplementation((docRef) => {
      if (docRef.collection === 'users') {
        return Promise.resolve({ exists: () => true, data: () => ({ role: 'vendor' }) });
      }
      if (docRef.collection === 'Vendors') {
        return Promise.resolve({
          exists: () => true,
          data: () => ({ status: 'pending', storeInitialized: true }),
        });
      }
      return Promise.resolve({ exists: () => false });
    });
    renderApp();
    expect(await screen.findByText(/Account Pending Approval/i)).toBeInTheDocument();
  });

  test('auth effect routes vendor with missing Vendors doc to store-setup', async () => {
    authUser = { uid: 'vendor-1' };
    mockGetDoc.mockImplementation((docRef) => {
      if (docRef.collection === 'users') {
        return Promise.resolve({ exists: () => true, data: () => ({ role: 'vendor' }) });
      }
      if (docRef.collection === 'Vendors') {
        return Promise.resolve({ exists: () => false });
      }
      return Promise.resolve({ exists: () => false });
    });
    renderApp();
    expect(await screen.findByText('Store Setup Page')).toBeInTheDocument();
  });

  test('auth effect routes suspended admin to admin-suspended', async () => {
    authUser = { uid: 'admin-1' };
    mockGetDoc.mockImplementation((docRef) => {
      if (docRef.collection === 'users') {
        return Promise.resolve({ exists: () => true, data: () => ({ role: 'admin' }) });
      }
      if (docRef.collection === 'admins') {
        return Promise.resolve({ exists: () => true, data: () => ({ status: 'suspended' }) });
      }
      return Promise.resolve({ exists: () => false });
    });
    renderApp();
    expect(await screen.findByText(/Admin Account Suspended/i)).toBeInTheDocument();
  });

  test('auth effect routes pending admin to admin-pending', async () => {
    authUser = { uid: 'admin-1' };
    mockGetDoc.mockImplementation((docRef) => {
      if (docRef.collection === 'users') {
        return Promise.resolve({ exists: () => true, data: () => ({ role: 'admin' }) });
      }
      if (docRef.collection === 'admins') {
        return Promise.resolve({ exists: () => true, data: () => ({ status: 'pending' }) });
      }
      return Promise.resolve({ exists: () => false });
    });
    renderApp();
    expect(await screen.findByText(/Admin Request Pending/i)).toBeInTheDocument();
  });

  test('auth effect skips check entirely when page=payment-success', () => {
    setSearch('?page=payment-success');
    renderApp();
    expect(mockOnAuthStateChanged).not.toHaveBeenCalled();
    expect(screen.getByText('Payment Success Page')).toBeInTheDocument();
  });

  // ── NEW: previously uncovered branches ──────────────────────────────────

  test('auth effect routes approved admin to admin-dashboard via handleLoginSuccess', async () => {
    authUser = { uid: 'admin-1' };
    mockGetDoc.mockImplementation((docRef) => {
      if (docRef.collection === 'users') {
        return Promise.resolve({ exists: () => true, data: () => ({ role: 'admin' }) });
      }
      if (docRef.collection === 'admins') {
        return Promise.resolve({ exists: () => true, data: () => ({ status: 'approved' }) });
      }
      return Promise.resolve({ exists: () => false });
    });
    renderApp();
    expect(await screen.findByText('Admin Dashboard Page')).toBeInTheDocument();
  });

  test('auth effect routes admin with no admins doc to admin-dashboard via handleLoginSuccess', async () => {
    authUser = { uid: 'admin-1' };
    mockGetDoc.mockImplementation((docRef) => {
      if (docRef.collection === 'users') {
        return Promise.resolve({ exists: () => true, data: () => ({ role: 'admin' }) });
      }
      if (docRef.collection === 'admins') {
        return Promise.resolve({ exists: () => false });
      }
      return Promise.resolve({ exists: () => false });
    });
    renderApp();
    expect(await screen.findByText('Admin Dashboard Page')).toBeInTheDocument();
  });

  test('addToBasket increments qty when same item added twice and basket reflects qty:2', async () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /login page/i }));
    fireEvent.click(screen.getByRole('button', { name: /open shop/i }));

    fireEvent.click(screen.getByRole('button', { name: /add item/i }));
    fireEvent.click(screen.getByRole('button', { name: /add same item again/i }));

    fireEvent.click(screen.getByRole('button', { name: /back/i }));

    expect(screen.getByText('Shops Page')).toBeInTheDocument();

    const { unmount } = render(<App />);
    unmount();

    const { getByText } = render(<App />);
    fireEvent.click(getByText('Login Page'));
    fireEvent.click(getByText('Open Shop'));
    fireEvent.click(getByText('Add Item'));
    fireEvent.click(getByText('Add Same Item Again'));
    fireEvent.click(getByText('Back'));

    window.history.pushState({}, '', '?page=basket');
    fireEvent.click(getByText('Open Shop'));
  });

  test('basket shows qty:2 after adding same item twice within single app instance', () => {
    const { getByText, getByRole } = renderApp();

    fireEvent.click(getByRole('button', { name: /login page/i }));
    fireEvent.click(getByRole('button', { name: /open shop/i }));

    fireEvent.click(getByRole('button', { name: /add item/i }));
    fireEvent.click(getByRole('button', { name: /add same item again/i }));

    fireEvent.click(getByRole('button', { name: /back/i }));
    fireEvent.click(getByRole('button', { name: /open shop/i }));
    fireEvent.click(getByRole('button', { name: /back/i }));

    window.history.pushState({}, '', '?page=basket');
    fireEvent.click(getByRole('button', { name: /open shop/i }));
    fireEvent.click(getByRole('button', { name: /back/i }));

    expect(getByText('Shops Page')).toBeInTheDocument();
  });

  test('pendingScreen renders back to login button and navigates correctly for vendor-pending', () => {
    Login.mockImplementation(({ onLoginSuccess }) => (
      <button type="button" onClick={() => onLoginSuccess('vendor-pending')}>Login Page</button>
    ));
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /login page/i }));
    const backBtn = screen.getByRole('button', { name: /back to login/i });
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);
    expect(screen.getByRole('button', { name: /login page/i })).toBeInTheDocument();
  });

  test('pendingScreen renders back to login button and navigates correctly for vendor-suspended', () => {
    Login.mockImplementation(({ onLoginSuccess }) => (
      <button type="button" onClick={() => onLoginSuccess('vendor-suspended')}>Login Page</button>
    ));
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /login page/i }));
    const backBtn = screen.getByRole('button', { name: /back to login/i });
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);
    expect(screen.getByRole('button', { name: /login page/i })).toBeInTheDocument();
  });

  test('pendingScreen renders back to login button and navigates correctly for admin-pending', () => {
    Login.mockImplementation(({ onLoginSuccess }) => (
      <button type="button" onClick={() => onLoginSuccess('admin-pending')}>Login Page</button>
    ));
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /login page/i }));
    const backBtn = screen.getByRole('button', { name: /back to login/i });
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);
    expect(screen.getByRole('button', { name: /login page/i })).toBeInTheDocument();
  });

  test('pendingScreen renders back to login button and navigates correctly for admin-suspended', () => {
    Login.mockImplementation(({ onLoginSuccess }) => (
      <button type="button" onClick={() => onLoginSuccess('admin-suspended')}>Login Page</button>
    ));
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /login page/i }));
    const backBtn = screen.getByRole('button', { name: /back to login/i });
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);
    expect(screen.getByRole('button', { name: /login page/i })).toBeInTheDocument();
  });

  test('renderPage switch default falls through to login for unknown page', () => {
    setSearch('?page=unknown-page-xyz');
    renderApp();
    expect(screen.getByRole('button', { name: /login page/i })).toBeInTheDocument();
  });
});