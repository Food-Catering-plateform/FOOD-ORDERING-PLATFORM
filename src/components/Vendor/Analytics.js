import React, { useState, useEffect } from 'react';
import './Analytics.css';
import { db } from '../../Firebase/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../Services/AuthContext';

const PERIODS = ['Today', 'This Week', 'This Month'];

// returns the Date object representing the start of the selected period
// used to filter orders that fall within Today / This Week / This Month
function getPeriodStart(period) {
  const now = new Date();
  if (period === 'Today')      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'This Month') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === 'This Week') {
    // week starts on Monday — getDay() returns 0=Sun so we shift accordingly
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff);
  }
}

// builds the bar chart data depending on the period:
// Today → one bar per hour (8am–5pm)
// This Week → one bar per day (Mon–Sun)
// This Month → one bar per week (Wk 1–4)
function buildBarChart(orders, period) {
  if (period === 'Today') {
    const labels = ['8am','9am','10am','11am','12pm','1pm','2pm','3pm','4pm','5pm'];
    const counts = new Array(10).fill(0);
    orders.forEach(o => {
      const h = new Date(o.createdAt || o.time).getHours();
      if (h >= 8 && h <= 17) counts[h - 8]++;
    });
    return labels.map((label, i) => ({ label, value: counts[i] }));
  }
  if (period === 'This Week') {
    const labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const counts = new Array(7).fill(0);
    orders.forEach(o => {
      const day = new Date(o.createdAt || o.time).getDay(); // 0=Sun
      // shift so Mon=0, Sun=6
      counts[day === 0 ? 6 : day - 1]++;
    });
    return labels.map((label, i) => ({ label, value: counts[i] }));
  }
  if (period === 'This Month') {
    const labels = ['Wk 1','Wk 2','Wk 3','Wk 4'];
    const counts = new Array(4).fill(0);
    orders.forEach(o => {
      const date = new Date(o.createdAt || o.time).getDate();
      // clamp to 3 so dates in the 29th–31st still fall into Wk 4
      counts[Math.min(Math.floor((date - 1) / 7), 3)]++;
    });
    return labels.map((label, i) => ({ label, value: counts[i] }));
  }
  return [];
}

// aggregates all items sold across orders in the period and returns top 5 by qty sold
function buildTopItems(orders) {
  const map = {};
  orders.forEach(o => {
    (o.items || []).forEach(item => {
      if (!map[item.name]) map[item.name] = { sold: 0, revenue: 0 };
      map[item.name].sold    += item.qty;
      map[item.name].revenue += item.qty * item.price;
    });
  });
  return Object.entries(map)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);
}

function Analytics() {
  const { vendorId } = useAuth();
  const [period, setPeriod]   = useState('Today');
  const [loading, setLoading] = useState(true);
  // data holds computed stats for all three periods so switching tabs is instant (no re-fetch)
  const [data, setData]       = useState(null);

  useEffect(() => {
    if (!vendorId) return;

    const fetchAnalytics = async () => {
      setLoading(true);

      // fetch ALL orders for this vendor once, then slice by period in JS
      // avoids making 3 separate Firestore queries every time the tab changes
      const snap = await getDocs(
        query(collection(db, 'Orders'), where('vendorID', '==', vendorId))
      );
      const allOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      const result = {};
      for (const p of PERIODS) {
        const start        = getPeriodStart(p);
        // filter to only orders that started on or after the period start
        const periodOrders = allOrders.filter(o => new Date(o.createdAt || o.time) >= start);

        const completed = periodOrders.filter(o => o.status === 'completed');
        const cancelled = periodOrders.filter(o => o.status === 'cancelled').length;
        // revenue only counts completed orders — pending/cancelled don't count as earned
        const revenue   = completed.reduce((sum, o) => sum + (o.total || 0), 0);
        // unique customers = unique customerIds on completed orders (Set removes duplicates)
        const customers = new Set(completed.map(o => o.customerId)).size;

        result[p] = {
          revenue,
          orders:    periodOrders.length,
          completed: completed.length,
          cancelled,
          customers,
          hourly:    buildBarChart(periodOrders, p),
          topItems:  buildTopItems(periodOrders),
        };
      }

      setData(result);
      setLoading(false);
    };

    fetchAnalytics();
  }, [vendorId]);

  if (loading || !data) {
    return <article className="analytics"><p style={{ padding: '20px' }}>Loading analytics...</p></article>;
  }

  const d              = data[period];
  // guard against dividing by zero when there are no orders yet
  const maxBar         = Math.max(...d.hourly.map(h => h.value), 1);
  const maxSold        = d.topItems[0]?.sold || 1;
  const completionRate = d.orders > 0 ? Math.round((d.completed / d.orders) * 100) : 0;

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
          {d.topItems.length === 0 ? (
            <p style={{ color: '#888', fontSize: '0.9rem' }}>No sales data yet for this period.</p>
          ) : (
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
          )}
        </section>

      </section>
    </article>
  );
}

export default Analytics;
