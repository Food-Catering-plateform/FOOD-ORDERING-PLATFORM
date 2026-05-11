import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccSettings from '../AccSettings';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../../Firebase/firebaseConfig', () => ({
  db:   {},
  auth: { currentUser: {} },
}));

jest.mock('firebase/firestore', () => ({
  doc:             jest.fn(),
  getDoc:          jest.fn(),
  setDoc:          jest.fn(),
  deleteDoc:       jest.fn(),
  serverTimestamp: jest.fn(() => 'mock-timestamp'),
}));

jest.mock('firebase/auth', () => ({
  deleteUser: jest.fn(),
}));

jest.mock('../AccSettings.css', () => ({}));

import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';

// ─── Mock data ────────────────────────────────────────────────────────────────

const VENDOR_ID = 'vendor-001';

const MOCK_VENDOR = {
  businessName: 'Red Dragon Burgers',
  category:     'Fast Food',
  description:  'Best burgers in town',
  address:      '123 Main Street',
  phoneNumber:  '0821234567',
  logoURL:      'https://example.com/logo.jpg',
  bannerURL:    'https://example.com/banner.jpg',
  hours: {
    Monday: { open: '08:00', close: '18:00', closed: false },
  },
};

const MOCK_USER = {
  fullName: 'Nicolene Smith',
  email:    'nico@email.com',
  contact:  '0831112222',
};

function setupGetDoc({ vendorExists = true, userExists = true, appExists = false, appData = null } = {}) {
  getDoc
    .mockResolvedValueOnce({ exists: () => vendorExists, data: () => MOCK_VENDOR })
    .mockResolvedValueOnce({ exists: () => userExists,   data: () => MOCK_USER   })
    .mockResolvedValueOnce({ exists: () => appExists,    data: () => appData     });
}

const DEFAULT_PROPS = {
  uid:           VENDOR_ID,
  onStoreUpdate: jest.fn(),
  onLogout:      jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  doc.mockReturnValue('doc-ref');
  setDoc.mockResolvedValue();
  deleteDoc.mockResolvedValue();
  deleteUser.mockResolvedValue();
  global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
  setupGetDoc();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AccSettings - loading', () => {
  it('shows a loading message before data resolves', () => {
    getDoc.mockReturnValue(new Promise(() => {}));
    render(<AccSettings {...DEFAULT_PROPS} />);
    expect(screen.getByText(/loading your settings/i)).toBeInTheDocument();
  });

  it('removes the loading message after data is fetched', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    await waitFor(() =>
      expect(screen.queryByText(/loading your settings/i)).not.toBeInTheDocument()
    );
  });

  it('does not fetch when uid is absent', () => {
    getDoc.mockClear();
    render(<AccSettings {...DEFAULT_PROPS} uid={null} />);
    expect(getDoc).not.toHaveBeenCalled();
  });
});

describe('AccSettings - rendering', () => {
  it('renders the Account Settings heading', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    expect(await screen.findByText('Account Settings')).toBeInTheDocument();
  });

  it('renders all four section headings', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    await screen.findByText('Account Settings');
    ['Store Details', 'Personal Details', 'Platform Access', 'Danger Zone'].forEach(heading => {
      expect(screen.getByText(heading)).toBeInTheDocument();
    });
  });

  it('renders the Save Changes button', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    expect(await screen.findByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('renders the Delete Account button', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    expect(await screen.findByRole('button', { name: /delete account/i })).toBeInTheDocument();
  });

  it('renders all 7 days in the hours grid', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    await screen.findByText('Account Settings');
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(day => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
  });

  it('renders logo and banner upload areas', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    await screen.findByText('Account Settings');
    expect(screen.getByAltText('Logo')).toBeInTheDocument();
    expect(screen.getByAltText('Banner')).toBeInTheDocument();
  });

  it('renders a character counter for description', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    await screen.findByText('Account Settings');
    expect(screen.getByText(`${MOCK_VENDOR.description.length}/200`)).toBeInTheDocument();
  });
});

