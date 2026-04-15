import React, { useState } from 'react';
import '../css/Profile.css';

export default function Profile({ setActivePage }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: 'Nicolene Nndwamato',
    phone: '+27637586352',
    email: 'nicoleenenndwamato103@gmail.com',
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <main className="profile page">
      <header className="">
      <h1>Personal info</h1>
        
        <button
          className="logout"
          type="button"
          onClick={() => setActivePage('logout')}
        >
          Logout
        </button>
      </header>

      

      <figure className="avatar-wrapper">
        <div className="avatar" role="img" aria-label="Profile picture">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
          </svg>
          <button className="avatar-edit" type="button">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </button>
        </div>
      </figure>

      {editing ? (
        <form
          className="edit-form"
          onSubmit={(e) => {
            e.preventDefault();
            setEditing(false);
          }}
        >
          <label htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
          />

          <label htmlFor="phone">Phone number</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
          />

          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
          />

          <div className="form-actions">
            <button className="save-btn" type="submit">Save</button>
            <button
              className="cancel-btn"
              type="button"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <section className="details">

          <article
            className="info-row"
            onClick={() => setEditing(true)}
          >
            <div>
              <h4>Name</h4>
              <p>{form.name}</p>
            </div>
            <span>›</span>
          </article>

          <article
            className="info-row"
            onClick={() => setEditing(true)}
          >
            <div>
              <h4>Phone</h4>
              <p>{form.phone}</p>
            </div>
            <span>›</span>
          </article>

          <article
            className="info-row"
            onClick={() => setEditing(true)}
          >
            <div>
              <h4>Email</h4>
              <p>{form.email}</p>
            </div>
            <span>›</span>
          </article>

        </section>
      )}

      <aside className="danger">
        <h2>Danger Zone</h2>
        <button className="delete" type="button">
          Delete Account
        </button>
      </aside>

    </main>
  );
}