import React, { useState } from 'react';
import './Sidebar.css';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(true); 

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  }; 
  return(
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <button className="toggle-btn" onClick={toggleSidebar} aria-label="Toggle sidebar">
        <span className="line"></span>
        <span className="line"></span>
      </button>

      {isOpen && (
        <nav className="sidebar-menu" aria-label="Sidebar navigation">
          <ul>
            <li>Home</li>
            <li>Menu</li>
            <li>Orders</li>
            <li>Profile</li>
          </ul>
        </nav>
      )}
    </aside>
  );
};

export default Sidebar;