describe('AccSettings - data loading into fields', () => {
  it('populates the store name field from Firestore', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    expect(await screen.findByDisplayValue('Red Dragon Burgers')).toBeInTheDocument();
  });

  it('populates the description field from Firestore', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    expect(await screen.findByDisplayValue('Best burgers in town')).toBeInTheDocument();
  });

  it('populates the address field from Firestore', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    expect(await screen.findByDisplayValue('123 Main Street')).toBeInTheDocument();
  });

  it('populates the store phone field from Firestore', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    expect(await screen.findByDisplayValue('0821234567')).toBeInTheDocument();
  });

  it('populates the full name field from Firestore', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    expect(await screen.findByDisplayValue('Nicolene Smith')).toBeInTheDocument();
  });

  it('populates the email field from Firestore', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    expect(await screen.findByDisplayValue('nico@email.com')).toBeInTheDocument();
  });

  it('populates the personal contact field from Firestore', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    expect(await screen.findByDisplayValue('0831112222')).toBeInTheDocument();
  });

  it('shows a logo image when logoURL is set', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    await screen.findByText('Account Settings');
    expect(screen.getByAltText('Logo')).toHaveAttribute('src', MOCK_VENDOR.logoURL);
  });

  it('shows a banner image when bannerURL is set', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    await screen.findByText('Account Settings');
    expect(screen.getByAltText('Banner')).toHaveAttribute('src', MOCK_VENDOR.bannerURL);
  });

  it('shows logo upload placeholder when no logoURL exists', async () => {
    getDoc
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ ...MOCK_VENDOR, logoURL: null }) })
      .mockResolvedValueOnce({ exists: () => true, data: () => MOCK_USER })
      .mockResolvedValueOnce({ exists: () => false, data: () => null });

    render(<AccSettings {...DEFAULT_PROPS} />);
    expect(await screen.findByText('Click to change logo')).toBeInTheDocument();
  });

  it('shows banner upload placeholder when no bannerURL exists', async () => {
    getDoc
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ ...MOCK_VENDOR, bannerURL: null }) })
      .mockResolvedValueOnce({ exists: () => true, data: () => MOCK_USER })
      .mockResolvedValueOnce({ exists: () => false, data: () => null });

    render(<AccSettings {...DEFAULT_PROPS} />);
    expect(await screen.findByText('Click to change banner')).toBeInTheDocument();
  });

  it('renders gracefully when vendor document does not exist', async () => {
    getDoc
      .mockResolvedValueOnce({ exists: () => false, data: () => null })
      .mockResolvedValueOnce({ exists: () => true,  data: () => MOCK_USER })
      .mockResolvedValueOnce({ exists: () => false, data: () => null });

    render(<AccSettings {...DEFAULT_PROPS} />);
    expect(await screen.findByText('Account Settings')).toBeInTheDocument();
  });

  it('renders gracefully when user document does not exist', async () => {
    getDoc
      .mockResolvedValueOnce({ exists: () => true,  data: () => MOCK_VENDOR })
      .mockResolvedValueOnce({ exists: () => false, data: () => null })
      .mockResolvedValueOnce({ exists: () => false, data: () => null });

    render(<AccSettings {...DEFAULT_PROPS} />);
    expect(await screen.findByText('Account Settings')).toBeInTheDocument();
  });
});

