import React from 'react';
import '../css/logout.css';

export default function Logout() {
  return (
    <main className="logout-page">
      <section className="logout-card">

        <h1>You’ve been logged out</h1>
        <p>Thank you for using the platform.</p>

        <div className="logout-actions">
          <button onClick={() => window.location.href = "/"}>
            Log in again
          </button>

          <button onClick={() => window.location.href = "/shops"}>
            Go to Shops
          </button>
        </div>

      </section>
    </main>
  );
}