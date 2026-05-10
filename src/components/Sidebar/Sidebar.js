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
    <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : 'sidebar--collapsed'}`}>

      {/* Toggle button */}
      <button className="sidebar__toggle" onClick={toggleSidebar} title="Toggle menu">
        {sidebarOpen ? '◀' : '▶'}
      </button>

      <nav className="sidebar-menu">
        <ul>
          {NAV_ITEMS.map(({ page, label, icon }) => (
            <li key={page}>
              <button
                className={`sidebar__item ${activePage === page ? 'active' : ''}`}
                onClick={() => setActivePage(page)}
                title={label}
              >
                <span className="sidebar__icon">{icon}</span>
                {sidebarOpen && <span className="sidebar__label">{label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {sidebarOpen && (
        <footer className="sidebar-footer">
          <small>© 2026 UniEats</small>
        </footer>
      )}

    </aside>
  );
}