describe('AccSettings - store form editing', () => {
  it('updates the store name input', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    const input = await screen.findByDisplayValue('Red Dragon Burgers');
    await userEvent.clear(input);
    await userEvent.type(input, 'Blue Dragon');
    expect(input).toHaveValue('Blue Dragon');
  });

  it('updates the description textarea', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    const textarea = await screen.findByDisplayValue('Best burgers in town');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'New description');
    expect(textarea).toHaveValue('New description');
  });

  it('updates the character counter when description changes', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    const textarea = await screen.findByDisplayValue('Best burgers in town');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'Hi');
    expect(screen.getByText('2/200')).toBeInTheDocument();
  });

  it('updates the address input', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    const input = await screen.findByDisplayValue('123 Main Street');
    await userEvent.clear(input);
    await userEvent.type(input, '99 New Road');
    expect(input).toHaveValue('99 New Road');
  });

  it('updates the store phone input', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    const input = await screen.findByDisplayValue('0821234567');
    await userEvent.clear(input);
    await userEvent.type(input, '0719998888');
    expect(input).toHaveValue('0719998888');
  });

  it('updates the category select', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    await screen.findByText('Account Settings');
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Halal');
    expect(screen.getByRole('combobox')).toHaveValue('Halal');
  });
});

describe('AccSettings - personal details editing', () => {
  it('updates the full name input', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    const input = await screen.findByDisplayValue('Nicolene Smith');
    await userEvent.clear(input);
    await userEvent.type(input, 'Jane Doe');
    expect(input).toHaveValue('Jane Doe');
  });

  it('updates the email input', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    const input = await screen.findByDisplayValue('nico@email.com');
    await userEvent.clear(input);
    await userEvent.type(input, 'new@email.com');
    expect(input).toHaveValue('new@email.com');
  });

  it('updates the personal contact input', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    const input = await screen.findByDisplayValue('0831112222');
    await userEvent.clear(input);
    await userEvent.type(input, '0600001111');
    expect(input).toHaveValue('0600001111');
  });

  it('updates the current password field', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    await screen.findByText('Account Settings');
    const input = screen.getByPlaceholderText('Enter current password');
    await userEvent.type(input, 'secret123');
    expect(input).toHaveValue('secret123');
  });

  it('updates the new password field', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    await screen.findByText('Account Settings');
    const input = screen.getByPlaceholderText('New password');
    await userEvent.type(input, 'newpass456');
    expect(input).toHaveValue('newpass456');
  });

  it('updates the confirm password field', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    await screen.findByText('Account Settings');
    const input = screen.getByPlaceholderText('Repeat new password');
    await userEvent.type(input, 'newpass456');
    expect(input).toHaveValue('newpass456');
  });
});

describe('AccSettings - hours grid', () => {
  it('hides time inputs when a day is toggled to closed', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    await screen.findByText('Account Settings');
    const timeBefore = document.querySelectorAll('input[type="time"]').length;
    await userEvent.click(screen.getAllByRole('checkbox')[0]);
    const timeAfter = document.querySelectorAll('input[type="time"]').length;
    expect(timeAfter).toBe(timeBefore - 2);
  });

  it('shows time inputs again when a closed day is re-opened', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    await screen.findByText('Account Settings');
    const timeBefore = document.querySelectorAll('input[type="time"]').length;
    const checkbox = screen.getAllByRole('checkbox')[0];
    await userEvent.click(checkbox);
    await userEvent.click(checkbox);
    expect(document.querySelectorAll('input[type="time"]').length).toBe(timeBefore);
  });
});

describe('AccSettings - image upload', () => {
  it('shows a logo preview after a file is uploaded', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    await screen.findByText('Account Settings');
    const [logoInput] = document.querySelectorAll('input[type="file"]');
    const file = new File(['img'], 'logo.png', { type: 'image/png' });
    await userEvent.upload(logoInput, file);
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    expect(screen.getByAltText('Logo')).toHaveAttribute('src', 'blob:mock-url');
  });

  it('shows a banner preview after a file is uploaded', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    await screen.findByText('Account Settings');
    const [, bannerInput] = document.querySelectorAll('input[type="file"]');
    const file = new File(['img'], 'banner.png', { type: 'image/png' });
    await userEvent.upload(bannerInput, file);
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    expect(screen.getByAltText('Banner')).toHaveAttribute('src', 'blob:mock-url');
  });
});

