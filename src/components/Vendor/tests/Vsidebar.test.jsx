import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from '../VenSidebar';

jest.mock('../Sidebar.css', () => ({}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Sidebar – rendering', () => {
  it('renders the toggle button', () => {
    render(<Sidebar />);
    expect(screen.getByRole('button', { name: /toggle sidebar/i })).toBeInTheDocument();
  });

  it('renders the nav menu when open by default', () => {
    render(<Sidebar />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders all four nav items when open', () => {
    render(<Sidebar />);
    expect(screen.getByText('Menu Management')).toBeInTheDocument();
    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Account Settings')).toBeInTheDocument();
  });

  it('renders navigation with proper aria-label', () => {
    render(<Sidebar />);
    expect(screen.getByRole('navigation', { name: /vendor navigation/i })).toBeInTheDocument();
  });

  it('renders nav items as a list', () => {
    render(<Sidebar />);
    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();
    expect(list.children).toHaveLength(4);
  });

  it('renders toggle button with hamburger icon lines', () => {
    render(<Sidebar />);
    const button = screen.getByRole('button', { name: /toggle sidebar/i });
    const lines = button.querySelectorAll('.line');
    expect(lines).toHaveLength(2);
  });

  it('renders the sidebar with correct base class', () => {
    render(<Sidebar />);
    const aside = document.querySelector('aside');
    expect(aside).toHaveClass('sidebar');
    expect(aside).toHaveClass('open');
  });

  it('renders the sidebar with correct base class when closed', async () => {
    render(<Sidebar />);
    await userEvent.click(screen.getByRole('button', { name: /toggle sidebar/i }));
    const aside = document.querySelector('aside');
    expect(aside).toHaveClass('sidebar');
    expect(aside).toHaveClass('closed');
    expect(aside).not.toHaveClass('open');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Sidebar – toggle behaviour', () => {
  it('hides the nav when the toggle button is clicked', async () => {
    render(<Sidebar />);
    await userEvent.click(screen.getByRole('button', { name: /toggle sidebar/i }));
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('applies the "closed" class to the aside when collapsed', async () => {
    render(<Sidebar />);
    await userEvent.click(screen.getByRole('button', { name: /toggle sidebar/i }));
    expect(document.querySelector('aside')).toHaveClass('closed');
  });

  it('re-shows the nav on a second toggle click', async () => {
    render(<Sidebar />);
    const btn = screen.getByRole('button', { name: /toggle sidebar/i });
    await userEvent.click(btn);
    await userEvent.click(btn);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('keeps the toggle button visible when sidebar is closed', async () => {
    render(<Sidebar />);
    await userEvent.click(screen.getByRole('button', { name: /toggle sidebar/i }));
    expect(screen.getByRole('button', { name: /toggle sidebar/i })).toBeInTheDocument();
  });

  it('hides nav items when sidebar is closed', async () => {
    render(<Sidebar />);
    await userEvent.click(screen.getByRole('button', { name: /toggle sidebar/i }));
    expect(screen.queryByText('Menu Management')).not.toBeInTheDocument();
    expect(screen.queryByText('Orders')).not.toBeInTheDocument();
  });

  it('does not render navigation when sidebar is closed', async () => {
    render(<Sidebar />);
    await userEvent.click(screen.getByRole('button', { name: /toggle sidebar/i }));
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('does not render list when sidebar is closed', async () => {
    render(<Sidebar />);
    await userEvent.click(screen.getByRole('button', { name: /toggle sidebar/i }));
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});