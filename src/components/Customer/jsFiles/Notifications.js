import React, { useEffect, useMemo, useState } from 'react';
import '../css/Notifications.css';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../Firebase/firebaseConfig';
import { useAuth } from '../../../Services/AuthContext';

// Maps each order status to a badge label, emoji and css modifier
const STATUS_CONFIG = {
  pending: {
    label:   'Order Received',
    emoji:   '🧾',
    message: 'Your order has been received and is waiting for the vendor to confirm.',
    mod:     'pending',
  },
  preparing: {
    label:   'Being Prepared',
    emoji:   '👨‍🍳',
    message: 'Your order is currently being prepared in the kitchen.',
    mod:     'preparing',
  },
  ready: {
    label:   'Ready for Collection',
    emoji:   '✅',
    message: 'Your order is ready! Head to the vendor to collect it now.',
    mod:     'ready',
  },
  completed: {
    label:   'Order Completed',
    emoji:   '🎉',
    message: 'You have collected your order. Enjoy your meal!',
    mod:     'completed',
  },
  cancelled: {
    label:   'Order Cancelled',
    emoji:   '❌',
    message: 'Your order was cancelled by the vendor. Please place a new order.',
    mod:     'cancelled',
  },
};

const Notifications = () => {
  const { currentUser, authLoading } = useAuth();
  const [orders, setOrders]         = useState([]);
  const [error, setError]           = useState('');

  useEffect(() => {
    if (authLoading || !currentUser?.uid) {
      setOrders([]);
      return;
    }

    setError('');

    const qById = query(
      collection(db, 'Orders'),
      where('customerId', '==', currentUser.uid)
    );

    const mergeDocs = (snapshots) => {
      const map = new Map();
      snapshots.forEach((snap) => {
        snap.docs.forEach((d) => {
          map.set(d.id, { id: d.id, ...d.data() });
        });
      });
      // Sort by most recent first using createdAt
      const sorted = [...map.values()].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setOrders(sorted);
    };

    let snapById          = null;
    let snapByEmail       = null;
    let snapByDisplayName = null;

    const tryMerge = () => {
      const snaps = [snapById, snapByEmail, snapByDisplayName].filter(Boolean);
      if (snaps.length > 0) mergeDocs(snaps);
    };

    const unsubById = onSnapshot(
      qById,
      (snap) => { snapById = snap; tryMerge(); },
      (err)  => { console.error(err); setError('Could not load notifications.'); setOrders([]); }
    );

    let unsubByEmail = () => {};
    if (currentUser.email) {
      const qByEmail = query(
        collection(db, 'Orders'),
        where('customerName', '==', currentUser.email)
      );
      unsubByEmail = onSnapshot(
        qByEmail,
        (snap) => { snapByEmail = snap; tryMerge(); },
        (err)  => console.error(err)
      );
    }

    let unsubByDisplayName = () => {};
    if (currentUser.displayName) {
      const qByDisplayName = query(
        collection(db, 'Orders'),
        where('customerName', '==', currentUser.displayName)
      );
      unsubByDisplayName = onSnapshot(
        qByDisplayName,
        (snap) => { snapByDisplayName = snap; tryMerge(); },
        (err)  => console.error(err)
      );
    }

    return () => {
      unsubById();
      unsubByEmail();
      unsubByDisplayName();
    };
  }, [authLoading, currentUser?.uid, currentUser?.email, currentUser?.displayName]);

  // Split orders into active and past
  const activeOrders = useMemo(
    () => orders.filter((o) => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready'),
    [orders]
  );

  const pastOrders = useMemo(
    () => orders.filter((o) => o.status === 'completed' || o.status === 'cancelled'),
    [orders]
  );

  // Payment notification — orders that came from PayFast (have paymentId)
  const paymentOrders = useMemo(
    () => orders.filter((o) => o.m_payment_id || o.paymentId),
    [orders]
  );

  if (authLoading) {
    return (
      <section className="notif-page">
        <p className="notif-loading">Loading notifications…</p>
      </section>
    );
  }

  if (!currentUser) {
    return (
      <section className="notif-page">
        <p className="notif-empty">Please sign in to see notifications.</p>
      </section>
    );
  }

  return (
    <section className="notif-page">
      <header className="notif-header">
        <h1>Notifications</h1>
        <p className="notif-subtitle">
          Real-time updates on your orders
        </p>
      </header>

      {error && <p className="notif-error">{error}</p>}

      {/* PAYMENT NOTIFICATIONS */}
      {paymentOrders.length > 0 && (
        <section className="notif-section">
          <h2 className="notif-section-title">💳 Payment</h2>
          {paymentOrders.map((o) => (
            <article key={o.id} className="notif-card notif-card--payment">
              <header className="notif-card__header">
                <strong className="notif-card__emoji">💳</strong>
                <section className="notif-card__info">
                  <strong>Payment Successful</strong>
                  <p>Your payment of R {o.total?.toFixed(2)} was received for your order from {o.vendorName}.</p>
                </section>
                <time className="notif-card__time">{o.time}</time>
              </header>
            </article>
          ))}
        </section>
      )}

      {/* ACTIVE ORDER NOTIFICATIONS */}
      <section className="notif-section">
        <h2 className="notif-section-title">🔔 Active Orders</h2>

        {activeOrders.length === 0 ? (
          <p className="notif-empty">No active orders at the moment.</p>
        ) : (
          activeOrders.map((o) => {
            const config = STATUS_CONFIG[o.status] || STATUS_CONFIG.pending;
            return (
              <article key={o.id} className={`notif-card notif-card--${config.mod}`}>
                <header className="notif-card__header">
                  <strong className="notif-card__emoji">{config.emoji}</strong>
                  <section className="notif-card__info">
                    <section className="notif-card__top">
                      <strong className="notif-card__vendor">{o.vendorName}</strong>
                      <span className={`notif-badge notif-badge--${config.mod}`}>
                        {config.label}
                      </span>
                    </section>
                    <p className="notif-card__message">{config.message}</p>

                    {/* ORDER ITEMS */}
                    <ul className="notif-items">
                      {o.items?.map((item, i) => (
                        <li key={i} className="notif-item">
                          <span>{item.name}</span>
                          <span>x{item.qty}</span>
                        </li>
                      ))}
                    </ul>

                    <footer className="notif-card__footer">
                      <strong className="notif-card__total">
                        Total: R {o.total?.toFixed(2)}
                      </strong>
                      {o.status === 'ready' && o.pickupEmailSent && (
                        <span className="notif-email-sent">
                          📧 Pickup email sent
                        </span>
                      )}
                    </footer>
                  </section>
                  <time className="notif-card__time">{o.time}</time>
                </header>
              </article>
            );
          })
        )}
      </section>

      {/* PAST ORDER NOTIFICATIONS */}
      {pastOrders.length > 0 && (
        <section className="notif-section">
          <h2 className="notif-section-title">📋 Past Orders</h2>
          {pastOrders.map((o) => {
            const config = STATUS_CONFIG[o.status];
            return (
              <article key={o.id} className={`notif-card notif-card--${config.mod}`}>
                <header className="notif-card__header">
                  <strong className="notif-card__emoji">{config.emoji}</strong>
                  <section className="notif-card__info">
                    <section className="notif-card__top">
                      <strong className="notif-card__vendor">{o.vendorName}</strong>
                      <span className={`notif-badge notif-badge--${config.mod}`}>
                        {config.label}
                      </span>
                    </section>
                    <p className="notif-card__message">{config.message}</p>
                    <strong className="notif-card__total">
                      Total: R {o.total?.toFixed(2)}
                    </strong>
                  </section>
                  <time className="notif-card__time">{o.time}</time>
                </header>
              </article>
            );
          })}
        </section>
      )}

      {/* EMPTY STATE */}
      {orders.length === 0 && !error && (
        <section className="notif-empty-state">
          <p className="notif-empty-emoji">🔔</p>
          <p className="notif-empty-title">No notifications yet</p>
          <p className="notif-empty-sub">
            Once you place an order you will see real-time updates here.
          </p>
        </section>
      )}
    </section>
  );
};

export default Notifications;