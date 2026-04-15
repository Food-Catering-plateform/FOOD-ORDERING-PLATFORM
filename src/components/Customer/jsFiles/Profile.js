import React, { useState } from 'react';
import '../css/Profile.css';

export default function Profile({ setActivePage }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = (e) => {
    e.preventDefault();
    setEditing(false);
  };

  return (
    <main className="profile-page">
      <header className="profile-header">
        <h1>Personal Information</h1>
        <button className="logout-btn" onClick={() => setActivePage('login')}>
          Logout
        </button>
      </header>

      <section className="avatar-section">
        <figure className="avatar-wrapper">
          <div className="avatar">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
          </div>
          <button className="avatar-edit-btn" type="button" aria-label="Edit profile picture">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </button>
        </figure>
      </section>

      {editing ? (
        <form className="edit-form" onSubmit={handleSave}>
          <fieldset>
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
            />
          </fieldset>

          <fieldset>
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
            />
          </fieldset>

          <fieldset>
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
            />
          </fieldset>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button type="submit" className="save-btn">
              Save Changes
            </button>
          </div>
        </form>
      ) : (
        <section className="info-section">
          <article className="info-row" onClick={() => setEditing(true)}>
            <header>
              <span className="label">Full Name</span>
              <p className="value">{form.name}</p>
            </header>
            <span className="arrow">›</span>
          </article>

          <article className="info-row" onClick={() => setEditing(true)}>
            <header>
              <span className="label">Phone Number</span>
              <p className="value">{form.phone}</p>
            </header>
            <span className="arrow">›</span>
          </article>

          <article className="info-row" onClick={() => setEditing(true)}>
            <header>
              <span className="label">Email Address</span>
              <p className="value">{form.email}</p>
            </header>
            <span className="arrow">›</span>
          </article>
        </section>
      )}

      <section className="danger-zone">
        <h2>Danger Zone</h2>
        <p className="danger-desc">Once you delete your account, there is no going back.</p>
        <button className="delete-account-btn" type="button">
          Delete My Account
        </button>
      </section>
    </main>
  );
}