import React from "react";
import "./styles.css";

const AdminDashboard = ({ setActivePage }) => {
  return (
    <section className="dashboard-container">
      <aside>
        <h2>Admin</h2>
        <nav aria-label="Admin navigation">
          <ul>
            <li><button onClick={() => {}}>Dashboard</button></li>
            <li><button onClick={() => {}}>Orders</button></li>
            <li><button onClick={() => setActivePage('admin-vendor-management')}>Vendors</button></li>
            <li><button onClick={() => {}}>Users</button></li>
            <li><button onClick={() => {}}>Payments</button></li>
            <li><button onClick={() => {}}>Settings</button></li>
          </ul>
        </nav>
      </aside>

      <main>
        <header>
          <h1>Dashboard</h1>
        </header>

        <section className="cards" aria-label="Summary statistics">
          <article>
            <h3>Total Orders</h3>
            <p>120</p>
          </article>
          <article>
            <h3>Revenue</h3>
            <p>R5,000</p>
          </article>
          <article>
            <h3>New Users</h3>
            <p>10</p>
          </article>
        </section>

        <section aria-labelledby="recent-orders-heading">
          <h2 id="recent-orders-heading">Recent Orders</h2>
          <table>
            <thead>
              <tr>
                <th scope="col">Order ID</th>
                <th scope="col">Customer</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>#001</td>
                <td>John</td>
                <td>Delivered</td>
              </tr>
              <tr>
                <td>#002</td>
                <td>Alice</td>
                <td>Pending</td>
              </tr>
              <tr>
                <td>#003</td>
                <td>Mike</td>
                <td>Cancelled</td>
              </tr>
            </tbody>
          </table>
        </section>

        <footer>
          <small>© 2026 UniEats</small>
        </footer>
      </main>
    </section>
  );
};

export default AdminDashboard;
