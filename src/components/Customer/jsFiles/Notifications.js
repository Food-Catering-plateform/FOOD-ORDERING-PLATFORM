import React, { useEffect, useMemo } from 'react';
import '../css/Notifications.css';
import { useAuth } from '../../../Services/AuthContext';
import { useCustomerOrders } from '../../../hooks/useCustomerOrders';
import { STATUS_CONFIG, getNotificationKey } from '../notificationConfig';
import { loadReadKeys, saveReadKeys } from '../../../utils/notificationReadState';

const Notifications = () => {
  const { currentUser, authLoading } = useAuth();
  const { orders, error, loading } = useCustomerOrders();

  useEffect(() => {
    if (!currentUser?.uid || orders.length === 0) return;
    const allKeys = new Set(orders.map(getNotificationKey));
    const existing = loadReadKeys(currentUser.uid);
    if (allKeys.size === existing.size && [...allKeys].every((k) => existing.has(k))) return;
    saveReadKeys(currentUser.uid, allKeys);
  }, [currentUser?.uid, orders]);

  const activeOrders = useMemo(
    () => orders.filter((o) => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready'),
    [orders]
  );

  const pastOrders = useMemo(
    () => orders.filter((o) => o.status === 'completed' || o.status === 'cancelled'),
    [orders]
  );

  const paymentOrders = useMemo(
    () => orders.filter((o) => o.m_payment_id || o.paymentId),
    [orders]
  );

  if (authLoading || loading) {
    return (
      <section className="notif-page">
        <header className="notif-header">
          <h1>Notifications</h1>
        </header>
        <p className="notif-loading">Loading notifications…</p>
      </section>
    );
  }

  if (!currentUser) {
    return (
      <section className="notif-page">
        <header className="notif-header">
          <h1>Notifications</h1>
        </header>
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
