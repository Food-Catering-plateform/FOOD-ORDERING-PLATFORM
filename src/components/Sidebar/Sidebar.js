import React from 'react';
import './Sidebar.css';

const menuItems = [
  { label: 'Home', page: 'shops' },
  { label: 'Orders', page: 'orders' },
  { label: 'Notifications', page: 'notifications' },
  { label: 'Manage Profile', page: 'profile'},
];


export default function Sidebar({ setActivePage, activePage, sidebarOpen, toggleSidebar }) {
  const handleNavigate = (page) => {
    setActivePage(page);
  };

  return (
    <>
      <button
        className={`toggle-btn ${sidebarOpen ? 'is-open' : ''}`}
        onClick={toggleSidebar}
        type="button"
        aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={sidebarOpen}
        aria-controls="sidebar-nav"
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>

      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        aria-hidden="true"
      />

      <aside
        id="sidebar-nav"
        className={`sidebar ${sidebarOpen ? 'open' : ''}`}
        aria-label="Main navigation"
        aria-hidden={!sidebarOpen}
      >
        <nav className="sidebar-menu">
          <ul role="list">
            {menuItems.map(({ label, page, icon }) => (
              <li key={page}>
                <button
                  type="button"
                  className={activePage === page ? 'active' : ''}
                  onClick={() => handleNavigate(page)}
                  aria-current={activePage === page ? 'page' : undefined}
                >
                  <span aria-hidden="true">{icon}</span>
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <footer className="sidebar-footer">
          <small>© 2026 Your App</small>
        </footer>
      </aside>
    </>
  );
}