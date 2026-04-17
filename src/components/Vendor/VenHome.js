import React from 'react';
import './VenHome.css';

function VenHome({ storeName }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' :
                'Good evening';

  return (
    <section className="ven-home">

      <header className="ven-home__header">
        <h1 className="ven-home__greeting">{greeting}, {storeName || 'Chef'} 👋</h1>
        <p className="ven-home__sub">Here is a quick look at how your store is doing today.</p>
      </header>

      <section className="ven-home__stats" aria-label="Quick stats">
        <article className="stat-card">
          <h2>0</h2>
          <p>New Orders</p>
        </article>
        <article className="stat-card">
          <h2>0</h2>
          <p>Menu Items</p>
        </article>
        <article className="stat-card">
          <h2>R 0.00</h2>
          <p>Today's Revenue</p>
        </article>
        <article className="stat-card">
          <h2>0</h2>
          <p>Customers Served</p>
        </article>
      </section>

      <section className="ven-home__tip" aria-label="Tip">
        <p>Use the sidebar to manage your menu, track orders, and view analytics.</p>
      </section>

    </section>
  );
}

export default VenHome;
