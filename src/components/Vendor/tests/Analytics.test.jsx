// Analytics.test.jsx

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup
} from '@testing-library/react';

import '@testing-library/jest-dom';

import Analytics from '../Analytics';

describe('Analytics Component', () => {

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  // ============================================================
  // BASIC RENDER TESTS
  // ============================================================

  test('renders analytics heading', () => {
    render(<Analytics />);
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  test('renders all period tabs', () => {
    render(<Analytics />);

    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('This Week')).toBeInTheDocument();
    expect(screen.getByText('This Month')).toBeInTheDocument();
  });

  test('Today tab is active by default', () => {
    render(<Analytics />);

    const todayBtn = screen.getByText('Today');
    expect(todayBtn).toHaveClass('active');
  });

  // ============================================================
  // PERIOD SWITCHING TESTS
  // ============================================================

  test('switches to This Week data correctly', () => {
    render(<Analytics />);

    fireEvent.click(screen.getByText('This Week'));

    expect(screen.getByText('126')).toBeInTheDocument();
    expect(screen.getByText('98')).toBeInTheDocument();
  });

  test('switches to This Month data correctly', () => {
    render(<Analytics />);

    fireEvent.click(screen.getByText('This Month'));

    expect(screen.getByText('512')).toBeInTheDocument();
    expect(screen.getByText('389')).toBeInTheDocument();
  });

  test('updates active tab when clicked', () => {
    render(<Analytics />);

    const weekBtn = screen.getByText('This Week');
    fireEvent.click(weekBtn);

    expect(weekBtn).toHaveClass('active');
  });

  // ============================================================
  // STATISTICS TESTS
  // ============================================================

  test('renders revenue correctly', () => {
    render(<Analytics />);
    expect(screen.getByText(/R 1,284.50/i)).toBeInTheDocument();
  });

  test('renders total orders correctly', () => {
    render(<Analytics />);
    expect(screen.getByText('18')).toBeInTheDocument();
  });

  test('renders completion rate correctly', () => {
    render(<Analytics />);
    expect(screen.getByText('78%')).toBeInTheDocument();
  });

  test('renders customers served correctly', () => {
    render(<Analytics />);
    expect(screen.getByText('16')).toBeInTheDocument();
  });

  // ============================================================
  // ORDERS OVERVIEW TESTS
  // ============================================================

  test('renders orders overview section', () => {
    render(<Analytics />);
    expect(screen.getByText('Orders Overview')).toBeInTheDocument();
  });

  test('renders all hourly labels for Today', () => {
    render(<Analytics />);

    expect(screen.getByText('8am')).toBeInTheDocument();
    expect(screen.getByText('12pm')).toBeInTheDocument();
    expect(screen.getByText('5pm')).toBeInTheDocument();
  });

  test('renders all weekly labels for This Week', () => {
    render(<Analytics />);

    fireEvent.click(screen.getByText('This Week'));

    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();
  });

  test('renders order values', () => {
    render(<Analytics />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  // ============================================================
  // BREAKDOWN TESTS
  // ============================================================

  test('renders completed orders count', () => {
    render(<Analytics />);
    expect(screen.getByText(/Completed: 14/i)).toBeInTheDocument();
  });

  test('renders cancelled orders count', () => {
    render(<Analytics />);
    expect(screen.getByText(/Cancelled: 2/i)).toBeInTheDocument();
  });

  test('renders other orders count correctly', () => {
    render(<Analytics />);
    expect(screen.getByText(/Other: 2/i)).toBeInTheDocument();
  });

  // ============================================================
  // TOP SELLING ITEMS TESTS
  // ============================================================

  test('renders top selling items section', () => {
    render(<Analytics />);
    expect(screen.getByText('Top Selling Items')).toBeInTheDocument();
  });

  test('renders item names correctly', () => {
    render(<Analytics />);

    expect(screen.getByText('Grilled Chicken Burger')).toBeInTheDocument();
    expect(screen.getByText('Fresh Orange Juice')).toBeInTheDocument();
  });

  test('renders sold quantities correctly', () => {
    render(<Analytics />);
    expect(screen.getByText(/24 sold/i)).toBeInTheDocument();
  });

  test('renders revenue values correctly', () => {
    render(<Analytics />);
    expect(screen.getByText(/R 2,159.76/i)).toBeInTheDocument();
  });

  test('renders ranking numbers correctly', () => {
    render(<Analytics />);
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#5')).toBeInTheDocument();
  });

  // ============================================================
  // EXPORT BUTTON TESTS
  // ============================================================

  test('renders export button', () => {
    render(<Analytics />);
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  test('opens export dropdown when clicked', () => {
    render(<Analytics />);

    fireEvent.click(screen.getByText('Export'));

    expect(screen.getByText(/Spreadsheet/i)).toBeInTheDocument();
    expect(screen.getByText(/Report/i)).toBeInTheDocument();
  });

  test('closes export dropdown when clicked again', () => {
    render(<Analytics />);

    const exportBtn = screen.getByText('Export');

    fireEvent.click(exportBtn);
    fireEvent.click(exportBtn);

    expect(screen.queryByText(/Spreadsheet/i)).not.toBeInTheDocument();
  });

  test('dropdown closes when clicking outside', async () => {
    render(<Analytics />);

    fireEvent.click(screen.getByText('Export'));
    fireEvent.mouseDown(document);

    await waitFor(() => {
      expect(screen.queryByText(/Spreadsheet/i)).not.toBeInTheDocument();
    });
  });

  // ============================================================
  // ACCESSIBILITY TESTS
  // ============================================================

  test('export button has aria attributes', () => {
    render(<Analytics />);

    const exportBtn = screen.getByRole('button', { name: /export/i });

    expect(exportBtn).toHaveAttribute('aria-haspopup', 'true');
  });

  test('export button updates aria-expanded', () => {
    render(<Analytics />);

    const exportBtn = screen.getByRole('button', { name: /export/i });

    expect(exportBtn).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(exportBtn);

    expect(exportBtn).toHaveAttribute('aria-expanded', 'true');
  });

  // ============================================================
  // BAR CHART TESTS
  // ============================================================

  test('renders correct number of bars for Today', () => {
    render(<Analytics />);
    const bars = document.querySelectorAll('.bar-fill');
    expect(bars.length).toBe(10);
  });

  test('renders correct number of bars for This Week', () => {
    render(<Analytics />);

    fireEvent.click(screen.getByText('This Week'));

    const bars = document.querySelectorAll('.bar-fill');
    expect(bars.length).toBe(7);
  });

  test('bar heights are calculated correctly', () => {
    render(<Analytics />);

    const bars = document.querySelectorAll('.bar-fill');
    expect(bars[0]).toHaveStyle('height: 37.5%');
  });

  // ============================================================
  // TOP ITEM BAR TESTS
  // ============================================================

  test('renders top item progress bars', () => {
    render(<Analytics />);

    const itemBars = document.querySelectorAll('.top-item__bar');
    expect(itemBars.length).toBe(5);
  });

  test('first top item bar should be 100%', () => {
    render(<Analytics />);

    const itemBars = document.querySelectorAll('.top-item__bar');
    expect(itemBars[0]).toHaveStyle('width: 100%');
  });

  // ============================================================
  // EDGE CASE TESTS
  // ============================================================

  test('component does not crash during rapid tab switching', () => {
    render(<Analytics />);

    fireEvent.click(screen.getByText('This Week'));
    fireEvent.click(screen.getByText('This Month'));
    fireEvent.click(screen.getByText('Today'));
    fireEvent.click(screen.getByText('This Week'));

    expect(screen.getByText('126')).toBeInTheDocument();
  });

  test('export dropdown remains functional after tab switching', () => {
    render(<Analytics />);

    fireEvent.click(screen.getByText('This Month'));
    fireEvent.click(screen.getByText('Export'));

    expect(screen.getByText(/Spreadsheet/i)).toBeInTheDocument();
  });

  // ============================================================
  // UI STRUCTURE TESTS
  // ============================================================

  test('renders analytics stats section', () => {
    render(<Analytics />);

    expect(document.querySelector('.analytics__stats')).toBeInTheDocument();
  });

  test('renders analytics bottom section', () => {
    render(<Analytics />);

    expect(document.querySelector('.analytics__bottom')).toBeInTheDocument();
  });

  test('renders exactly 4 stat cards', () => {
    render(<Analytics />);

    const statCards = document.querySelectorAll('.stat-card');
    expect(statCards.length).toBe(4);
  });

  test('renders exactly 5 top selling items', () => {
    render(<Analytics />);

    const items = document.querySelectorAll('.top-item');
    expect(items.length).toBe(5);
  });

});