import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Logout from './logout';

// ─── Mock CSS import ──────────────────────────────────────────────────────────
jest.mock('../css/logout.css', () => {});

// ─── Mock window.location ────────────────────────────────────────────────────
delete window.location;
window.location = { href: '' };

// ─── Helper ───────────────────────────────────────────────────────────────────
const renderLogout = () => render(<Logout />);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Logout Component', () => {

  beforeEach(() => {
    window.location.href = '';
  });

  // ── Rendering ───────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders without crashing', () => {
      renderLogout();
      expect(document.body).toBeTruthy();
    });

    it('renders the logout heading', () => {
      renderLogout();
      expect(
        screen.getByRole('heading', { name: /you.ve been logged out/i })
      ).toBeInTheDocument();
    });

    it('renders the thank-you message', () => {
      renderLogout();
      expect(
        screen.getByText(/thank you for using the platform/i)
      ).toBeInTheDocument();
    });

    it('renders the "Log in again" button', () => {
      renderLogout();
      expect(
        screen.getByRole('button', { name: /log in again/i })
      ).toBeInTheDocument();
    });

    it('renders the "Go to Shops" button', () => {
      renderLogout();
      expect(
        screen.getByRole('button', { name: /go to shops/i })
      ).toBeInTheDocument();
    });

    it('renders exactly two action buttons', () => {
      renderLogout();
      expect(screen.getAllByRole('button')).toHaveLength(2);
    });
  });

  // ── Structure / Semantic HTML ────────────────────────────────────────────────

  describe('Structure', () => {
    it('wraps the page in a <main> element', () => {
      renderLogout();
      expect(document.querySelector('main')).toBeInTheDocument();
    });

    it('applies the "logout-page" class to <main>', () => {
      renderLogout();
      expect(document.querySelector('main')).toHaveClass('logout-page');
    });

    it('renders a section with class "logout-card"', () => {
      renderLogout();
      expect(document.querySelector('section.logout-card')).toBeInTheDocument();
    });

    it('renders the action buttons inside "logout-actions" div', () => {
      renderLogout();
      const actionsDiv = document.querySelector('.logout-actions');
      expect(actionsDiv).toBeInTheDocument();
      expect(actionsDiv.querySelectorAll('button')).toHaveLength(2);
    });
  });

  // ── Navigation / Click Handlers ──────────────────────────────────────────────

  describe('Navigation', () => {
    it('navigates to "/" when "Log in again" is clicked', () => {
      renderLogout();
      fireEvent.click(screen.getByRole('button', { name: /log in again/i }));
      expect(window.location.href).toBe('/');
    });

    it('navigates to "/shops" when "Go to Shops" is clicked', () => {
      renderLogout();
      fireEvent.click(screen.getByRole('button', { name: /go to shops/i }));
      expect(window.location.href).toBe('/shops');
    });

    it('does not navigate when "Go to Shops" is not clicked', () => {
      renderLogout();
      // Only click login
      fireEvent.click(screen.getByRole('button', { name: /log in again/i }));
      expect(window.location.href).not.toBe('/shops');
    });

    it('does not navigate when "Log in again" is not clicked', () => {
      renderLogout();
      // Only click shops
      fireEvent.click(screen.getByRole('button', { name: /go to shops/i }));
      expect(window.location.href).not.toBe('/');
    });
  });

  // ── Snapshot ─────────────────────────────────────────────────────────────────

  describe('Snapshot', () => {
    it('matches the snapshot', () => {
      const { asFragment } = renderLogout();
      expect(asFragment()).toMatchSnapshot();
    });
  });
});