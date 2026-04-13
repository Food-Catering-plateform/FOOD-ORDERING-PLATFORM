import React from 'react';
import './Navbar.css';
import { assets } from '../../Assets/assets';

export default function Navbar({ setActivePage }) {
  return (
    <header className="navbar">

      <a href="#" className="logo-area">
        <img src={assets.colourlesslogo} alt="Logo" className="logo" />
      </a>

      <form className="search-bar" role="search">
        <input type="search" placeholder="Search..." />
      </form>

      <nav className="nav-actions" aria-label="User actions">

        <button onClick={() => setActivePage('basket')}>
          <img src={assets.trolly} alt="Basket" />
        </button>

       

      </nav>

    </header>
  );
}