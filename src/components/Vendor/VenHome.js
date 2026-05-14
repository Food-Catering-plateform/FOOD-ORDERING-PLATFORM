import React, { useEffect, useState } from 'react';
import './VenHome.css';
import { db } from '../../Firebase/firebaseConfig';
// replaced getDocs with onSnapshot so the dashboard stat cards update in real-time
// when new orders come in or existing ones change status
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { useAuth } from '../../Services/AuthContext';

// setActiveSection passed from VDashboard — lets stat cards navigate to the right tab when clicked
function VenHome({ storeName, setActiveSection }) {
  // vendorId comes from AuthContext — it's the Firebase uid of the logged-in vendor
  // we use it to filter Orders and menuItems so we only see this vendor's data
  const { vendorId } = useAuth();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' :
                'Good evening';

  // stats starts at all zeros — gets populated from Firestore in the useEffect below
  // previously these were hardcoded to 0 and never updated
  const [stats, setStats] = useState({
    newOrders: 0,
    menuItems: 0,
    revenue: 0,
    customers: 0,
  });

  useEffect(() => {
    // don't fetch until we know the vendor's uid
    if (!vendorId) return;

    // CHANGED: orders now use onSnapshot instead of getDocs so the stat cards
    // update automatically when a new order arrives or an order status changes —
    // no page refresh needed. the listener stays alive as long as VenHome is mounted.
    const q = query(collection(db, 'Orders'), where('vendorID', '==', vendorId));

    const unsubscribeOrders = onSnapshot(q, async (snapshot) => {
      const orders = snapshot.docs.map(d => d.data());

      // we use today's date string to filter orders placed today
      // order.time is saved as toLocaleString('en-ZA') in Basket.js so we compare the start
      const today = new Date().toLocaleDateString('en-ZA');
      const todayOrders = orders.filter(o =>
        o.time?.startsWith(today) || o.time?.includes(new Date().toLocaleDateString())
      );

      // new orders = all pending orders across all time — vendor needs to act on these
      const newOrders = orders.filter(o => o.status === 'pending').length;

      // today's revenue = sum of totals for completed orders today only
      const revenue = todayOrders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + (o.total || 0), 0);

      // customers served = unique student IDs on completed orders today
      // Set removes duplicates so one student ordering twice still counts as 1
      const customers = new Set(
        todayOrders.filter(o => o.status === 'completed').map(o => o.customerId)
      ).size;

      // menu items count is fetched separately — it only changes when vendor edits their menu
      // so a one-time getDocs is fine here (no need for a live listener on menuItems)
      const menuSnap = await getDocs(collection(db, 'Vendors', vendorId, 'menuItems'));

      // update all four stat cards at once with fresh data
      setStats({
        newOrders,
        menuItems: menuSnap.size,
        revenue,
        customers,
      });
    });

    // clean up the Firestore listener when VenHome unmounts to avoid memory leaks
    return () => unsubscribeOrders();
  }, [vendorId]); // re-runs if vendorId changes (e.g. after login)

  return (
    <section className="ven-home">

      <header className="ven-home__header">
        <h1 className="ven-home__greeting">{greeting}, {storeName || 'Chef'} 👋</h1>
        <p className="ven-home__sub">Here is a quick look at how your store is doing today.</p>
      </header>

      {/* each card now shows a real number pulled from Firestore instead of a hardcoded 0 */}
      {/* clicking a card navigates to the relevant section via setActiveSection from VDashboard */}
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

      <section className="ven-home__tip" aria-label="Tip">
        <p>Use the sidebar to manage your menu, track orders, and view analytics.</p>
      </section>

    </section>
  );
}

export default VenHome;
