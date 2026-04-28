import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock("./Firebase/firebaseConfig", () => ({
  auth: {},
  db: {},
}));

jest.mock("firebase/auth", () => ({
  onAuthStateChanged: (auth, callback) => {
    callback(null);
    return () => {};
  },
  GoogleAuthProvider: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signInWithPopup: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
}));

// Mock all page components so tests are fast and isolated
jest.mock("./components/Customer/jsFiles/PaymentSuccess", () => () => (
  <div>Payment Success Page</div>
));
jest.mock("./components/Customer/jsFiles/Payment", () => () => (
  <div>Payment Page</div>
));
jest.mock("./components/Customer/jsFiles/Shops",   () => () => <div>Shops Page</div>);
jest.mock("./components/Customer/jsFiles/Orders",  () => () => <div>Orders Page</div>);
jest.mock("./components/Customer/jsFiles/Basket",  () => () => <div>Basket Page</div>);
jest.mock("./components/Navbar/Navbar",            () => () => <div>Navbar</div>);
jest.mock("./components/Sidebar/Sidebar",          () => () => <div>Sidebar</div>);

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Helper to set window.location.search for redirect tests
const setSearch = (search) => {
  delete window.location;
  window.location = { search, pathname: '/', href: `http://localhost/${search}` };
};

const clearSearch = () => setSearch('');

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('App Component', () => {

  beforeEach(() => {
    clearSearch();
    jest.clearAllMocks();
  });

  test('shows login page by default', async () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    const heading = await screen.findByRole('heading', { name: /welcome back/i });
    expect(heading).toBeInTheDocument();
  });

  test('shows PaymentSuccess page when ?page=payment-success is in URL', async () => {
    setSearch('?page=payment-success');
    render(<MemoryRouter><App /></MemoryRouter>);
    expect(await screen.findByText('Payment Success Page')).toBeInTheDocument();
  });

  test('does not show login page on payment-success redirect', async () => {
    setSearch('?page=payment-success');
    render(<MemoryRouter><App /></MemoryRouter>);
    await screen.findByText('Payment Success Page');
    expect(screen.queryByRole('heading', { name: /welcome back/i })).not.toBeInTheDocument();
  });

  test('does not show Navbar or Sidebar on payment-success page', async () => {
    setSearch('?page=payment-success');
    render(<MemoryRouter><App /></MemoryRouter>);
    await screen.findByText('Payment Success Page');
    expect(screen.queryByText('Navbar')).not.toBeInTheDocument();
    expect(screen.queryByText('Sidebar')).not.toBeInTheDocument();
  });

  test('does not show Navbar or Sidebar on login page', async () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    await screen.findByRole('heading', { name: /welcome back/i });
    expect(screen.queryByText('Navbar')).not.toBeInTheDocument();
    expect(screen.queryByText('Sidebar')).not.toBeInTheDocument();
  });

});