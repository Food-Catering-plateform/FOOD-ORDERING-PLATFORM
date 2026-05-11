import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MenuManagement from '../MenuManagement';

// --- Mocks ---

jest.mock('../../../Services/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../Firebase/firebaseConfig', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc:     jest.fn(),
  updateDoc:  jest.fn(),
  getDocs:    jest.fn(),
  doc:        jest.fn(),
  deleteDoc:  jest.fn(),
}));
jest.mock('../MenuManagement.css', () => ({}));

import { useAuth } from '../../../Services/AuthContext';
import { collection, addDoc, updateDoc, getDocs, doc, deleteDoc } from 'firebase/firestore';

// --- Helpers ---

const VENDOR_ID = 'vendor-123';

const MOCK_ITEMS = [
  { id: 'item-1', name: 'Burger', price: '50.00', qty: '10', description: 'Juicy beef burger', imageUrl: 'https://example.com/burger.jpg', allergens: [], dietary: [] },
  { id: 'item-2', name: 'Fries',  price: '20.00', qty: '20', description: 'Crispy fries',       imageUrl: 'https://example.com/fries.jpg',  allergens: [], dietary: [] },
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

// --- Tests ---

describe('MenuManagement - rendering', () => {
  it('shows a loading message when vendorId is absent', () => {
    useAuth.mockReturnValue({ vendorId: null });
    render(<MenuManagement />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders the page heading', async () => {
    render(<MenuManagement />);
    expect(screen.getByRole('heading', { name: /menu management/i })).toBeInTheDocument();
  });

  it('renders the "Add Food Item" form heading by default', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');
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

  it('shows empty state message when no items exist', async () => {
    getDocs.mockResolvedValueOnce(makeDocs([]));
    render(<MenuManagement />);
    await waitFor(() =>
      expect(screen.getByText(/no menu items yet/i)).toBeInTheDocument()
    );
  });

  it('renders item description when present', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');
    expect(screen.getByText('Juicy beef burger')).toBeInTheDocument();
  });

  it('does not render description paragraph when description is empty', async () => {
    getDocs.mockResolvedValueOnce(makeDocs([
      { id: 'item-1', name: 'Burger', price: '50.00', qty: '10', description: '', imageUrl: 'https://example.com/burger.jpg', allergens: [], dietary: [] },
    ]));
    render(<MenuManagement />);
    await screen.findByText('Burger');
    expect(screen.queryByText('Juicy beef burger')).not.toBeInTheDocument();
  });

  it('renders dietary tags when item has dietary info', async () => {
    getDocs.mockResolvedValueOnce(makeDocs([
      { id: 'item-1', name: 'Salad', price: '30.00', qty: '5', description: '', imageUrl: '', allergens: [], dietary: ['vegan', 'halal'] },
    ]));
    render(<MenuManagement />);
    await screen.findByText('Salad');
    expect(screen.getByText(/vegan/i)).toBeInTheDocument();
    expect(screen.getByText(/halal/i)).toBeInTheDocument();
  });

  it('renders allergen tags when item has allergens', async () => {
    getDocs.mockResolvedValueOnce(makeDocs([
      { id: 'item-1', name: 'Pasta', price: '60.00', qty: '5', description: '', imageUrl: '', allergens: ['Gluten', 'Dairy'], dietary: [] },
    ]));
    render(<MenuManagement />);
    await screen.findByText('Pasta');
    expect(screen.getByText(/gluten/i)).toBeInTheDocument();
    expect(screen.getByText(/dairy/i)).toBeInTheDocument();
  });

  it('applies editing class to the item currently being edited', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');
    await userEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
    const listItems = document.querySelectorAll('li');
    expect(listItems[0]).toHaveClass('editing');
    expect(listItems[1]).not.toHaveClass('editing');
  });
});

// -----------------------------------------------------------------------------

describe('MenuManagement - adding an item', () => {
  it('calls addDoc with correct data and updates the list', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.type(screen.getByPlaceholderText('Food name'),          'Pizza');
    await userEvent.type(screen.getByPlaceholderText('Price (R)'),          '80');
    await userEvent.type(screen.getByPlaceholderText('Quantity available'), '5');
    await userEvent.type(screen.getByPlaceholderText('Description'),        'Cheesy pizza');

    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    await waitFor(() => expect(addDoc).toHaveBeenCalledTimes(1));
    expect(addDoc).toHaveBeenCalledWith(
      'menu-collection-ref',
      expect.objectContaining({ name: 'Pizza', price: '80.00', qty: '5', description: 'Cheesy pizza' })
    );
    expect(await screen.findByText('Pizza')).toBeInTheDocument();
  });

  it('clears the form after a successful add', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.type(screen.getByPlaceholderText('Food name'), 'Pizza');
    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    await waitFor(() => expect(addDoc).toHaveBeenCalled());
    expect(screen.getByPlaceholderText('Food name')).toHaveValue('');
  });

  it('uses a placeholder image when no file is selected', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.type(screen.getByPlaceholderText('Food name'), 'Wrap');
    await userEvent.type(screen.getByPlaceholderText('Price (R)'), '35');
    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    await waitFor(() => expect(addDoc).toHaveBeenCalled());
    expect(addDoc).toHaveBeenCalledWith(
      'menu-collection-ref',
      expect.objectContaining({ imageUrl: 'https://placehold.co/300x160/F5F4F2/FF6B2B?text=Food' })
    );
  });

  it('includes selected allergens in addDoc call', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.click(screen.getByRole('button', { name: /select allergens/i }));
    await userEvent.click(screen.getByLabelText(/gluten/i));

    await userEvent.type(screen.getByPlaceholderText('Food name'), 'Bread');
    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    await waitFor(() => expect(addDoc).toHaveBeenCalled());
    expect(addDoc).toHaveBeenCalledWith(
      'menu-collection-ref',
      expect.objectContaining({ allergens: ['Gluten'] })
    );
  });

  it('includes selected dietary info in addDoc call', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.click(screen.getByRole('button', { name: /select dietary/i }));
    await userEvent.click(screen.getByLabelText(/vegan/i));

    await userEvent.type(screen.getByPlaceholderText('Food name'), 'Salad');
    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    await waitFor(() => expect(addDoc).toHaveBeenCalled());
    expect(addDoc).toHaveBeenCalledWith(
      'menu-collection-ref',
      expect.objectContaining({ dietary: ['vegan'] })
    );
  });

  it('clears allergens after a successful add', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.click(screen.getByRole('button', { name: /select allergens/i }));
    await userEvent.click(screen.getByLabelText(/dairy/i));
    await userEvent.type(screen.getByPlaceholderText('Food name'), 'Cheese');
    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    await waitFor(() => expect(addDoc).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: /select allergens/i }));
    expect(screen.getByLabelText(/dairy/i)).not.toBeChecked();
  });
});

