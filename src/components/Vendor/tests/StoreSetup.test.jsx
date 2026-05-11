import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StoreSetup from '../StoreSetup';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../../Services/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../Firebase/firebaseConfig', () => ({ db: {}, auth: {} }));
jest.mock('firebase/firestore', () => ({
  doc:    jest.fn(),
  setDoc: jest.fn(),
}));
jest.mock('firebase/auth', () => ({
  signOut: jest.fn(),
}));
jest.mock('../StoreSetup.css', () => ({}));

import { useAuth } from '../../../Services/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

const VENDOR_ID = 'vendor-xyz';

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ vendorId: VENDOR_ID });
  doc.mockReturnValue('doc-ref');
  setDoc.mockResolvedValue();
  signOut.mockResolvedValue();
  global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fillStep0(
  name = "Mama's Kitchen",
  category = 'Fast Food',
  description = 'Best food in town'
) {
  await userEvent.type(screen.getByPlaceholderText(/mama's kitchen/i), name);
  await userEvent.selectOptions(screen.getByRole('combobox'), category);
  await userEvent.type(screen.getByPlaceholderText(/tell customers/i), description);
}

async function fillStep1(address = '12 Main St, Soweto', phone = '011 123 4567') {
  await userEvent.type(screen.getByPlaceholderText(/12 main street/i), address);
  await userEvent.type(screen.getByPlaceholderText(/011 123 4567/i), phone);
}

async function goToStep1() {
  render(<StoreSetup />);
  await fillStep0();
  await userEvent.click(screen.getByRole('button', { name: /next/i }));
}

async function goToStep2() {
  await goToStep1();
  await fillStep1();
  await userEvent.click(screen.getByRole('button', { name: /next/i }));
}

async function goToStep3() {
  await goToStep2();
  await userEvent.click(screen.getByRole('button', { name: /next/i }));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StoreSetup – rendering', () => {
  it('shows loading when vendorId is absent', () => {
    useAuth.mockReturnValue({ vendorId: null });
    render(<StoreSetup />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders the setup heading', () => {
    render(<StoreSetup />);
    expect(screen.getByRole('heading', { name: /set up your store/i })).toBeInTheDocument();
  });

  it('renders all four step labels in the progress indicator', () => {
    render(<StoreSetup />);
    ['Basic Info', 'Location & Hours', 'Branding', 'Review'].forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('starts on step 0 – Basic Information', () => {
    render(<StoreSetup />);
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/mama's kitchen/i)).toBeInTheDocument();
  });

  it('renders all category options in the select', () => {
    render(<StoreSetup />);
    const options = screen.getAllByRole('option');
    const labels = options.map(o => o.textContent);
    expect(labels).toContain('Fast Food');
    expect(labels).toContain('Halal');
    expect(labels).toContain('Vegetarian');
  });

  it('shows a character counter for description', () => {
    render(<StoreSetup />);
    expect(screen.getByText('0/200')).toBeInTheDocument();
  });

  it('updates the character counter as description is typed', async () => {
    render(<StoreSetup />);
    await userEvent.type(screen.getByPlaceholderText(/tell customers/i), 'Hello');
    expect(screen.getByText('5/200')).toBeInTheDocument();
  });

  it('renders an Exit button on step 0', () => {
    render(<StoreSetup />);
    expect(screen.getByRole('button', { name: /exit/i })).toBeInTheDocument();
  });

  it('does not render the Back button on step 0', () => {
    render(<StoreSetup />);
    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('StoreSetup – step 0 validation', () => {
  it('shows an error if store name is empty on Next', async () => {
    render(<StoreSetup />);
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Store name is required')).toBeInTheDocument();
  });

  it('shows an error if category is not selected on Next', async () => {
    render(<StoreSetup />);
    await userEvent.type(screen.getByPlaceholderText(/mama's kitchen/i), 'My Store');
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Please select a category')).toBeInTheDocument();
  });

  it('shows an error if description is empty on Next', async () => {
    render(<StoreSetup />);
    await userEvent.type(screen.getByPlaceholderText(/mama's kitchen/i), 'My Store');
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Fast Food');
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Add a short description')).toBeInTheDocument();
  });

  it('does not show errors when all step 0 fields are filled', async () => {
    render(<StoreSetup />);
    await fillStep0();
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.queryByText('Store name is required')).not.toBeInTheDocument();
  });

  it('advances to step 1 when step 0 is valid', async () => {
    render(<StoreSetup />);
    await fillStep0();
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Location & Hours')).toBeInTheDocument();
  });

  it('clears a validation error after the field is corrected', async () => {
    render(<StoreSetup />);
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Store name is required')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(/mama's kitchen/i), 'My Store');
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Fast Food');
    await userEvent.type(screen.getByPlaceholderText(/tell customers/i), 'Great food');
    await userEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.queryByText('Store name is required')).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('StoreSetup – step 1 (Location & Hours)', () => {
  it('shows the Location & Hours fieldset on step 1', async () => {
    await goToStep1();
    expect(screen.getByPlaceholderText(/12 main street/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/011 123 4567/i)).toBeInTheDocument();
  });

  it('shows address error if address is empty on Next', async () => {
    await goToStep1();
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Address is required')).toBeInTheDocument();
  });

  it('shows phone error if phone is empty on Next', async () => {
    await goToStep1();
    await userEvent.type(screen.getByPlaceholderText(/12 main street/i), '5 Church St');
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Contact number is required')).toBeInTheDocument();
  });

  it('renders all 7 days in the hours grid', async () => {
    await goToStep1();
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(day => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
  });

  it('hides time inputs when a day is marked as closed', async () => {
    await goToStep1();
    const timeInputsBefore = document.querySelectorAll('input[type="time"]');
    await userEvent.click(screen.getAllByRole('checkbox')[0]);
    const timeInputsAfter = document.querySelectorAll('input[type="time"]');
    expect(timeInputsAfter.length).toBe(timeInputsBefore.length - 2);
  });

  it('navigates back to step 0 when Back is clicked', async () => {
    await goToStep1();
    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
  });

  it('advances to step 2 (Branding) when step 1 is valid', async () => {
    await goToStep1();
    await fillStep1();
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Branding')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('StoreSetup – step 2 (Branding)', () => {
  it('renders the Branding fieldset on step 2', async () => {
    await goToStep2();
    expect(screen.getByText('Store Logo')).toBeInTheDocument();
    expect(screen.getByText('Store Banner')).toBeInTheDocument();
  });

  it('shows upload placeholders before any file is chosen', async () => {
    await goToStep2();
    expect(screen.getByText('Click to upload logo')).toBeInTheDocument();
    expect(screen.getByText('Click to upload banner image')).toBeInTheDocument();
  });

  it('shows a logo preview after a file is uploaded', async () => {
    await goToStep2();
    const [logoInput] = document.querySelectorAll('input[type="file"]');
    const file = new File(['img'], 'logo.png', { type: 'image/png' });
    await userEvent.upload(logoInput, file);
    expect(screen.getByAltText('Logo preview')).toBeInTheDocument();
  });

  it('shows a banner preview after a file is uploaded', async () => {
    await goToStep2();
    const [, bannerInput] = document.querySelectorAll('input[type="file"]');
    const file = new File(['img'], 'banner.png', { type: 'image/png' });
    await userEvent.upload(bannerInput, file);
    expect(screen.getByAltText('Banner preview')).toBeInTheDocument();
  });

  it('navigates back to step 1 when Back is clicked', async () => {
    await goToStep2();
    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByPlaceholderText(/12 main street/i)).toBeInTheDocument();
  });

  it('advances to the Review step when Next is clicked', async () => {
    await goToStep2();
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByRole('heading', { name: /review your store/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('StoreSetup – step 3 (Review & Submit)', () => {
  async function goToStep3WithData() {
    render(<StoreSetup />);
    await fillStep0("Mama's Kitchen", 'Fast Food', 'Best in town');
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await fillStep1('12 Main St', '011 000 0000');
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
  }

  it('shows the entered store name in the review', async () => {
    await goToStep3WithData();
    expect(screen.getByText("Mama's Kitchen")).toBeInTheDocument();
  });

  it('shows the entered address in the review', async () => {
    await goToStep3WithData();
    expect(screen.getByText('12 Main St')).toBeInTheDocument();
  });

  it('shows the entered phone in the review', async () => {
    await goToStep3WithData();
    expect(screen.getByText('011 000 0000')).toBeInTheDocument();
  });

  it('shows operating hours for each day in the review', async () => {
    await goToStep3WithData();
    expect(screen.getByText('08:00 – 20:00')).toBeInTheDocument();
  });

  it('shows "Closed" for a day that was marked closed', async () => {
    render(<StoreSetup />);
    await fillStep0("Mama's Kitchen", 'Fast Food', 'Best in town');
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await userEvent.click(screen.getAllByRole('checkbox')[0]);
    await fillStep1('12 Main St', '011 000 0000');
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('shows the "Launch Store" button on the final step', async () => {
    await goToStep3WithData();
    expect(screen.getByRole('button', { name: /launch store/i })).toBeInTheDocument();
  });

  it('navigates back to step 2 when Back is clicked on step 3', async () => {
    await goToStep3WithData();
    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByText('Store Logo')).toBeInTheDocument();
  });

  it('calls setDoc with correct fields on submit', async () => {
    await goToStep3WithData();
    await userEvent.click(screen.getByRole('button', { name: /launch store/i }));

    await waitFor(() => expect(setDoc).toHaveBeenCalledTimes(1));
    expect(setDoc).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({
        businessName:     "Mama's Kitchen",
        category:         'Fast Food',
        description:      'Best in town',
        address:          '12 Main St',
        phoneNumber:      '011 000 0000',
        status:           'pending',
        storeInitialized: true,
      }),
      { merge: true }
    );
  });

  it('includes hours data in the setDoc call', async () => {
    await goToStep3WithData();
    await userEvent.click(screen.getByRole('button', { name: /launch store/i }));

    await waitFor(() => expect(setDoc).toHaveBeenCalled());
    expect(setDoc).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({
        hours: expect.objectContaining({
          Monday: expect.objectContaining({ open: '08:00', close: '20:00', closed: false }),
        }),
      }),
      { merge: true }
    );
  });

  it('calls signOut after setDoc on submit', async () => {
    await goToStep3WithData();
    await userEvent.click(screen.getByRole('button', { name: /launch store/i }));

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(setDoc).toHaveBeenCalledBefore
      ? expect(setDoc).toHaveBeenCalledBefore(signOut)
      : expect(setDoc.mock.invocationCallOrder[0]).toBeLessThan(signOut.mock.invocationCallOrder[0]);
  });

  it('calls onComplete callback after successful submit', async () => {
    const onComplete = jest.fn();
    render(<StoreSetup onComplete={onComplete} />);
    await fillStep0("Mama's Kitchen", 'Fast Food', 'Best in town');
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await fillStep1('12 Main St', '011 000 0000');
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await userEvent.click(screen.getByRole('button', { name: /launch store/i }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  });

  it('does not call setDoc if vendorId is null', () => {
    useAuth.mockReturnValue({ vendorId: null });
    render(<StoreSetup />);
    expect(setDoc).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('StoreSetup – Exit button', () => {
  it('calls signOut and onCancel when Exit is clicked on step 0', async () => {
    const onCancel = jest.fn();
    render(<StoreSetup onCancel={onCancel} />);

    await userEvent.click(screen.getByRole('button', { name: /exit/i }));

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
  });
});