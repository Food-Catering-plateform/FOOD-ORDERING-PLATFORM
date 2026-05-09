import React, { useState, useEffect } from "react";
import "./styles.css";
import { auth, db } from "../../Firebase/firebaseConfig";
import { signOut } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";

// ─── Analytics helpers (Fixed for your requirements) ──────────────

const PERIODS = ['Today', 'This Week', 'This Month'];

function getPeriodStart(period) {
  const now = new Date();
  if (period === 'Today')      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'This Month') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === 'This Week') {
    const day  = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff);
  }
  return new Date(0);
}

// FIXED: Expanded to 7am-8pm to meet "Peak Hours" requirement
function buildBarChart(orders, period) {
  if (period === 'Today') {
    const labels = ['7am','8am','9am','10am','11am','12pm','1pm','2pm','3pm','4pm','5pm','6pm','7pm','8pm'];
    const counts = new Array(labels.length).fill(0);
    orders.forEach(o => {
      const h = new Date(o.createdAt || o.time).getHours();
      if (h >= 7 && h <= 20) counts[h - 7]++;
    });
    return labels.map((label, i) => ({ label, value: counts[i] }));
  }
  if (period === 'This Week') {
    const labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const counts = new Array(7).fill(0);
    orders.forEach(o => {
      const day = new Date(o.createdAt || o.time).getDay();
      counts[day === 0 ? 6 : day - 1]++;
    });
    return labels.map((label, i) => ({ label, value: counts[i] }));
  }
  if (period === 'This Month') {
    const labels = ['Wk 1','Wk 2','Wk 3','Wk 4'];
    const counts = new Array(4).fill(0);
    orders.forEach(o => {
      const date = new Date(o.createdAt || o.time).getDate();
      counts[Math.min(Math.floor((date - 1) / 7), 3)]++;
    });
    return labels.map((label, i) => ({ label, value: counts[i] }));
  }
  return [];
}

// NEW: Added to meet "Sales per Vendor" requirement
function buildVendorSales(orders) {
  const map = {};
  orders.forEach(o => {
    const vendorName = o.vendorName || 'Unknown Vendor';
    if (!map[vendorName]) map[vendorName] = { orders: 0, revenue: 0 };
    map[vendorName].orders++;
    map[vendorName].revenue += (o.total || 0);
  });
  return Object.entries(map)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue);
}

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

// ─── Analytics Section ────────────────────────────────────────────

