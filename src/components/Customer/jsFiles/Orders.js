import React, { useEffect, useState } from 'react';
import '../css/Orders.css';
import { db } from '../../../Firebase/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../../Services/AuthContext';

const STATUS_LABELS = {
  pending:   'Pending',
  preparing: 'Preparing',
  ready:     'Ready for Pickup',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const Orders = () => {
  const { currentUser, authLoading } = useAuth();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (authLoading || !currentUser?.uid) return;

    const q = query(
      collection(db, 'Orders'),
      where('customerId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // show newest orders first
      fetched.sort((a, b) => new Date(b.time) - new Date(a.time));
      setOrders(fetched);
    });

    return () => unsubscribe();
  }, [authLoading, currentUser?.uid]);

  if (authLoading) return <p style={{ padding: '20px' }}>Loading...</p>;

  return (
    <main>
      <section className="page">
        <h1>My Orders</h1>

        {orders.length === 0 ? (
          <article>
            <p>You have no orders yet.</p>
          </article>
        ) : (
          <ul className="customer-orders-list">
            {orders.map(order => (
              <li key={order.id} className={`customer-order-card customer-order-card--${order.status}`}>

                <header className="customer-order__header">
                  <section>
                    <strong>{order.vendorName || 'Vendor'}</strong>
                    <time>{order.time}</time>
                  </section>
                  {/* status badge reflects real-time Firestore status — updates instantly when vendor acts */}
                  <span className={`customer-status-badge customer-status-badge--${order.status}`}>
                    {STATUS_LABELS[order.status] || order.status}
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