// -----------------------------------------------------------------------------

describe('MenuManagement - editing an item', () => {
  it('switches the form heading to "Edit Food Item" when Edit is clicked', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
    expect(screen.getByRole('heading', { name: /edit food item/i })).toBeInTheDocument();
  });

  it("pre-fills the form with the selected item's values", async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
    expect(screen.getByPlaceholderText('Food name')).toHaveValue('Burger');
    expect(screen.getByPlaceholderText('Price (R)')).toHaveValue('50.00');
    expect(screen.getByPlaceholderText('Quantity available')).toHaveValue('10');
  });

  it('calls updateDoc (not addDoc) when saving edits', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
    const nameInput = screen.getByPlaceholderText('Food name');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Big Burger');

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(updateDoc).toHaveBeenCalledTimes(1));
    expect(addDoc).not.toHaveBeenCalled();
    expect(updateDoc).toHaveBeenCalledWith('doc-ref', expect.objectContaining({ name: 'Big Burger' }));
  });

  it('shows the updated name in the list after saving', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
    const nameInput = screen.getByPlaceholderText('Food name');
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

  it('uses the new image when a file is uploaded during edit', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);

    const fakeDataUrl = 'data:image/png;base64,newimage==';
    const mockReader = {
      onload: null,
      readAsDataURL: jest.fn(function () {
        this.result = fakeDataUrl;
        this.onload();
      }),
    };
    jest.spyOn(global, 'FileReader').mockImplementation(() => mockReader);

    const fileInput = document.querySelector('input[type="file"]');
    await userEvent.upload(fileInput, new File(['img'], 'new.png', { type: 'image/png' }));
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(updateDoc).toHaveBeenCalled());
    expect(updateDoc).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({ imageUrl: fakeDataUrl })
    );
  });
});

// -----------------------------------------------------------------------------

describe('MenuManagement - allergen dropdown', () => {
  it('opens the allergen dropdown when its button is clicked', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.click(screen.getByRole('button', { name: /select allergens/i }));
    expect(screen.getByLabelText(/gluten/i)).toBeInTheDocument();
  });

  it('closes the allergen dropdown when its button is clicked again', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    const btn = screen.getByRole('button', { name: /select allergens/i });
    await userEvent.click(btn);
    await userEvent.click(btn);
    expect(screen.queryByLabelText(/gluten/i)).not.toBeInTheDocument();
  });

  it('checks and unchecks an allergen', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.click(screen.getByRole('button', { name: /select allergens/i }));
    const checkbox = screen.getByLabelText(/gluten/i);
    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    await userEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('updates the allergen button label when allergens are selected', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.click(screen.getByRole('button', { name: /select allergens/i }));
    await userEvent.click(screen.getByLabelText(/gluten/i));

    expect(screen.getByRole('button', { name: /contains/i })).toBeInTheDocument();
  });

  it('closes the allergen dropdown when clicking outside', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.click(screen.getByRole('button', { name: /select allergens/i }));
    expect(screen.getByLabelText(/gluten/i)).toBeInTheDocument();

    await userEvent.click(document.body);
    expect(screen.queryByLabelText(/gluten/i)).not.toBeInTheDocument();
  });
});

// -----------------------------------------------------------------------------

