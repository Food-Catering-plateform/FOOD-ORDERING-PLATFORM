import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Shops from './Shops';

const mockVendors = [
  {
    id: 1,
    name: "Test Grill",
    category: "Fast Food",
    description: "Test description",
    image: "test.jpg",
    dietaryLabels: ["Halal"]
  }
];

describe('Shops Component', () => {
  test('renders the Shops gallery heading', () => {
    render(<Shops onSelectShop={jest.fn()} />);
    expect(screen.getByText(/Campus Dining Options/i)).toBeInTheDocument();
  });

  test('displays vendor information correctly', () => {
    render(<Shops vendors={mockVendors} onSelectShop={jest.fn()} />);
    expect(screen.getByText('Test Grill')).toBeInTheDocument();
    expect(screen.getByText(/Available: Halal/i)).toBeInTheDocument();
  });

  test('triggers onSelectShop when View Menu is clicked', () => {
    const mockFn = jest.fn();
    render(<Shops vendors={mockVendors} onSelectShop={mockFn} />);
    
    const button = screen.getByRole('button', { name: /view menu/i });
    fireEvent.click(button);
    
    expect(mockFn).toHaveBeenCalledWith(mockVendors[0]);
  });

  test('contains the horizontal scroll navigation arrow', () => {
    render(<Shops onSelectShop={jest.fn()} />);
    const arrow = screen.getByLabelText(/view more shops/i);
    expect(arrow).toBeInTheDocument();
  });
});