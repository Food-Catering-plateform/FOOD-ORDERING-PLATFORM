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
});
