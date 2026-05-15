import React, { useEffect, useState, useRef } from 'react';
import './VenHome.css';
import { db } from '../../Firebase/firebaseConfig';
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../Services/AuthContext';

const TIPS = [
  { icon: 'fa-solid fa-clock', title: 'Peak hours tip', text: 'Orders spike between 12–2 PM. Make sure your menu is fully stocked before lunch.' },
  { icon: 'fa-solid fa-star', title: 'Boost visibility', text: 'Stores with photos on every menu item get 40% more clicks from students.' },
  { icon: 'fa-solid fa-bolt', title: 'Speed matters', text: 'Marking orders as "Preparing" within 2 minutes improves your store rating.' },
  { icon: 'fa-solid fa-tags', title: 'Promotions', text: 'Try bundling slow-moving items with popular ones to clear stock and delight customers.' },
];

function VenHome({ storeName, setActiveSection }) {
  const { vendorId } = useAuth();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' :
                'Good evening';

  const [liveTime, setLiveTime] = useState(() =>
    new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  const [liveDate, setLiveDate] = useState(() =>
    new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  );

  useEffect(() => {
    const tick = setInterval(() => {
      const now = new Date();
      setLiveTime(now.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setLiveDate(now.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const [stats, setStats] = useState({ newOrders: 0, menuItems: 0, revenue: 0, customers: 0 });
  const [orderBreakdown, setOrderBreakdown] = useState({ pending: 0, preparing: 0, completed: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [storeOpen, setStoreOpen] = useState(true);
  const [tipIndex, setTipIndex] = useState(0);

  const tip = TIPS[tipIndex];

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(i => (i + 1) % TIPS.length);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!vendorId) return;

    const vendorRef = doc(db, 'Vendors', vendorId);
    getDocs(collection(db, 'Vendors')).then(() => {}).catch(() => {});

    const unsubVendor = onSnapshot(vendorRef, (snap) => {
      if (snap.exists() && snap.data().isOpen !== undefined) {
        setStoreOpen(snap.data().isOpen);
      }
    });

    const q = query(collection(db, 'Orders'), where('vendorID', '==', vendorId));

    const unsubOrders = onSnapshot(q, async (snapshot) => {
      const orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      const today = new Date().toLocaleDateString('en-ZA');
      const todayOrders = orders.filter(o =>
        o.time?.startsWith(today) || o.time?.includes(new Date().toLocaleDateString())
      );

      const newOrders = orders.filter(o => o.status === 'pending').length;

      const revenue = todayOrders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + (o.total || 0), 0);

      const customers = new Set(
        todayOrders.filter(o => o.status === 'completed').map(o => o.customerId)
      ).size;

      const pending = orders.filter(o => o.status === 'pending').length;
      const preparing = orders.filter(o => o.status === 'preparing').length;
      const completed = todayOrders.filter(o => o.status === 'completed').length;

      const sorted = [...orders]
        .filter(o => o.time)
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 5);

      const menuSnap = await getDocs(collection(db, 'Vendors', vendorId, 'menuItems'));

      setStats({ newOrders, menuItems: menuSnap.size, revenue, customers });
      setOrderBreakdown({ pending, preparing, completed });
      setRecentOrders(sorted);
    });

    return () => { unsubOrders(); unsubVendor(); };
  }, [vendorId]);

  const toggleStore = async () => {
    const next = !storeOpen;
    setStoreOpen(next);
    try {
      await updateDoc(doc(db, 'Vendors', vendorId), { isOpen: next });
    } catch {
    }
  };

  const formatOrderTime = (timeStr) => {
    if (!timeStr) return '—';
    const d = new Date(timeStr);
    if (isNaN(d)) return timeStr.split(',')[1]?.trim() || timeStr;
    return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  };

  const getInitial = (order) => {
    const id = order.customerId || order.id || '?';
    return String(id).charAt(0).toUpperCase();
  };

  return (
    <section className="ven-home">

      <header className="ven-home__header">
        <span className="ven-home__header-geo ven-home__header-geo--ring" aria-hidden="true" />
        <span className="ven-home__header-geo ven-home__header-geo--ring2" aria-hidden="true" />
        <span className="ven-home__header-geo ven-home__header-geo--dot" aria-hidden="true" />
        <span className="ven-home__header-geo ven-home__header-geo--line" aria-hidden="true" />

        <span className="ven-home__accent" aria-hidden="true" />
        <h1 className="ven-home__greeting">{greeting}, {storeName || 'Chef'} 👋</h1>
        <p className="ven-home__sub">Here is a quick look at how your store is doing today.</p>
        <div className="ven-home__clock-row">
          <span className="ven-home__clock">{liveTime}</span>
          <span className="ven-home__date">{liveDate}</span>
        </div>

        <button
          className={`ven-home__store-status ${storeOpen ? 'open' : ''}`}
          onClick={toggleStore}
          title="Toggle store open/closed"
          aria-label={storeOpen ? 'Store is open — click to close' : 'Store is closed — click to open'}
        >
          <span className="ven-home__status-dot" />
          <span className="ven-home__status-label">{storeOpen ? 'Open' : 'Closed'}</span>
        </button>
      </header>

      <section className="ven-home__stats" aria-label="Quick stats">
        <article className="stat-card stat-card--clickable" onClick={() => setActiveSection('orders')} title="Go to Orders">
          <h2>{stats.newOrders}</h2>
          <p>New Orders</p>
        </article>
        <article className="stat-card stat-card--clickable" onClick={() => setActiveSection('menu')} title="Go to Menu Management">
          <h2>{stats.menuItems}</h2>
          <p>Menu Items</p>
        </article>
        <article className="stat-card stat-card--clickable" onClick={() => setActiveSection('analytics')} title="Go to Analytics">
          <h2>R {stats.revenue.toFixed(2)}</h2>
          <p>Today's Revenue</p>
        </article>
        <article className="stat-card stat-card--clickable" onClick={() => setActiveSection('analytics')} title="Go to Analytics">
          <h2>{stats.customers}</h2>
          <p>Customers Served</p>
        </article>
      </section>

      <section className="ven-home__status-bar" aria-label="Order status breakdown">
        <h3 className="ven-home__status-bar-title">
          <i className="fa-solid fa-chart-pie" />
          Today's Order Breakdown
        </h3>
        <div className="ven-home__status-segments">
          <div className="ven-home__seg ven-home__seg--pending">
            <span className="ven-home__seg-count">{orderBreakdown.pending}</span>
            <span className="ven-home__seg-label">Pending</span>
          </div>
          <div className="ven-home__seg ven-home__seg--preparing">
            <span className="ven-home__seg-count">{orderBreakdown.preparing}</span>
            <span className="ven-home__seg-label">Preparing</span>
          </div>
          <div className="ven-home__seg ven-home__seg--completed">
            <span className="ven-home__seg-count">{orderBreakdown.completed}</span>
            <span className="ven-home__seg-label">Completed</span>
          </div>
        </div>
      </section>

      <section className="ven-home__recent" aria-label="Recent orders">
        <div className="ven-home__recent-header">
          <h3 className="ven-home__recent-title">
            <i className="fa-solid fa-receipt" />
            Recent Orders
          </h3>
          <button className="ven-home__recent-see-all" onClick={() => setActiveSection('orders')}>
            See all →
          </button>
        </div>

        <div className="ven-home__recent-list">
          {recentOrders.length === 0 ? (
            <p className="ven-home__recent-empty">No orders yet today.</p>
          ) : (
            recentOrders.map(order => (
              <div className="ven-home__order-row" key={order.id}>
                <div className="ven-home__order-avatar">{getInitial(order)}</div>
                <div className="ven-home__order-info">
                  <p className="ven-home__order-id">#{order.id?.slice(-6).toUpperCase()}</p>
                  <p className="ven-home__order-time">{formatOrderTime(order.time)}</p>
                </div>
                <span className="ven-home__order-total">R {(order.total || 0).toFixed(2)}</span>
                <span className={`ven-home__order-status ven-home__order-status--${order.status || 'pending'}`}>
                  {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Pending'}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="ven-home__bottom">
        <section className="ven-home__tip" aria-label="Tip">
          <div className="ven-home__tip-icon">
            <i className={tip.icon} />
          </div>
          <div>
            <p className="ven-home__tip-title">{tip.title}</p>
            <p className="ven-home__tip-text">{tip.text}</p>
          </div>
        </section>

        <section className="ven-home__quick" aria-label="Quick actions">
          <h3 className="ven-home__quick-title">
            <i className="fa-solid fa-bolt" />
            Quick Actions
          </h3>
          <ul className="ven-home__quick-list">
            <li className="ven-home__quick-item" onClick={() => setActiveSection('menu')} role="button" tabIndex={0}>
              <i className="fa-solid fa-plus" />
              Add menu item
            </li>
            <li className="ven-home__quick-item" onClick={() => setActiveSection('orders')} role="button" tabIndex={0}>
              <i className="fa-solid fa-bell" />
              View pending orders
              {orderBreakdown.pending > 0 && (
                <span className="ven-home__badge">{orderBreakdown.pending}</span>
              )}
            </li>
            <li className="ven-home__quick-item" onClick={() => setActiveSection('analytics')} role="button" tabIndex={0}>
              <i className="fa-solid fa-chart-line" />
              View analytics
            </li>
            <li className="ven-home__quick-item" onClick={() => setActiveSection('settings')} role="button" tabIndex={0}>
              <i className="fa-solid fa-gear" />
              Store settings
            </li>
          </ul>
        </section>
      </div>

    </section>
  );
}

export default VenHome;