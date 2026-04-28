import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock Firebase
jest.mock('../../../Firebase/firebaseConfig', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc:     jest.fn().mockResolvedValue({ id: 'order123' }),
}));

// Mock AuthContext
jest.mock('../../../Services/AuthContext', () => ({
  useAuth: () => ({
    currentUser: {
      uid:         'user123',
      email:       'student@gmail.com',
      displayName: 'Test Student',
    },
  }),
}));

import Basket from './Basket';

const mockBasket = [
  { id: '1', name: 'Burger', price: '50', qty: 2, vendorId: 'v1', vendorName: 'Burger Shack' },
];

// UAT-B01
test('UAT-B01 - Basket renders items correctly', () => {
  render(<Basket basket={mockBasket} setBasket={jest.fn()} />);
  expect(screen.getByText('Burger')).toBeInTheDocument();
});

// UAT-B02
test('UAT-B02 - Basket shows total price', () => {
  render(<Basket basket={mockBasket} setBasket={jest.fn()} />);
  expect(screen.getByText(/total/i)).toBeInTheDocument();
});

// UAT-B03
test('UAT-B03 - Basket shows empty message when no items', () => {
  render(<Basket basket={[]} setBasket={jest.fn()} />);
  expect(screen.getByText(/your basket is empty/i)).toBeInTheDocument();
});

// UAT-B04
test('UAT-B04 - Place Order button is visible when basket has items', () => {
  render(<Basket basket={mockBasket} setBasket={jest.fn()} />);
  expect(screen.getByText(/checkout/i)).toBeInTheDocument();
});

// UAT-B05
test('UAT-B05 - Remove button is present for each item', () => {
  render(<Basket basket={mockBasket} setBasket={jest.fn()} />);
  expect(screen.getByText(/remove/i)).toBeInTheDocument();
});

// UAT-B06
test('UAT-B06 - Increase quantity button is present', () => {
  render(<Basket basket={mockBasket} setBasket={jest.fn()} />);
  expect(screen.getByText('+')).toBeInTheDocument();
});

// UAT-B07
test('UAT-B07 - Decrease quantity button is present', () => {
  render(<Basket basket={mockBasket} setBasket={jest.fn()} />);
  expect(screen.getByText('−')).toBeInTheDocument();
});