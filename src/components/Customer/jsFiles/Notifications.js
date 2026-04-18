import React, { useEffect, useMemo, useState } from 'react';
import '../css/Notifications.css';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../Firebase/firebaseConfig';
import { useAuth } from '../../../Services/AuthContext';

/**
 * Campus food ordering: shows when a vendor moves your order to "ready"
 * (same `Orders` collection / `status` field as Vendor/Orders.js).
 *
 * Expects each order doc to include `customerId` = Firebase Auth uid of the student.
 */
const Notifications = () => {
  const { currentUser, authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !currentUser?.uid) {
      setOrders([]);
      return undefined;
    }

    setError('');
    const q = query(
      collection(db, 'Orders'),
      where('customerId', '==', currentUser.uid)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setOrders(rows);
      },
      (err) => {
        console.error('Notifications subscription error:', err);
        setError('Could not load notifications. Please try again later.');
        setOrders([]);
      }
    );

    return () => unsub();
  }, [authLoading, currentUser?.uid]);

  const readyOrders = useMemo(
    () => orders.filter((o) => o.status === 'ready'),
    [orders]
  );

  const preparingOrders = useMemo(
    () => orders.filter((o) => o.status === 'preparing'),
    [orders]
  );

  if (authLoading) {
    return (
      <section className="page" aria-busy="true">
        <p className="head">Loading notifications…</p>
      </section>
    );
  }

  if (!currentUser) {
    return (
      <section className="page">
        <h1 className="head">Notifications</h1>
        <p>Sign in to see order updates from campus vendors.</p>
      </section>
    );
  }

  return (
    <section className="page notifications-container" aria-labelledby="notifications-heading">
      <h1 id="notifications-heading" className="head">
        Notifications
      </h1>

      {error && (
        <p role="alert" style={{ color: '#b91c1c', fontSize: '0.95rem' }}>
          {error}
        </p>
      )}

      {readyOrders.length === 0 && preparingOrders.length === 0 && !error && (
        <p>You have no order updates yet. When a vendor marks your order as ready, it will appear here.</p>
      )}

      {preparingOrders.length > 0 && (
        <section aria-label="Orders being prepared">
          <h2 className="head" style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
            In the kitchen
          </h2>
          <ul className="notifications-list">
            {preparingOrders.map((o) => (
              <li key={o.id}>
                <strong>Preparing:</strong> order <span className="order-ref">{o.id}</span>
                {o.customerName ? ` · ${o.customerName}` : ''}
                {typeof o.total === 'number' ? ` · R ${o.total.toFixed(2)}` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}

      {readyOrders.length > 0 && (
        <section aria-label="Orders ready for collection">
          <h2 className="head" style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
            Ready for collection
          </h2>
          <ul className="notifications-list">
            {readyOrders.map((o) => (
              <li key={o.id}>
                <strong>Your order is ready for collection.</strong>
                <br />
                Order <span className="order-ref">{o.id}</span>
                {typeof o.total === 'number' ? ` · Total R ${o.total.toFixed(2)}` : ''}
                {o.time ? ` · ${o.time}` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
};

export default Notifications;
