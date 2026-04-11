import React from 'react';
import '../css/Orders.css';
const Orders = () => {
  return (
    <main>
      <section className="page">
        <h1>Orders</h1>

        <article>
          <h3>Pending Orders</h3>
          <ul>
            <li>Order #123 - Processing</li>
            <li>Order #124 - Ready for collection</li>
          </ul>
        </article>

        <article>
          <h3>Past Orders</h3>
          <ul>
            <li>Order #120 - Collected</li>
            <li>Order #119 - Completed</li>
          </ul>
        </article>
      </section>
    </main>
  );
};

export default Orders;