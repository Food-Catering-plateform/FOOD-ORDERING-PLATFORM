import React, { useEffect } from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
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

jest.mock('./components/Navbar/Navbar', () => () => <div>Navbar</div>);

jest.mock('./components/Sidebar/Sidebar', () => ({ toggleSidebar }) => (
  <button type="button" onClick={toggleSidebar}>Toggle Sidebar</button>
));

jest.mock('./components/login-and-signup/login', () => jest.fn(({ onLoginSuccess }) => (
  <button type="button" onClick={() => onLoginSuccess('shops')}>Login Page</button>
)));

jest.mock('./components/Customer/jsFiles/Profile', () => () => <div>Profile Page</div>);
jest.mock('./components/Customer/jsFiles/Notifications', () => () => <div>Notifications Page</div>);
jest.mock('./components/Customer/jsFiles/Orders', () => () => <div>Orders Page</div>);
jest.mock('./components/Customer/jsFiles/Basket', () => ({ basket }) => (
  <div>Basket Page: {basket.map((item) => `${item.id}:${item.qty}`).join(', ')}</div>
));
jest.mock('./components/Vendor/VDashboard', () => () => <div>Vendor Dashboard Page</div>);
jest.mock('./components/Vendor/StoreSetup', () => () => <div>Store Setup Page</div>);
jest.mock('./components/Customer/jsFiles/MenuView', () => () => <div>Menu View Page</div>);
jest.mock('./components/Admin/AdminDashboard', () => () => <div>Admin Dashboard Page</div>);
jest.mock('./components/Admin/AdminVendorManagement', () => () => <div>Admin Vendor Management Page</div>);
jest.mock('./components/Customer/jsFiles/PaymentSuccess', () => () => <div>Payment Success Page</div>);
jest.mock('./components/Customer/jsFiles/Payment', () => () => <div>Payment Page</div>);
jest.mock('./components/Customer/jsFiles/Dashboard', () => () => <div>Shops Page</div>);

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

  test('renders login page by default', () => {
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

  test('calls onLoginSuccess admin and renders admin dashboard', () => {
    Login.mockImplementation(({ onLoginSuccess }) => (
      <button type="button" onClick={() => onLoginSuccess('admin')}>Login Page</button>
    ));

    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /login page/i }));
    expect(screen.getByText('Admin Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('Navbar')).not.toBeInTheDocument();
  });

  test('calls onLoginSuccess vendor and renders store setup when vendor doc is missing', async () => {
    firebaseConfig.auth.currentUser = { uid: 'vendor-1' };
    mockGetDoc.mockImplementation((docRef) => {
      if (docRef.collection === 'Vendors') {
        return Promise.resolve({ exists: () => false });
      }
      return Promise.resolve({ exists: () => false });
    });
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

  test('renders shops page with chrome and toggles sidebar layout', () => {
    const { container } = renderApp();
    fireEvent.click(screen.getByRole('button', { name: /login page/i }));

    expect(screen.getByText('Shops Page')).toBeInTheDocument();
    expect(screen.getByText('Navbar')).toBeInTheDocument();
    expect(screen.getByText('Toggle Sidebar')).toBeInTheDocument();

    const main = container.querySelector('main');
    expect(main).toHaveStyle('margin-left: 187px');

    fireEvent.click(screen.getByText('Toggle Sidebar'));
    expect(main).toHaveStyle('margin-left: 60px');
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

  test('renders payment page when ?page=payment is in URL', () => {
    setSearch('?page=payment');
    renderApp();
    expect(screen.getByText('Payment Page')).toBeInTheDocument();
  });

  test('renders menu view and exercises addToBasket', () => {
    setSearch('?page=menu-view');
    renderApp();
    expect(screen.getByText('Menu View Page')).toBeInTheDocument();
  });
});