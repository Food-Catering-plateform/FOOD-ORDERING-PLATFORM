import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MenuManagement from './MenuManagement';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../Services/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../Firebase/firebaseConfig', () => ({ db: {} }));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc:     jest.fn(),
  updateDoc:  jest.fn(),
  getDocs:    jest.fn(),
  doc:        jest.fn(),
  deleteDoc:  jest.fn(),
}));

jest.mock('./MenuManagement.css', () => ({}));

import { useAuth } from '../../Services/AuthContext';
import { collection, addDoc, updateDoc, getDocs, doc, deleteDoc } from 'firebase/firestore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VENDOR_ID = 'vendor-123';

const MOCK_ITEMS = [
  { id: 'item-1', name: 'Burger',  price: '50.00', qty: '10', description: 'Juicy beef burger', imageUrl: 'https://example.com/burger.jpg' },
  { id: 'item-2', name: 'Fries',   price: '20.00', qty: '20', description: 'Crispy fries',       imageUrl: 'https://example.com/fries.jpg'  },
];

function makeDocs(items) {
  return {
    docs: items.map(item => ({
      id: item.id,
      data: () => {
        const { id, ...rest } = item;
        return rest;
      },
    })),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ vendorId: VENDOR_ID });
  getDocs.mockResolvedValue(makeDocs(MOCK_ITEMS));
  collection.mockReturnValue('menu-collection-ref');
  doc.mockReturnValue('doc-ref');
  addDoc.mockResolvedValue({ id: 'new-item-id' });
  updateDoc.mockResolvedValue();
  deleteDoc.mockResolvedValue();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MenuManagement – rendering', () => {
  it('shows a loading message when vendorId is absent', () => {
    useAuth.mockReturnValue({ vendorId: null });
    // getDocs should not be called without a vendorId
    render(<MenuManagement />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders the page heading', async () => {
    render(<MenuManagement />);
    expect(screen.getByRole('heading', { name: /menu management/i })).toBeInTheDocument();
  });

  it('renders the "Add Food Item" form heading by default', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger'); // wait for items to load
    expect(screen.getByRole('heading', { name: /add food item/i })).toBeInTheDocument();
  });

  it('fetches and displays items on mount', async () => {
    render(<MenuManagement />);
    expect(await screen.findByText('Burger')).toBeInTheDocument();
    expect(screen.getByText('Fries')).toBeInTheDocument();
  });

  it('displays price and image for each item', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');
    expect(screen.getByText('R 50.00')).toBeInTheDocument();
    const images = screen.getAllByRole('img');
    expect(images[0]).toHaveAttribute('src', MOCK_ITEMS[0].imageUrl);
  });

  it('renders Edit and Delete buttons for each item', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');
    expect(screen.getAllByRole('button', { name: /edit/i   })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /delete/i })).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('MenuManagement – adding an item', () => {
  it('calls addDoc with correct data and updates the list', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.type(screen.getByPlaceholderText('Food Name'),    'Pizza');
    await userEvent.type(screen.getByPlaceholderText('Price'),        '80');
    await userEvent.type(screen.getByPlaceholderText('Quantity'),     '5');
    await userEvent.type(screen.getByPlaceholderText('Description'),  'Cheesy pizza');

    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    await waitFor(() => expect(addDoc).toHaveBeenCalledTimes(1));
    expect(addDoc).toHaveBeenCalledWith(
      'menu-collection-ref',
      expect.objectContaining({
        name:        'Pizza',
        price:       '80.00',
        qty:         '5',
        description: 'Cheesy pizza',
      })
    );

    expect(await screen.findByText('Pizza')).toBeInTheDocument();
  });

  it('clears the form after a successful add', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.type(screen.getByPlaceholderText('Food Name'), 'Pizza');
    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    await waitFor(() => expect(addDoc).toHaveBeenCalled());
    expect(screen.getByPlaceholderText('Food Name')).toHaveValue('');
  });

  it('uses a placeholder image when no file is selected', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.type(screen.getByPlaceholderText('Food Name'), 'Wrap');
    await userEvent.type(screen.getByPlaceholderText('Price'),     '35');
    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    await waitFor(() => expect(addDoc).toHaveBeenCalled());
    expect(addDoc).toHaveBeenCalledWith(
      'menu-collection-ref',
      expect.objectContaining({
        imageUrl: 'https://placehold.co/60x60/f5e6d3/7a4e27?text=Food',
      })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('MenuManagement – editing an item', () => {
  it('switches the form heading to "Edit Food Item" when Edit is clicked', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
    expect(screen.getByRole('heading', { name: /edit food item/i })).toBeInTheDocument();
  });

  it('pre-fills the form with the selected item\'s values', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
    expect(screen.getByPlaceholderText('Food Name')).toHaveValue('Burger');
    expect(screen.getByPlaceholderText('Price')).toHaveValue('50.00');
    expect(screen.getByPlaceholderText('Quantity')).toHaveValue('10');
  });

  it('calls updateDoc (not addDoc) when saving edits', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
    const nameInput = screen.getByPlaceholderText('Food Name');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Big Burger');

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(updateDoc).toHaveBeenCalledTimes(1));
    expect(addDoc).not.toHaveBeenCalled();
    expect(updateDoc).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({ name: 'Big Burger' })
    );
  });

  it('shows the updated name in the list after saving', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
    const nameInput = screen.getByPlaceholderText('Food Name');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Big Burger');

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText('Big Burger')).toBeInTheDocument();
    expect(screen.queryByText('Burger')).not.toBeInTheDocument();
  });

  it('resets to "Add Food Item" mode after saving edits', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /add food item/i })).toBeInTheDocument()
    );
  });

  it('preserves the original image when no new file is uploaded during edit', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(updateDoc).toHaveBeenCalled());
    expect(updateDoc).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({ imageUrl: MOCK_ITEMS[0].imageUrl })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('MenuManagement – deleting an item', () => {
  it('calls deleteDoc with the correct document reference', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.click(screen.getAllByRole('button', { name: /delete/i })[0]);

    await waitFor(() => expect(deleteDoc).toHaveBeenCalledTimes(1));
    expect(doc).toHaveBeenCalledWith({}, 'Vendors', VENDOR_ID, 'menuItems', 'item-1');
  });

  it('removes the item from the list after deletion', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.click(screen.getAllByRole('button', { name: /delete/i })[0]);

    await waitFor(() => expect(screen.queryByText('Burger')).not.toBeInTheDocument());
    expect(screen.getByText('Fries')).toBeInTheDocument();
  });

  it('resets the form if the item being edited is deleted', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    // Start editing item 0
    await userEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
    expect(screen.getByPlaceholderText('Food Name')).toHaveValue('Burger');

    // Delete that same item
    await userEvent.click(screen.getAllByRole('button', { name: /delete/i })[0]);

    await waitFor(() =>
      expect(screen.getByPlaceholderText('Food Name')).toHaveValue('')
    );
    expect(screen.getByRole('heading', { name: /add food item/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('MenuManagement – image upload', () => {
  it('reads and stores a base64 data URL from a selected file', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    const fakeFile = new File(['(binary)'], 'photo.png', { type: 'image/png' });
    const fakeDataUrl = 'data:image/png;base64,ZmFrZQ==';

    // Mock FileReader
    const mockReader = {
      onload: null,
      readAsDataURL: jest.fn(function () {
        this.result = fakeDataUrl;
        this.onload();
      }),
    };
    jest.spyOn(global, 'FileReader').mockImplementation(() => mockReader);

    const fileInput = screen.getByLabelText
      ? screen.queryByLabelText(/image/i) ?? document.querySelector('input[type="file"]')
      : document.querySelector('input[type="file"]');

    await userEvent.upload(fileInput, fakeFile);

    await userEvent.type(screen.getByPlaceholderText('Food Name'), 'Photo Dish');
    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    await waitFor(() => expect(addDoc).toHaveBeenCalled());
    expect(addDoc).toHaveBeenCalledWith(
      'menu-collection-ref',
      expect.objectContaining({ imageUrl: fakeDataUrl })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('MenuManagement – error handling', () => {
  it('logs an error and does not crash when addDoc fails', async () => {
    addDoc.mockRejectedValueOnce(new Error('Firestore write error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.type(screen.getByPlaceholderText('Food Name'), 'Salad');
    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    await waitFor(() =>
      expect(consoleSpy).toHaveBeenCalledWith('Error saving item:', expect.any(Error))
    );
    consoleSpy.mockRestore();
  });

  it('logs an error and does not crash when getDocs fails', async () => {
    getDocs.mockRejectedValueOnce(new Error('Firestore read error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<MenuManagement />);

    await waitFor(() =>
      expect(consoleSpy).toHaveBeenCalledWith('Unable to fetch items', expect.any(Error))
    );
    consoleSpy.mockRestore();
  });

  it('logs an error and does not crash when deleteDoc fails', async () => {
    deleteDoc.mockRejectedValueOnce(new Error('Firestore delete error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.click(screen.getAllByRole('button', { name: /delete/i })[0]);

    await waitFor(() =>
      expect(consoleSpy).toHaveBeenCalledWith('Unable to delete item', expect.any(Error))
    );
    consoleSpy.mockRestore();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('MenuManagement – Firestore integration details', () => {
  it('does not call getDocs when vendorId is null', () => {
    useAuth.mockReturnValue({ vendorId: null });
    render(<MenuManagement />);
    expect(getDocs).not.toHaveBeenCalled();
  });

  it('constructs the correct Firestore path on fetch', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');
    expect(collection).toHaveBeenCalledWith({}, 'Vendors', VENDOR_ID, 'menuItems');
  });

  it('formats price to two decimal places when saving', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.type(screen.getByPlaceholderText('Food Name'), 'Tea');
    await userEvent.type(screen.getByPlaceholderText('Price'),     '5');
    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    await waitFor(() => expect(addDoc).toHaveBeenCalled());
    expect(addDoc).toHaveBeenCalledWith(
      'menu-collection-ref',
      expect.objectContaining({ price: '5.00' })
    );
  });

  it('trims whitespace from name and description before saving', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.type(screen.getByPlaceholderText('Food Name'),   '  Wrap  ');
    await userEvent.type(screen.getByPlaceholderText('Description'), '  Tasty  ');
    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    await waitFor(() => expect(addDoc).toHaveBeenCalled());
    expect(addDoc).toHaveBeenCalledWith(
      'menu-collection-ref',
      expect.objectContaining({ name: 'Wrap', description: 'Tasty' })
    );
  });
});