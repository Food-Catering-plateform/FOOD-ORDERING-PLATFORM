import React from 'react';
import './Navbar.css';
import { assets } from '../../Assets/assets';

const Navbar = () => {
  return (
    <header className="navbar">
      
      <section className="navbar-left">
        <img src={assets.colourlesslogo} alt="Logo" className="logo" />
      </section>

      <section className="navbar-center">
        <input
          type="search"
          placeholder="Search..."
          className="search-input"
        />
      </section>

      <nav className="navbar-right">
        <img src={assets.notificationbell} alt="Notifications" className="icon" />
        <img src={assets.trolly} alt="Basket" className="icon" />
        <img src={assets.profile} alt="Profile" className="profile-pic" />
      </nav>

    </header>
  );
};

export default Navbar;