describe('AccSettings - save changes', () => {
  it('calls onStoreUpdate when Save Changes is clicked', async () => {
    const onStoreUpdate = jest.fn();
    render(<AccSettings {...DEFAULT_PROPS} onStoreUpdate={onStoreUpdate} />);

    await userEvent.click(await screen.findByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(onStoreUpdate).toHaveBeenCalledTimes(1));
  });

  it('passes the current store form values to onStoreUpdate', async () => {
    const onStoreUpdate = jest.fn();
    render(<AccSettings {...DEFAULT_PROPS} onStoreUpdate={onStoreUpdate} />);
    await screen.findByDisplayValue('Red Dragon Burgers');

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(onStoreUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Red Dragon Burgers', phone: '0821234567' })
      )
    );
  });

  it('shows a success toast after saving', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);

    await userEvent.click(await screen.findByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(screen.getByText(/changes saved successfully/i)).toBeInTheDocument()
    );
  });

  it('hides the toast after 3 seconds', async () => {
    jest.useFakeTimers();
    render(<AccSettings {...DEFAULT_PROPS} />);

    await userEvent.click(await screen.findByRole('button', { name: /save changes/i }));
    expect(screen.getByText(/changes saved successfully/i)).toBeInTheDocument();

    jest.advanceTimersByTime(3000);
    await waitFor(() =>
      expect(screen.queryByText(/changes saved successfully/i)).not.toBeInTheDocument()
    );
    jest.useRealTimers();
  });

  it('passes updated store name to onStoreUpdate after editing', async () => {
    const onStoreUpdate = jest.fn();
    render(<AccSettings {...DEFAULT_PROPS} onStoreUpdate={onStoreUpdate} />);

    const input = await screen.findByDisplayValue('Red Dragon Burgers');
    await userEvent.clear(input);
    await userEvent.type(input, 'Blue Dragon');

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(onStoreUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Blue Dragon' })
      )
    );
  });
});

describe('AccSettings - Platform Access (admin application)', () => {
  it('renders the admin application textarea and button', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    await screen.findByText('Account Settings');
    expect(screen.getByPlaceholderText(/briefly describe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit application/i })).toBeInTheDocument();
  });

  it('Submit Application button is disabled when textarea is empty', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    await screen.findByText('Account Settings');
    expect(screen.getByRole('button', { name: /submit application/i })).toBeDisabled();
  });

  it('Submit Application button becomes enabled after typing a message', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    await screen.findByText('Account Settings');
    await userEvent.type(screen.getByPlaceholderText(/briefly describe/i), 'I want to help');
    expect(screen.getByRole('button', { name: /submit application/i })).not.toBeDisabled();
  });

  it('calls setDoc with correct data when application is submitted', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    await screen.findByText('Account Settings');

    await userEvent.type(screen.getByPlaceholderText(/briefly describe/i), 'I want to help manage');
    await userEvent.click(screen.getByRole('button', { name: /submit application/i }));

    await waitFor(() => expect(setDoc).toHaveBeenCalledTimes(1));
    expect(setDoc).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({
        vendorId: VENDOR_ID,
        message:  'I want to help manage',
        status:   'pending',
      })
    );
  });

  it('shows the submitted state after a successful application', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    await screen.findByText('Account Settings');

    await userEvent.type(screen.getByPlaceholderText(/briefly describe/i), 'Please give me access');
    await userEvent.click(screen.getByRole('button', { name: /submit application/i }));

    await waitFor(() =>
      expect(screen.getByText(/application has been submitted/i)).toBeInTheDocument()
    );
    expect(screen.queryByRole('button', { name: /submit application/i })).not.toBeInTheDocument();
  });

  it('restores the submitted state when an existing application is found in Firestore', async () => {
    setupGetDoc({
      appExists: true,
      appData:   { message: 'Prior application' },
    });

    render(<AccSettings {...DEFAULT_PROPS} />);

    expect(await screen.findByText(/application has been submitted/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit application/i })).not.toBeInTheDocument();
  });

  it('does not submit when message is only whitespace', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    await screen.findByText('Account Settings');

    fireEvent.change(screen.getByPlaceholderText(/briefly describe/i), {
      target: { value: '   ' },
    });

    expect(screen.getByRole('button', { name: /submit application/i })).toBeDisabled();
    expect(setDoc).not.toHaveBeenCalled();
  });
});

