import React from 'react';
import './Navbar.css';
import { assets } from '../../Assets/assets';

export default function Navbar({ setActivePage, search, setSearch }) {
  return (
    <header className="navbar">

      <img src={assets.colourlesslogo} alt="logo" className="logo" />

      {/* Search — only shown when setSearch is provided (customer pages) */}
      {setSearch && (
        <div className="navbar-search">
          <span className="navbar-search__icon">🔍</span>
          <input
            className="navbar-search__input"
            type="search"
            placeholder="Search shops or food..."
            value={search || ''}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="navbar-search__clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
      )}

      <nav className="nav-actions">
        <button onClick={() => setActivePage('basket')}>
          <img src={assets.trolly} alt="cart" />
        </button>
      </nav>

    </header>
  );
}