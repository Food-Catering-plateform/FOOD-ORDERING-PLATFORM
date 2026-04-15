import React from 'react';
import './Navbar.css';
import { assets } from '../../Assets/assets';

export default function Navbar({ setActivePage }) {
  return (
    <header className="navbar">

      <img src={assets.colourlesslogo} alt="logo" className="logo" />

      <form className="search-bar">
        <input type="search" placeholder="Search" />
      </form>

      <nav className="nav-actions">
        <button onClick={() => setActivePage('basket')}>
          <img src={assets.trolly} alt="cart" />
        </button>
      </nav>

    </header>
  );
}