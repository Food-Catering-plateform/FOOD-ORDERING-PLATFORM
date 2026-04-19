import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VDashboard from '../VDashboard';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../../Firebase/firebaseConfig', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  doc:    jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
}));
jest.mock('../VDashboard.css', () => ({}));

jest.mock('../VenHome',        () => ({ storeName }) => <div>VenHome: {storeName || 'Chef'}</div>);
jest.mock('../MenuManagement', () => () => <div>MenuManagement</div>);
jest.mock('../Orders',         () => () => <div>Orders</div>);
jest.mock('../Analytics',      () => () => <div>Analytics</div>);
jest.mock('../AccSettings',    () => ({ storeData, onStoreUpdate }) =>
  <div>
    AccSettings
    <button onClick={() => onStoreUpdate({ businessName: 'Updated Store' })}>Save</button>
  </div>
);

import { doc, getDoc, setDoc } from 'firebase/firestore';

const UID = 'user-001';
const STORE_DATA = { name: "Mama's Kitchen", category: 'Fast Food' };

beforeEach(() => {
  jest.clearAllMocks();
  doc.mockReturnValue('doc-ref');
  getDoc.mockResolvedValue({ exists: () => true, data: () => STORE_DATA });
  setDoc.mockResolvedValue();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('VDashboard – rendering', () => {
  it('renders the sidebar with "Vendor Panel" title', async () => {
    render(<VDashboard uid={UID} />);
    expect(screen.getByText('Vendor Panel')).toBeInTheDocument();
  });

  it('renders all nav items in the sidebar', async () => {
    render(<VDashboard uid={UID} />);
    ['Dashboard', 'Menu Management', 'Orders', 'Analytics', 'Account Settings'].forEach(label => {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    });
  });

  it('renders VenHome as the default section', async () => {
    render(<VDashboard uid={UID} />);
    expect(screen.getByText(/VenHome/i)).toBeInTheDocument();
  });

  it('marks the Dashboard nav item as current page by default', async () => {
    render(<VDashboard uid={UID} />);
    const dashBtn = screen.getByRole('button', { name: 'Dashboard' });
    expect(dashBtn).toHaveAttribute('aria-current', 'page');
  });

  it('fetches store data from Firestore on mount', async () => {
    render(<VDashboard uid={UID} />);
    await waitFor(() => expect(getDoc).toHaveBeenCalledTimes(1));
  });

  it('does not fetch if uid is undefined', () => {
    render(<VDashboard uid={undefined} />);
    expect(getDoc).not.toHaveBeenCalled();
  });

  it('passes storeName to VenHome after fetch', async () => {
    render(<VDashboard uid={UID} />);
    await screen.findByText(/Mama's Kitchen/i);
    expect(screen.getByText(/Mama's Kitchen/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('VDashboard – navigation', () => {
  it('renders MenuManagement when Menu Management nav item is clicked', async () => {
    render(<VDashboard uid={UID} />);
    await userEvent.click(screen.getByRole('button', { name: 'Menu Management' }));
    expect(screen.getByText('MenuManagement')).toBeInTheDocument();
  });

  it('renders Orders when Orders nav item is clicked', async () => {
    render(<VDashboard uid={UID} />);
    await userEvent.click(screen.getByRole('button', { name: 'Orders' }));
    expect(screen.getByText('Orders')).toBeInTheDocument();
  });

  it('renders Analytics when Analytics nav item is clicked', async () => {
    render(<VDashboard uid={UID} />);
    await userEvent.click(screen.getByRole('button', { name: 'Analytics' }));
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('renders AccSettings when Account Settings nav item is clicked', async () => {
    render(<VDashboard uid={UID} />);
    await userEvent.click(screen.getByRole('button', { name: 'Account Settings' }));
    expect(screen.getByText('AccSettings')).toBeInTheDocument();
  });

  it('updates aria-current when a different nav item is selected', async () => {
    render(<VDashboard uid={UID} />);
    await userEvent.click(screen.getByRole('button', { name: 'Orders' }));
    expect(screen.getByRole('button', { name: 'Orders' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('VDashboard – sidebar toggle', () => {
  it('renders the toggle button', () => {
    render(<VDashboard uid={UID} />);
    expect(screen.getByRole('button', { name: /collapse sidebar/i })).toBeInTheDocument();
  });

  it('collapses the sidebar when toggle is clicked', async () => {
    render(<VDashboard uid={UID} />);
    await userEvent.click(screen.getByRole('button', { name: /collapse sidebar/i }));
    expect(screen.queryByText('Vendor Panel')).not.toBeInTheDocument();
  });

  it('changes toggle aria-label to "Expand sidebar" when collapsed', async () => {
    render(<VDashboard uid={UID} />);
    await userEvent.click(screen.getByRole('button', { name: /collapse sidebar/i }));
    expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();
  });

  it('shows single-character labels when sidebar is collapsed', async () => {
    render(<VDashboard uid={UID} />);
    await userEvent.click(screen.getByRole('button', { name: /collapse sidebar/i }));
    expect(screen.getByRole('button', { name: 'D' })).toBeInTheDocument();
  });

  it('re-expands the sidebar on a second toggle click', async () => {
    render(<VDashboard uid={UID} />);
    await userEvent.click(screen.getByRole('button', { name: /collapse sidebar/i }));
    await userEvent.click(screen.getByRole('button', { name: /expand sidebar/i }));
    expect(screen.getByText('Vendor Panel')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('VDashboard – store update', () => {
  it('calls setDoc when onStoreUpdate is triggered from AccSettings', async () => {
    render(<VDashboard uid={UID} />);
    await userEvent.click(screen.getByRole('button', { name: 'Account Settings' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(setDoc).toHaveBeenCalledTimes(1));
    expect(setDoc).toHaveBeenCalledWith('doc-ref', { businessName: 'Updated Store' });
  });

  it('updates local storeData state after onStoreUpdate', async () => {
    render(<VDashboard uid={UID} />);
    await userEvent.click(screen.getByRole('button', { name: 'Account Settings' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await userEvent.click(screen.getByRole('button', { name: 'Dashboard' }));
    expect(screen.getByText(/VenHome/i)).toBeInTheDocument();
  });
});