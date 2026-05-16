import React, { useEffect, useState } from 'react';
import '../css/Orders.css';
import { db } from '../../../Firebase/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../../Services/AuthContext';

const STATUS_STEPS = {
  pending:   1,
  paid:      1,
  preparing: 2,
  ready:     3,
  completed: 3,
};

const Orders = () => {
  const { currentUser, authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    if (authLoading || !currentUser?.uid) return;

    const q = query(
      collection(db, 'Orders'),
      where('customerId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fetched.sort((a, b) => new Date(b.time) - new Date(a.time));
      setOrders(fetched);
    });

    return () => unsubscribe();
  }, [authLoading, currentUser?.uid]);

  // Active = still being processed
  const activeOrders = orders.filter(o =>
    ['pending', 'paid', 'preparing', 'ready'].includes(o.status)
  );

  // History = only completed (collected by customer)
  const doneOrders = orders.filter(o => o.status === 'completed');

  const visibleOrders = activeTab === 'active' ? activeOrders : doneOrders;

  if (authLoading) return <p style={{ padding: '20px' }}>Loading...</p>;

  return (
    <main>
      <section className="page">
        <h1>My Orders</h1>

        {/* ── Tabs ── */}
        <div className="cust-tabs">
          <button
            className={`cust-tab ${activeTab === 'active' ? 'cust-tab--on' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Active
            {activeOrders.length > 0 && (
              <span className="cust-tab__dot">{activeOrders.length}</span>
            )}
          </button>
          <button
            className={`cust-tab ${activeTab === 'history' ? 'cust-tab--on' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            History
            {doneOrders.length > 0 && (
              <span className="cust-tab__dot cust-tab__dot--grey">{doneOrders.length}</span>
            )}
          </button>
        </div>

        {/* ── Orders list ── */}
        {visibleOrders.length === 0 ? (
          <article className="cust-empty">
            <p>
              {activeTab === 'active'
                ? '🛍️ No active orders right now.'
                : '📋 No completed orders yet.'}
            </p>
          </article>
        ) : (
          <ul className="customer-orders-list">
            {visibleOrders.map(order => (
              <li key={order.id} className="order-card">

                <header className="customer-order__header">
                  <section>
                    <strong>{order.vendorName || 'Vendor'}</strong>
                    <time>{order.time}</time>
                  </section>
                  <span className={`cust-status-pill cust-status-pill--${order.status}`}>
                    {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                  </span>
                </header>

                <ul className="customer-order__items">
                  {order.items?.map((item, i) => (
                    <li key={i}>
                      <span>x{item.qty} {item.name}</span>
                      <span>R {(item.qty * item.price).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>

                {/* Status tracker only on active orders */}
                {activeTab === 'active' && (
                  <ol className="status-tracker" aria-label="Order status">
                    <li className={`status-step ${STATUS_STEPS[order.status] >= 1 ? 'active' : ''}`}>
                      <span className="status-circle">1</span>
                      <p>Order Received</p>
                    </li>
                    <div className={`status-line ${STATUS_STEPS[order.status] >= 2 ? 'active' : ''}`} />
                    <li className={`status-step ${STATUS_STEPS[order.status] >= 2 ? 'active' : ''}`}>
                      <span className="status-circle">2</span>
                      <p>Preparing</p>
                    </li>
                    <div className={`status-line ${STATUS_STEPS[order.status] >= 3 ? 'active' : ''}`} />
                    <li className={`status-step ${STATUS_STEPS[order.status] >= 3 ? 'active' : ''}`}>
                      <span className="status-circle">3</span>
                      <p>Ready for Pickup</p>
                    </li>
                  </ol>
                )}

                <footer className="customer-order__footer">
                  <strong>Total: R {order.total?.toFixed(2)}</strong>
                </footer>

              </li>
            ))}
          </ul>
        )}

      </section>
    </main>
  );
};

export default Orders;