import React from 'react';
import './Sidebar.css';

export default function Sidebar({ activePage, setActivePage }) {
  return (
    <aside className="sidebar">

      <nav className="sidebar-menu">
        <ul>
          <li>
            <button
              className={activePage === 'shops' ? 'active' : ''}
              onClick={() => setActivePage('shops')}
            >
              Home
            </button>
          </li>

          <li>
            <button
              className={activePage === 'orders' ? 'active' : ''}
              onClick={() => setActivePage('orders')}
            >
              Orders
            </button>
          </li>

          <li>
            <button
              className={activePage === 'notifications' ? 'active' : ''}
              onClick={() => setActivePage('notifications')}
            >
              Notifications
            </button>
          </li>

          <li>
            <button
              className={activePage === 'profile' ? 'active' : ''}
              onClick={() => setActivePage('profile')}
            >
              Manage Profile
            </button>
          </li>
        </ul>
      </nav>

      <footer className="sidebar-footer">
        <small>© 2026 UniEats</small>
      </footer>

    </aside>
  );
}

