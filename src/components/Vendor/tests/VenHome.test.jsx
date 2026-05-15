import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('../VenHome.css', () => ({}));
jest.mock('../../../Firebase/firebaseConfig', () => ({
  db: {},
}));
jest.mock('../../../Services/AuthContext', () => ({
  useAuth: () => ({ vendorId: null }),
}));

import VenHome from '../VenHome';

const defaultProps = {
  setActiveSection: jest.fn(),
};

const renderVenHome = (props = {}) => render(<VenHome {...defaultProps} {...props} />);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('VenHome – rendering', () => {
  it('renders the subheading text', () => {
    renderVenHome();
    expect(screen.getByText(/quick look at how your store is doing/i)).toBeInTheDocument();
  });

  it('renders "Chef" as fallback when storeName is not provided', () => {
    renderVenHome();
    expect(screen.getByText(/chef/i)).toBeInTheDocument();
  });

  it('renders the given storeName in the greeting', () => {
    renderVenHome({ storeName: "Nando's" });
    expect(screen.getByText(/nando's/i)).toBeInTheDocument();
  });

  it('renders all four stat cards', () => {
    renderVenHome();
    expect(screen.getByText('New Orders')).toBeInTheDocument();
    expect(screen.getByText('Menu Items')).toBeInTheDocument();
    expect(screen.getByText("Today's Revenue")).toBeInTheDocument();
    expect(screen.getByText('Customers Served')).toBeInTheDocument();
  });

  it('renders zero values for all stats', () => {
    renderVenHome();
    expect(screen.getByText('R 0.00')).toBeInTheDocument();
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(3);
  });

  it('renders the tip section', () => {
    renderVenHome();
    expect(screen.getByText(/peak hours tip/i)).toBeInTheDocument();
    expect(screen.getByText(/orders spike between 12–2 PM/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('VenHome – time-based greeting', () => {
  const RealDate = Date;

  function mockHour(hour) {
    jest.spyOn(global, 'Date').mockImplementation((...args) => {
      if (args.length) return new RealDate(...args);
      const d = new RealDate();
      d.getHours = () => hour;
      return d;
    });
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows "Good morning" for hours before 12', () => {
    mockHour(9);
    renderVenHome({ storeName: 'Test Store' });
    expect(screen.getByText(/good morning/i)).toBeInTheDocument();
  });

  it('shows "Good afternoon" for hours between 12 and 16', () => {
    mockHour(14);
    renderVenHome({ storeName: 'Test Store' });
    expect(screen.getByText(/good afternoon/i)).toBeInTheDocument();
  });

  it('shows "Good evening" for hours 17 and above', () => {
    mockHour(19);
    renderVenHome({ storeName: 'Test Store' });
    expect(screen.getByText(/good evening/i)).toBeInTheDocument();
  });

  it('shows "Good afternoon" exactly at hour 12', () => {
    mockHour(12);
    renderVenHome({ storeName: 'Test Store' });
    expect(screen.getByText(/good afternoon/i)).toBeInTheDocument();
  });

  it('shows "Good evening" exactly at hour 17', () => {
    mockHour(17);
    renderVenHome({ storeName: 'Test Store' });
    expect(screen.getByText(/good evening/i)).toBeInTheDocument();
  });
});