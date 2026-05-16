/** @jest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

jest.mock('./AdminVendorManagement.css', () => ({}));

const mockFetchAllVendors = jest.fn();
const mockApproveVendor = jest.fn();
const mockSuspendVendor = jest.fn();
const mockFetchAllAdmins = jest.fn();
const mockApproveAdmin = jest.fn();
const mockSuspendAdmin = jest.fn();

jest.mock('../../Services/vendorService', () => ({
  fetchAllVendors:    (...args) => mockFetchAllVendors(...args),
  approveVendor:      (...args) => mockApproveVendor(...args),
  suspendVendor:      (...args) => mockSuspendVendor(...args),
  fetchAllAdmins:     (...args) => mockFetchAllAdmins(...args),
  approveAdmin:       (...args) => mockApproveAdmin(...args),
  suspendAdmin:       (...args) => mockSuspendAdmin(...args),
}));

import AdminVendorManagement from './AdminVendorManagement';

const VENDORS = [
  { id: 'v1', businessName: 'Tasty Bites', email: 'tasty@test.com', status: 'pending' },
  { id: 'v2', businessName: 'Spice Garden', email: 'spice@test.com', status: 'approved' },
  { id: 'v3', businessName: 'Quick Eats', email: 'quick@test.com', status: 'suspended' },
];

const ADMINS = [
  { id: 'a1', name: 'Alice', lastName: 'Admin', email: 'alice@test.com', status: 'pending' },
];

describe('AdminVendorManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchAllVendors.mockResolvedValue(VENDORS);
    mockFetchAllAdmins.mockResolvedValue(ADMINS);
    mockApproveVendor.mockResolvedValue();
    mockSuspendVendor.mockResolvedValue();
    mockApproveAdmin.mockResolvedValue();
    mockSuspendAdmin.mockResolvedValue();
  });

  test('renders vendor table after loading and shows counts', async () => {
    render(<AdminVendorManagement setActivePage={jest.fn()} />);

    // Initially shows loading
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Wait for vendors to appear
    await waitFor(() => expect(screen.getByText('Tasty Bites')).toBeInTheDocument());
    expect(screen.getByText('Spice Garden')).toBeInTheDocument();
    expect(screen.getByText('Quick Eats')).toBeInTheDocument();

    // Tab counts show vendor/admin lengths
    expect(screen.getByText('Vendors')).toBeInTheDocument();
    expect(screen.getByText('Admin Requests')).toBeInTheDocument();
    expect(screen.getAllByText(/\d+/).length).toBeGreaterThan(0);
  });

  test('shows correct status badges and action buttons', async () => {
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => screen.getByText('Tasty Bites'));

    // Status badges (may appear in tabs and rows)
    expect(screen.getAllByText(/Pending/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Approved/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Suspended/i).length).toBeGreaterThanOrEqual(1);

    // Buttons exist for non-approved and non-suspended items
    const approveBtn = screen.getByRole('button', { name: /Approve tasty@test\.com/i });
    const suspendBtn = screen.getByRole('button', { name: /Suspend tasty@test\.com/i });
    expect(approveBtn).toBeEnabled();
    expect(suspendBtn).toBeEnabled();
  });

  test('back button calls setActivePage with admin-dashboard', async () => {
    const mockSet = jest.fn();
    render(<AdminVendorManagement setActivePage={mockSet} />);
    await waitFor(() => screen.getByText('Tasty Bites'));
    fireEvent.click(screen.getByText(/Back to Dashboard/i));
    expect(mockSet).toHaveBeenCalledWith('admin-dashboard');
  });

  test('renders placeholder for missing businessName and email and shows Pending when status falsy', async () => {
    // Prepare vendor with missing fields
    mockFetchAllVendors.mockResolvedValueOnce([
      { id: 'vx', businessName: '', email: '', status: null },
    ]);
    mockFetchAllAdmins.mockResolvedValueOnce([]);

    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    // Wait for table to render
    await waitFor(() => screen.getByRole('table'));
    const table = screen.getByRole('table');
    const rows = table.querySelectorAll('tbody tr');
    expect(rows.length).toBeGreaterThan(0);
    const firstRow = rows[0];
    // within the first row, expect placeholders
    expect(firstRow.querySelector('strong.avm-vendor-name').textContent).toBe('—');
    expect(firstRow.querySelectorAll('td')[1].textContent).toBe('—');
    // There should be a Pending mark when status is falsy
    expect(table.querySelector('mark.avm-badge').textContent).toMatch(/Pending/i);
  });

  test('shows loading indicator "..." on action button while awaiting service', async () => {
    // make approve resolve only when we call resolver
    let resolveApprove;
    mockApproveVendor.mockImplementation(() => new Promise(r => { resolveApprove = r; }));

    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => screen.getByText('Tasty Bites'));

    const approveBtn = screen.getByRole('button', { name: /Approve tasty@test\.com/i });
    fireEvent.click(approveBtn);

    // Immediately after clicking, the approve button itself should show "..."
    expect(approveBtn.textContent).toBe('...');

    // Finish the approve operation
    resolveApprove();
    await waitFor(() => expect(mockApproveVendor).toHaveBeenCalledWith('v1'));
  });

  test('approve vendor calls service and updates row to approved', async () => {
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => screen.getByText('Tasty Bites'));

    const approveBtn = screen.getByRole('button', { name: /Approve tasty@test\.com/i });
    fireEvent.click(approveBtn);

    await waitFor(() => expect(mockApproveVendor).toHaveBeenCalledWith('v1'));

    // After approve, the Approve button should no longer be present (status updated)
    await waitFor(() => expect(screen.queryByRole('button', { name: /Approve tasty@test\.com/i })).not.toBeInTheDocument());
    expect(screen.getAllByText(/Approved/i).length).toBeGreaterThanOrEqual(1);
  });

  test('suspend vendor calls service and updates row to suspended', async () => {
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => screen.getByText('Tasty Bites'));

    const suspendBtn = screen.getByRole('button', { name: /Suspend tasty@test\.com/i });
    fireEvent.click(suspendBtn);

    await waitFor(() => expect(mockSuspendVendor).toHaveBeenCalledWith('v1'));
    await waitFor(() => expect(screen.queryByRole('button', { name: /Suspend tasty@test\.com/i })).not.toBeInTheDocument());
    expect(screen.getAllByText(/Suspended/i).length).toBeGreaterThanOrEqual(1);
  });

  test('switch to Admin Requests and approve admin', async () => {
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => screen.getByText('Tasty Bites'));

    // Click Admin Requests tab
    fireEvent.click(screen.getByRole('button', { name: /Admin Requests/i }));
    await waitFor(() => screen.getByText('Alice Admin'));

    const approveAdminBtn = screen.getByRole('button', { name: /Approve alice@test\.com/i });
    fireEvent.click(approveAdminBtn);

    await waitFor(() => expect(mockApproveAdmin).toHaveBeenCalledWith('a1'));
    await waitFor(() => expect(screen.queryByRole('button', { name: /Approve alice@test\.com/i })).not.toBeInTheDocument());
  });

  test('admin placeholder when name/lastName missing and suspend admin works', async () => {
    mockFetchAllVendors.mockResolvedValueOnce([]);
    mockFetchAllAdmins.mockResolvedValueOnce([{ id: 'a2', name: '', lastName: '', email: 'no@test.com', status: null }]);

    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    // switch to admin tab (vendors list is empty here)
    fireEvent.click(screen.getByRole('button', { name: /Admin Requests/i }));
    await waitFor(() => screen.getByRole('table'));
    await waitFor(() => screen.getByText('—'));
    // suspend admin
    const suspendBtn = screen.getByRole('button', { name: /Suspend no@test\.com/i });
    fireEvent.click(suspendBtn);
    await waitFor(() => expect(mockSuspendAdmin).toHaveBeenCalledWith('a2'));
  });

  test('filter by status shows only matching rows', async () => {
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => screen.getByText('Tasty Bites'));

    // Click Suspended filter
    fireEvent.click(screen.getByRole('button', { name: /Suspended/i }));
    await waitFor(() => expect(screen.getByText(/Quick Eats/i)).toBeInTheDocument());
    // Tasty Bites (pending) should not be visible
    expect(screen.queryByText(/Tasty Bites/i)).not.toBeInTheDocument();
  });

  test('shows error when fetch fails', async () => {
    mockFetchAllVendors.mockRejectedValueOnce(new Error('Network error'));
    render(<AdminVendorManagement setActivePage={jest.fn()} />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent(/Failed to load data/i);
  });

  test('shows loading when fetch never resolves', () => {
    mockFetchAllVendors.mockReturnValue(new Promise(() => {}));
    mockFetchAllAdmins.mockReturnValue(new Promise(() => {}));
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  test('approve vendor failure resets actionLoading and logs error', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockApproveVendor.mockRejectedValueOnce(new Error('boom'));
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => screen.getByText('Tasty Bites'));

    const approveBtn = screen.getByRole('button', { name: /Approve tasty@test\.com/i });
    fireEvent.click(approveBtn);

    await waitFor(() => expect(mockApproveVendor).toHaveBeenCalledWith('v1'));
    // after rejection, button should be back to showing Approve (actionLoading cleared)
    await waitFor(() => expect(screen.getByRole('button', { name: /Approve tasty@test\.com/i })).toBeInTheDocument());
    spy.mockRestore();
  });

  test('suspend vendor failure resets actionLoading and logs error', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSuspendVendor.mockRejectedValueOnce(new Error('boom'));
    render(<AdminVendorManagement setActivePage={jest.fn()} />);
    await waitFor(() => screen.getByText('Tasty Bites'));

    const suspendBtn = screen.getByRole('button', { name: /Suspend tasty@test\.com/i });
    fireEvent.click(suspendBtn);

    await waitFor(() => expect(mockSuspendVendor).toHaveBeenCalledWith('v1'));
    await waitFor(() => expect(screen.getByRole('button', { name: /Suspend tasty@test\.com/i })).toBeInTheDocument());
    spy.mockRestore();
  });
});    