function AnalyticsSection() {
  const [period, setPeriod]   = useState('Today');
  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const snap      = await getDocs(collection(db, 'Orders'));
        const allOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        const result = {};
        for (const p of PERIODS) {
          const start        = getPeriodStart(p);
          const periodOrders = allOrders.filter(o => new Date(o.createdAt || o.time) >= start);
          const completed    = periodOrders.filter(o => o.status === 'completed');
          const cancelled    = periodOrders.filter(o => o.status === 'cancelled').length;
          const revenue      = completed.reduce((sum, o) => sum + (o.total || 0), 0);
          const customers    = new Set(completed.map(o => o.customerId)).size;

          result[p] = {
            revenue,
            orders:    periodOrders.length,
            completed: completed.length,
            cancelled,
            customers,
            hourly:      buildBarChart(periodOrders, p),
            topItems:    buildTopItems(periodOrders),
            vendorSales: buildVendorSales(periodOrders), // Added this
          };
        }
        setData(result);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      }
      setLoading(false);
    };
    fetchAnalytics();
  }, []);

  if (loading || !data) return <p style={{ padding: '20px' }}>Loading analytics...</p>;

  const d              = data[period];
  const maxBar         = Math.max(...d.hourly.map(h => h.value), 1);
  const maxSold        = d.topItems[0]?.sold || 1;
  const completionRate = d.orders > 0 ? Math.round((d.completed / d.orders) * 100) : 0;

  return (
    <section>
      <nav style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {PERIODS.map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              background: period === p ? '#1e1e2f' : '#fff',
              color: period === p ? '#fff' : '#333',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {p}
          </button>
        ))}
      </nav>

      <section className="cards" style={{ marginBottom: '24px' }}>
        <article>
          <h3>Revenue</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
            R {d.revenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
          </p>
        </article>
        <article>
          <h3>Total Orders</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{d.orders}</p>
        </article>
        <article>
          <h3>Completion Rate</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{completionRate}%</p>
        </article>
        <article>
          <h3>Customers Served</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{d.customers}</p>
        </article>
      </section>

      <section className="cards">
        <article style={{ flex: 2, minWidth: '280px' }}>
          <h3>Orders Overview (Peak Hours)</h3>
          <ul style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '140px', marginBottom: '8px', listStyle: 'none', padding: 0, margin: 0 }}>
            {d.hourly.map((h, i) => (
              <li key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <b style={{ fontSize: '0.65rem', marginBottom: '2px', fontWeight: 'normal' }}>{h.value || ''}</b>
                <meter
                  value={h.value}
                  max={maxBar}
                  title={`${h.value} orders`}
                  style={{ width: '100%', height: `${(h.value / maxBar) * 100}%`, appearance: 'none', background: '#1e1e2f', borderRadius: '4px 4px 0 0', minHeight: h.value ? '4px' : '0', display: 'block' }}
                />
                <small style={{ fontSize: '0.6rem', marginTop: '4px', color: '#666' }}>{h.label}</small>
              </li>
            ))}
          </ul>
        </article>

        <article style={{ flex: 1, minWidth: '220px' }}>
          <h3>Top Selling Items</h3>
          {d.topItems.length === 0 ? (
            <p style={{ color: '#888', fontSize: '0.9rem' }}>No sales data yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {d.topItems.map((item, i) => (
                <li key={i} style={{ marginBottom: '12px' }}>
                  <p style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.9rem', margin: '0 0 4px' }}>
                    <b>#{i + 1} {item.name}</b>
                    <small style={{ color: '#888' }}>{item.sold} sold</small>
                  </p>
                  <meter value={item.sold} max={maxSold} style={{ width: '100%', height: '6px', display: 'block' }} />
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      {/* FIXED: Added Sales per Vendor Table as required */}
      <section style={{ marginTop: '24px' }}>
        <article>
          <h3>Sales per Vendor</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                <th style={{ padding: '12px' }}>Vendor Name</th>
                <th style={{ padding: '12px' }}>Orders</th>
                <th style={{ padding: '12px' }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {d.vendorSales.length === 0 ? (
                <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No vendor data available.</td></tr>
              ) : (
                d.vendorSales.map((v, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>{v.name}</td>
                    <td style={{ padding: '12px' }}>{v.orders}</td>
                    <td style={{ padding: '12px' }}>R {v.revenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </article>
      </section>
    </section>
  );
}

// ─── Main AdminDashboard (Untouched Sidebar & Layout) ─────────────

const AdminDashboard = ({ setActivePage }) => {
  const [localPage, setLocalPage] = useState("dashboard");

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActivePage("login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <section className="dashboard-container">
      <aside>
        <h2>Admin</h2>
        <nav aria-label="Admin navigation">
          <ul>
            <li><button onClick={() => setLocalPage("dashboard")}>Dashboard</button></li>
            <li><button onClick={() => {}}>Orders</button></li>
            <li><button onClick={() => setActivePage('admin-vendor-management')}>Vendors</button></li>
            <li><button onClick={() => {}}>Users</button></li>
            <li><button onClick={() => {}}>Payments</button></li>
            <li><button onClick={() => {}}>Settings</button></li>
            <li><button onClick={() => setLocalPage("analytics")}>Analytics</button></li>
            <li><button onClick={handleLogout}>Logout</button></li>
          </ul>
        </nav>
      </aside>

      <main>
        <header>
          <h1>{localPage === 'analytics' ? 'Analytics' : 'Dashboard'}</h1>
        </header>

        {localPage === 'analytics' ? (
          <AnalyticsSection />
        ) : (
          <>
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
                  <tr><td>#001</td><td>John</td><td>Delivered</td></tr>
                  <tr><td>#002</td><td>Alice</td><td>Pending</td></tr>
                  <tr><td>#003</td><td>Mike</td><td>Cancelled</td></tr>
                </tbody>
              </table>
            </section>
          </>
        )}

        <footer>
          <small>© 2026 UniEats</small>
        </footer>
      </main>
    </section>
  );
};

export default AdminDashboard;
