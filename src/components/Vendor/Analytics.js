import React, { useState } from 'react';
import './Analytics.css';

const PERIODS = ['Today', 'This Week', 'This Month'];

const DATA = {
  'Today': {
    revenue: 1284.50,
    orders: 18,
    completed: 14,
    cancelled: 2,
    customers: 16,
    hourly: [
      { label: '8am',  value: 3 },
      { label: '9am',  value: 5 },
      { label: '10am', value: 2 },
      { label: '11am', value: 4 },
      { label: '12pm', value: 8 },
      { label: '1pm',  value: 7 },
      { label: '2pm',  value: 4 },
      { label: '3pm',  value: 3 },
      { label: '4pm',  value: 5 },
      { label: '5pm',  value: 6 },
    ],
    topItems: [
      { name: 'Grilled Chicken Burger', sold: 24, revenue: 2159.76 },
      { name: 'Beef Stew & Rice',       sold: 18, revenue: 1799.82 },
      { name: 'Cheese Fries',           sold: 15, revenue:  524.85 },
      { name: 'Veggie Wrap',            sold: 11, revenue:  769.89 },
      { name: 'Fresh Orange Juice',     sold: 9,  revenue:  269.91 },
    ],
  },
  'This Week': {
    revenue: 8942.00,
    orders: 126,
    completed: 109,
    cancelled: 10,
    customers: 98,
    hourly: [
      { label: 'Mon', value: 14 },
      { label: 'Tue', value: 18 },
      { label: 'Wed', value: 22 },
      { label: 'Thu', value: 19 },
      { label: 'Fri', value: 28 },
      { label: 'Sat', value: 35 },
      { label: 'Sun', value: 30 },
    ],
    topItems: [
      { name: 'Grilled Chicken Burger', sold: 98,  revenue: 8819.02 },
      { name: 'Beef Stew & Rice',       sold: 74,  revenue: 7399.26 },
      { name: 'Cheese Fries',           sold: 63,  revenue: 2204.37 },
      { name: 'Veggie Wrap',            sold: 51,  revenue: 3569.49 },
      { name: 'Fresh Orange Juice',     sold: 44,  revenue: 1319.56 },
    ],
  },
  'This Month': {
    revenue: 34210.75,
    orders: 512,
    completed: 468,
    cancelled: 28,
    customers: 389,
    hourly: [
      { label: 'Wk 1', value: 110 },
      { label: 'Wk 2', value: 128 },
      { label: 'Wk 3', value: 142 },
      { label: 'Wk 4', value: 132 },
    ],
    topItems: [
      { name: 'Grilled Chicken Burger', sold: 380, revenue: 34199.20 },
      { name: 'Beef Stew & Rice',       sold: 294, revenue: 29394.06 },
      { name: 'Cheese Fries',           sold: 241, revenue:  8430.59 },
      { name: 'Veggie Wrap',            sold: 198, revenue: 13860.02 },
      { name: 'Fresh Orange Juice',     sold: 167, revenue:  5006.33 },
    ],
  },
};

function Analytics() {
  const [period, setPeriod] = useState('Today');
  const d = DATA[period];

  const maxBar = Math.max(...d.hourly.map(h => h.value));
  const maxSold = d.topItems[0]?.sold || 1;
  const completionRate = Math.round((d.completed / d.orders) * 100);

  return (
    <article className="analytics">

      <header className="analytics__header">
        <h1>Analytics</h1>
        <nav className="period-tabs">
          {PERIODS.map(p => (
            <button
              key={p}
              className={`period-tab ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </nav>
      </header>

      <section className="analytics__stats">
        <article className="stat-card">
          <p className="stat-card__label">Revenue</p>
          <h2 className="stat-card__value">R {d.revenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</h2>
        </article>
        <article className="stat-card">
          <p className="stat-card__label">Total Orders</p>
          <h2 className="stat-card__value">{d.orders}</h2>
        </article>
        <article className="stat-card">
          <p className="stat-card__label">Completion Rate</p>
          <h2 className="stat-card__value">{completionRate}%</h2>
        </article>
        <article className="stat-card">
          <p className="stat-card__label">Customers Served</p>
          <h2 className="stat-card__value">{d.customers}</h2>
        </article>
      </section>

      <section className="analytics__bottom">

        <section className="analytics__card analytics__card--chart">
          <h2>Orders Overview</h2>
          <ul className="bar-chart">
            {d.hourly.map((h, i) => (
              <li key={i} className="bar-col">
                <figure className="bar-track">
                  <b
                    className="bar-fill"
                    style={{ height: `${(h.value / maxBar) * 100}%` }}
                    title={`${h.value} orders`}
                  />
                </figure>
                <small className="bar-label">{h.label}</small>
                <output className="bar-value">{h.value}</output>
              </li>
            ))}
          </ul>

          <ul className="orders-breakdown">
            <li className="breakdown-item breakdown-item--completed">
              <i className="dot" /> Completed: {d.completed}
            </li>
            <li className="breakdown-item breakdown-item--cancelled">
              <i className="dot" /> Cancelled: {d.cancelled}
            </li>
            <li className="breakdown-item breakdown-item--pending">
              <i className="dot" /> Other: {d.orders - d.completed - d.cancelled}
            </li>
          </ul>
        </section>

        <section className="analytics__card analytics__card--items">
          <h2>Top Selling Items</h2>
          <ul className="top-items">
            {d.topItems.map((item, i) => (
              <li key={i} className="top-item">
                <header className="top-item__info">
                  <b className="top-item__rank">#{i + 1}</b>
                  <strong className="top-item__name">{item.name}</strong>
                </header>
                <figure className="top-item__bar-wrap">
                  <b
                    className="top-item__bar"
                    style={{ width: `${(item.sold / maxSold) * 100}%` }}
                  />
                </figure>
                <footer className="top-item__meta">
                  <data value={item.sold}>{item.sold} sold</data>
                  <data value={item.revenue.toFixed(2)}>R {item.revenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</data>
                </footer>
              </li>
            ))}
          </ul>
        </section>

      </section>
    </article>
  );
}

export default Analytics;
