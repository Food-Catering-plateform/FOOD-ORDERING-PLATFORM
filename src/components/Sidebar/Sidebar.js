import React from 'react';
import './Sidebar.css';

const NAV_ITEMS = [
  { page: 'shops',         label: 'Home',           icon: '🏠' },
  { page: 'orders',        label: 'Orders',          icon: '📦' },
  { page: 'notifications', label: 'Notifications',   icon: '🔔' },
  { page: 'profile',       label: 'Manage Profile',  icon: '👤' },
];

export default function Sidebar({ activePage, setActivePage, sidebarOpen, toggleSidebar }) {
  return (
    <>
      {/* Hamburger toggle — always visible */}
      <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Dim overlay on mobile when sidebar is open */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar} />
      )}

      {/* Sidebar drawer */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : 'sidebar--closed'}`}>
        <nav className="sidebar-menu">
          <ul>
            {NAV_ITEMS.map(({ page, label, icon }) => (
              <li key={page}>
                <button
                  className={`sidebar__item ${activePage === page ? 'active' : ''}`}
                  onClick={() => {
                    setActivePage(page);
                    // Auto-close on mobile after picking a page
                    if (window.innerWidth < 768) toggleSidebar();
                  }}
                >
                  <span className="sidebar__icon">{icon}</span>
                  <span className="sidebar__label">{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <footer className="sidebar-footer">
          <small>© 2026 UniEats</small>
        </footer>
      </aside>
    </>
  );
}