describe('MenuManagement - dietary dropdown', () => {
  it('opens the dietary dropdown when its button is clicked', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.click(screen.getByRole('button', { name: /select dietary/i }));
    expect(screen.getByLabelText(/vegan/i)).toBeInTheDocument();
  });

  it('closes the dietary dropdown when its button is clicked again', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    const btn = screen.getByRole('button', { name: /select dietary/i });
    await userEvent.click(btn);
    await userEvent.click(btn);
    expect(screen.queryByLabelText(/vegan/i)).not.toBeInTheDocument();
  });

  it('checks and unchecks a dietary option', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.click(screen.getByRole('button', { name: /select dietary/i }));
    const checkbox = screen.getByLabelText(/vegan/i);
    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    await userEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('updates the dietary button label when a dietary option is selected', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.click(screen.getByRole('button', { name: /select dietary/i }));
    await userEvent.click(screen.getByLabelText(/vegan/i));

    expect(screen.getByRole('button', { name: /vegan/i })).toBeInTheDocument();
  });

  it('closes the dietary dropdown when clicking outside', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.click(screen.getByRole('button', { name: /select dietary/i }));
    expect(screen.getByLabelText(/vegan/i)).toBeInTheDocument();

    await userEvent.click(document.body);
    expect(screen.queryByLabelText(/vegan/i)).not.toBeInTheDocument();
  });
});

// -----------------------------------------------------------------------------

describe('MenuManagement - deleting an item', () => {
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

    await userEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
    expect(screen.getByPlaceholderText('Food name')).toHaveValue('Burger');

    await userEvent.click(screen.getAllByRole('button', { name: /delete/i })[0]);

    await waitFor(() => expect(screen.getByPlaceholderText('Food name')).toHaveValue(''));
    expect(screen.getByRole('heading', { name: /add food item/i })).toBeInTheDocument();
  });

  it('does not reset the form when a different item is deleted', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
    expect(screen.getByPlaceholderText('Food name')).toHaveValue('Burger');

    await userEvent.click(screen.getAllByRole('button', { name: /delete/i })[1]);

    await waitFor(() => expect(screen.queryByText('Fries')).not.toBeInTheDocument());
    expect(screen.getByPlaceholderText('Food name')).toHaveValue('Burger');
  });
});

// -----------------------------------------------------------------------------

describe('MenuManagement - image upload', () => {
  it('reads and stores a base64 data URL from a selected file', async () => {
    render(<MenuManagement />);
    await screen.findByText('Burger');

    const fakeFile    = new File(['(binary)'], 'photo.png', { type: 'image/png' });
    const fakeDataUrl = 'data:image/png;base64,ZmFrZQ==';

    const mockReader = {
      onload: null,
      readAsDataURL: jest.fn(function () {
        this.result = fakeDataUrl;
        this.onload();
      }),
    };
    jest.spyOn(global, 'FileReader').mockImplementation(() => mockReader);

    const fileInput = document.querySelector('input[type="file"]');
    await userEvent.upload(fileInput, fakeFile);

    await userEvent.type(screen.getByPlaceholderText('Food name'), 'Photo Dish');
    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    await waitFor(() => expect(addDoc).toHaveBeenCalled());
    expect(addDoc).toHaveBeenCalledWith(
      'menu-collection-ref',
      expect.objectContaining({ imageUrl: fakeDataUrl })
    );
  });
});

// -----------------------------------------------------------------------------

describe('MenuManagement - error handling', () => {
  it('logs an error and does not crash when addDoc fails', async () => {
    addDoc.mockRejectedValueOnce(new Error('Firestore write error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.type(screen.getByPlaceholderText('Food name'), 'Salad');
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

  it('does not remove item from list when deleteDoc fails', async () => {
    deleteDoc.mockRejectedValueOnce(new Error('Firestore delete error'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<MenuManagement />);
    await screen.findByText('Burger');

    await userEvent.click(screen.getAllByRole('button', { name: /delete/i })[0]);

    await waitFor(() => expect(deleteDoc).toHaveBeenCalled());
    expect(screen.getByText('Burger')).toBeInTheDocument();
  });
});

// -----------------------------------------------------------------------------

describe('MenuManagement - Firestore integration details', () => {
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

    await userEvent.type(screen.getByPlaceholderText('Food name'), 'Tea');
    await userEvent.type(screen.getByPlaceholderText('Price (R)'), '5');
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

    await userEvent.type(screen.getByPlaceholderText('Food name'),   '  Wrap  ');
    await userEvent.type(screen.getByPlaceholderText('Description'), '  Tasty  ');
    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    await waitFor(() => expect(addDoc).toHaveBeenCalled());
    expect(addDoc).toHaveBeenCalledWith(
      'menu-collection-ref',
      expect.objectContaining({ name: 'Wrap', description: 'Tasty' })
    );
  });

  it('does not call addDoc when vendorId is absent on submit', async () => {
    useAuth.mockReturnValue({ vendorId: null });
    render(<MenuManagement />);
    expect(addDoc).not.toHaveBeenCalled();
  });
});