describe('AccSettings - delete account', () => {
  it('shows a confirmation prompt when Delete Account is clicked', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    await userEvent.click(await screen.findByRole('button', { name: /delete account/i }));
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
  });

  it('shows "Yes, delete my account" and "Cancel" buttons in confirmation', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    await userEvent.click(await screen.findByRole('button', { name: /delete account/i }));
    expect(screen.getByRole('button', { name: /yes, delete my account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
  });

  it('hides the confirmation prompt when Cancel is clicked', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    await userEvent.click(await screen.findByRole('button', { name: /delete account/i }));
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete account/i })).toBeInTheDocument();
  });

  it('calls deleteDoc for users and Vendors collections on confirm', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    await userEvent.click(await screen.findByRole('button', { name: /delete account/i }));
    await userEvent.click(screen.getByRole('button', { name: /yes, delete my account/i }));

    await waitFor(() => expect(deleteDoc).toHaveBeenCalledTimes(2));
    expect(doc).toHaveBeenCalledWith({}, 'users',   VENDOR_ID);
    expect(doc).toHaveBeenCalledWith({}, 'Vendors', VENDOR_ID);
  });

  it('calls deleteUser on confirm', async () => {
    render(<AccSettings {...DEFAULT_PROPS} />);
    await userEvent.click(await screen.findByRole('button', { name: /delete account/i }));
    await userEvent.click(screen.getByRole('button', { name: /yes, delete my account/i }));

    await waitFor(() => expect(deleteUser).toHaveBeenCalledTimes(1));
  });

  it('calls onLogout after account is deleted', async () => {
    const onLogout = jest.fn();
    render(<AccSettings {...DEFAULT_PROPS} onLogout={onLogout} />);
    await userEvent.click(await screen.findByRole('button', { name: /delete account/i }));
    await userEvent.click(screen.getByRole('button', { name: /yes, delete my account/i }));

    await waitFor(() => expect(onLogout).toHaveBeenCalledTimes(1));
  });
});

describe('AccSettings - error handling', () => {
  it('logs an error and does not crash when getDoc fails', async () => {
    getDoc.mockRejectedValue(new Error('Firestore read error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<AccSettings {...DEFAULT_PROPS} />);

    await waitFor(() =>
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch vendor data:',
        expect.any(Error)
      )
    );
    consoleSpy.mockRestore();
  });

  it('logs an error when admin application submission fails', async () => {
    setDoc.mockRejectedValueOnce(new Error('Firestore write error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<AccSettings {...DEFAULT_PROPS} />);
    await screen.findByText('Account Settings');

    await userEvent.type(screen.getByPlaceholderText(/briefly describe/i), 'Apply me');
    await userEvent.click(screen.getByRole('button', { name: /submit application/i }));

    await waitFor(() =>
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to submit admin application:',
        expect.any(Error)
      )
    );
    consoleSpy.mockRestore();
  });

  it('does not show submitted state when application submission fails', async () => {
    setDoc.mockRejectedValueOnce(new Error('Firestore write error'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<AccSettings {...DEFAULT_PROPS} />);
    await screen.findByText('Account Settings');

    await userEvent.type(screen.getByPlaceholderText(/briefly describe/i), 'Apply me');
    await userEvent.click(screen.getByRole('button', { name: /submit application/i }));

    await waitFor(() =>
      expect(screen.queryByText(/application has been submitted/i)).not.toBeInTheDocument()
    );
  });
});