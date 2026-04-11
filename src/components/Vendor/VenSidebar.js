import React, { useState } from 'react';
import './Sidebar.css';
//import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(true);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <button className="toggle-btn" onClick={toggleSidebar} aria-label="Toggle sidebar">
        <span className="line"></span>
        <span className="line"></span>
      </button>

      {isOpen && (
        <nav className="sidebar-menu" aria-label="Vendor navigation">
          <ul>
            <li>Menu Management</li>
            <li>Orders</li>
            <li>Analytics</li>
            <li>Account Settings</li>
          </ul>
        </nav>
      )}
    </aside>
  );
};

export default Sidebar;
