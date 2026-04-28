import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Payment from './Payment';

// Mock md5
jest.mock('md5', () => () => 'mocked-signature');

// Mock CSS and image imports
jest.mock('../css/Style-Payment.css', () => {});
jest.mock('../../../Assets/payfast-logo.png', () => 'payfast-logo.png');

const mockOrder = {
  customerName:  'John Doe',
  customerEmail: 'john@example.com',
  customerId:    'user123',
  total:         64.00,
  items: [
    { name: 'Burger', qty: 2, price: '32.00', vendorName: 'Vendor A', vendorId: 'v1' },
  ],
};

const mockSetActivePage = jest.fn();
const mockSetBasket    = jest.fn();

const setLocalStorage = (order) => {
  localStorage.setItem('pendingPayment', JSON.stringify(order));
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Payment Component', () => {

  test('redirects to basket if no pending order in localStorage', () => {
    render(<Payment setActivePage={mockSetActivePage} setBasket={mockSetBasket} />);
    expect(mockSetActivePage).toHaveBeenCalledWith('basket');
  });

  test('renders order summary with correct items', () => {
    setLocalStorage(mockOrder);
    render(<Payment setActivePage={mockSetActivePage} setBasket={mockSetBasket} />);

    expect(screen.getByText('Burger')).toBeInTheDocument();

    // text is split across elements inside <small>, so use a custom matcher
    expect(screen.getByText((_, element) => {
      return element?.tagName === 'SMALL' && element.textContent.includes('Vendor A');
    })).toBeInTheDocument();

    expect(screen.getByText((_, element) => {
      return element?.tagName === 'SMALL' && element.textContent.includes('x');
    })).toBeInTheDocument();
  });

  test('renders correct total amount', () => {
    setLocalStorage(mockOrder);
    render(<Payment setActivePage={mockSetActivePage} setBasket={mockSetBasket} />);

    expect(screen.getAllByText(/64\.00/).length).toBeGreaterThan(0);
  });

  test('renders PayFast form with correct action URL', () => {
    setLocalStorage(mockOrder);
    const { container } = render(<Payment setActivePage={mockSetActivePage} setBasket={mockSetBasket} />);

    const form = container.querySelector('form');
    expect(form).toHaveAttribute('action', 'https://sandbox.payfast.co.za/eng/process');
    expect(form).toHaveAttribute('method', 'POST');
  });

  test('form contains required hidden fields', () => {
    setLocalStorage(mockOrder);
    const { container } = render(<Payment setActivePage={mockSetActivePage} setBasket={mockSetBasket} />);

    const inputs = container.querySelectorAll('input[type="hidden"]');
    const names  = Array.from(inputs).map(i => i.name);

    expect(names).toContain('merchant_id');
    expect(names).toContain('merchant_key');
    expect(names).toContain('amount');
    expect(names).toContain('item_name');
    expect(names).toContain('return_url');
    expect(names).toContain('cancel_url');
    expect(names).toContain('signature');
  });

  test('amount hidden field has correct value', () => {
    setLocalStorage(mockOrder);
    const { container } = render(<Payment setActivePage={mockSetActivePage} setBasket={mockSetBasket} />);

    const amountInput = container.querySelector('input[name="amount"]');
    expect(amountInput).toHaveValue('64.00');
  });

  test('signature hidden field is populated', () => {
    setLocalStorage(mockOrder);
    const { container } = render(<Payment setActivePage={mockSetActivePage} setBasket={mockSetBasket} />);

    const sigInput = container.querySelector('input[name="signature"]');
    expect(sigInput.value).toBeTruthy();
    expect(sigInput.value).toBe('mocked-signature');
  });

  test('renders pay button with correct amount', () => {
    setLocalStorage(mockOrder);
    render(<Payment setActivePage={mockSetActivePage} setBasket={mockSetBasket} />);

    expect(screen.getByRole('button', { name: /Pay R 64\.00/i })).toBeInTheDocument();
  });

  test('go back link calls setActivePage with basket', async () => {
    setLocalStorage(mockOrder);
    render(<Payment setActivePage={mockSetActivePage} setBasket={mockSetBasket} />);

    await userEvent.click(screen.getByText(/Go back to basket/i));
    expect(mockSetActivePage).toHaveBeenCalledWith('basket');
  });

  test('saves paymentId to localStorage', () => {
    setLocalStorage(mockOrder);
    render(<Payment setActivePage={mockSetActivePage} setBasket={mockSetBasket} />);

    const savedId = localStorage.getItem('pendingPaymentId');
    expect(savedId).toMatch(/^order_\d+$/);
  });

  test('renders security badges', () => {
    setLocalStorage(mockOrder);
    render(<Payment setActivePage={mockSetActivePage} setBasket={mockSetBasket} />);

    expect(screen.getByText('SSL Secured')).toBeInTheDocument();
    expect(screen.getByText('3D Secure')).toBeInTheDocument();
    expect(screen.getByText('Buyer Protected')).toBeInTheDocument();
  });

});