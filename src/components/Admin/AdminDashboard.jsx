import React from "react";
import "./styles.css";

const AdminDashboard = () => {
  return (
    <div className="dashboard-container">
      <aside>
        <h2>Admin</h2>
        <nav>
          <ul>
            <li>Dashboard</li>
            <li>Orders</li>
            <li>Restaurants</li>
            <li>Users</li>
            <li>Payments</li>
            <li>Settings</li>
          </ul>
        </nav>
      </aside>

      <main>
        <header>
          <h1>Dashboard</h1>
        </header>

        <section className="cards">
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

        <section>
          <h2>Recent Orders</h2>

          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Status</th>
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

        <footer>© 2026 UniEats</footer>
      </main>
    </div>
  );
};

export default AdminDashboard;
