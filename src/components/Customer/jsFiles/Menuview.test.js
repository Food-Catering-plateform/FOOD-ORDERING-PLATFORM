import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MenuView from './MenuView';

const mockShop = {
  name: "Matrix Grill",
  category: "Fast Food"
};

describe('MenuView Component', () => {
  test('renders the specific shop name in the header', () => {
    render(<MenuView shop={mockShop} onBack={jest.fn()} />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Matrix Grill Menu');
  });

  test('calls onBack when the back button is clicked', () => {
    const mockBackFn = jest.fn();
    render(<MenuView shop={mockShop} onBack={mockBackFn} />);
    
    const backBtn = screen.getByText(/back to shops/i);
    fireEvent.click(backBtn);
    
    expect(mockBackFn).toHaveBeenCalledTimes(1);
  });

  test('renders menu items correctly', () => {
    render(<MenuView shop={mockShop} onBack={jest.fn()} />);
    // Checking for the sample item we put in the component
    expect(screen.getByText(/Sample Food Item/i)).toBeInTheDocument();
    expect(screen.getByText(/Add to Basket/i)).toBeInTheDocument();
  });

  test('maintains semantic structure using article for menu items', () => {
    render(<MenuView shop={mockShop} onBack={jest.fn()} />);
    const itemArticle = screen.getByRole('article');
    expect(itemArticle).toBeInTheDocument();
  });
});