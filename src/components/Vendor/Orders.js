import React, { useState, useEffect } from 'react'; // Added useState, useEffect
import './Orders.css';
import { collection, updateDoc, onSnapshot, doc, query, where, getDoc } from "firebase/firestore"; // Added getDoc
import { db } from "../../Firebase/firebaseConfig";
import { useAuth } from "../../Services/AuthContext";
import { sendOrderReadyForPickupEmail } from "../../Services/pickupReadyEmail";

const STATUS_FLOW = {
  pending:    'preparing',
  preparing:  'ready',
  ready:      'completed',
};

const STATUS_LABELS = {
  pending:    'Pending',
  preparing:  'Preparing',
  ready:      'Ready',
  completed:  'Completed',
  cancelled:  'Cancelled',
};

const FILTER_OPTIONS = ['all', 'pending', 'preparing', 'ready', 'completed', 'cancelled'];

function Orders() {
  const [orders, setOrders]   = useState([]);
  const [filter, setFilter]   = useState('all');
  const { vendorId }          = useAuth();

  useEffect(() => {
    if (!vendorId) return;

    const q = query(
      collection(db, "Orders"),
      where("vendorID", "==", vendorId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrders(fetched);
    }, (error) => {
      console.error("Unable to listen to orders", error);
    });

    return () => unsubscribe();
  }, [vendorId]);

  const visibleOrders =
    filter === 'all'
      ? orders
      : orders.filter(o => o.status === filter);

  async function advanceStatus(id) {
    const order = orders.find(o => o.id === id);
    if (!order || !STATUS_FLOW[order.status]) return;

    const newStatus  = STATUS_FLOW[order.status];

    //  Reduce Quantity in Inventory when order is COMPLETED 
    if (newStatus === 'completed') {
      console.log('[Orders] Reducing inventory for completed order:', id);
      try {
        for (const item of order.items) {
          // Path to the specific menu item in the vendor's subcollection
          const itemRef = doc(db, "Vendors", vendorId, "menuItems", item.id);
          const itemSnap = await getDoc(itemRef);
          
          if (itemSnap.exists()) {
            const currentData = itemSnap.data();
            const currentQty = parseInt(currentData.qty) || 0;
            const reducedQty = Math.max(0, currentQty - (item.qty || 1));
            
            await updateDoc(itemRef, { 
              qty: reducedQty,
              // Automatically mark as sold out if it hits 0
              isSoldOut: currentData.isSoldOut || reducedQty === 0 
            });
          }
        }
      } catch (error) {
        console.error("[Orders] Error updating inventory:", error);
      }
    }
    //  End of Inventory Logic 

    await updateDoc(doc(db, "Orders", id), { status: newStatus });

    const nextOrder = { ...order, id, status: newStatus };

    setOrders(prev =>
      prev.map(o => o.id === id ? { ...o, status: newStatus } : o)
    );

    // Send pickup email when status becomes ready
    if (newStatus === 'ready' && !order.pickupEmailSent) {
      console.log('[Orders] Attempting to send pickup email for order:', id);
      try {
        const result = await sendOrderReadyForPickupEmail(nextOrder);

        if (result.ok) {
          await updateDoc(doc(db, "Orders", id), {
            pickupEmailSent:   true,
            pickupEmailSentAt: new Date().toISOString(),
          });

          setOrders(prev =>
            prev.map(o =>
              o.id === id
                ? { ...o, status: newStatus, pickupEmailSent: true, pickupEmailSentAt: new Date().toISOString() }
                : o
            )
          );

          console.log('[Orders] Pickup email sent successfully for order:', id);

        } else {
          console.warn('[Orders] Pickup email failed:', result.error);
          alert(`Order marked as ready but pickup email failed: ${result.error}`);
        }
      } catch (e) {
        console.error('[Orders] Pickup email error:', e);
        alert('Order marked as ready but there was an error sending the pickup email.');
      }
    }
  }

  async function cancelOrder(id) {
    const order = orders.find(o => o.id === id);
    if (!order || order.status === 'completed' || order.status === 'cancelled') return;

    await updateDoc(doc(db, "Orders", id), { status: 'cancelled' });

    setOrders(prev =>
      prev.map(o => o.id === id ? { ...o, status: 'cancelled' } : o)
    );
  }

  const counts = FILTER_OPTIONS.slice(1).reduce((acc, s) => {
    acc[s] = orders.filter(o => o.status === s).length;
    return acc;
  }, {});

  return (
    <main className="orders-page">
      <header>
        <h1>Orders</h1>
      </header>

      <section className="orders-summary">
        {FILTER_OPTIONS.slice(1).map(s => (
          <article key={s} className={`summary-badge summary-badge--${s}`}>
            <data className="summary-count" value={counts[s]}>{counts[s]}</data>
            <span className="summary-label">{STATUS_LABELS[s]}</span>
          </article>
        ))}
      </section>

      <nav className="orders-filters">
        {FILTER_OPTIONS.map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : STATUS_LABELS[f]}
            {f !== 'all' && (
              <span className="filter-count">{counts[f]}</span>
            )}
          </button>
        ))}
      </nav>

      <section className="orders-list">
        {visibleOrders.length === 0 ? (
          <p className="no-orders">
            No {filter === 'all' ? '' : STATUS_LABELS[filter].toLowerCase() + ' '}orders at the moment.
          </p>
        ) : (
          visibleOrders.map(order => (
            <article
              key={order.id}
              className={`order-card order-card--${order.status}`}
            >
              <header className="order-card__header">
                <p className="order-card__meta">
                  <b className="order-id">{order.id}</b>
                  <time className="order-time" dateTime={order.time}>{order.time}</time>
                </p>
                <span className={`status-badge status-badge--${order.status}`}>
                  {STATUS_LABELS[order.status]}
                </span>
              </header>

              <section className="order-card__customer">
                <strong>{order.customerName}</strong>
              </section>

              <ul className="order-items">
                {order.items.map((item, i) => (
                  <li key={i} className="order-item">
                    <data className="item-qty" value={item.qty}>x{item.qty}</data>
                    <span className="item-name">{item.name}</span>
                    <span className="item-price">
                      R {(item.qty * item.price).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>

              {order.notes && (
                <p className="order-notes">Note: {order.notes}</p>
              )}

              <footer className="order-card__footer">
                <span className="order-total">
                  Total: <strong>R {order.total.toFixed(2)}</strong>
                </span>

                <section className="order-actions">
                  {STATUS_FLOW[order.status] && (
                    <button
                      className="btn btn--advance"
                      onClick={() => advanceStatus(order.id)}
                    >
                      Mark as {STATUS_LABELS[STATUS_FLOW[order.status]]}
                    </button>
                  )}

                  {order.status !== 'completed' && order.status !== 'cancelled' && (
                    <button
                      className="btn btn--cancel"
                      onClick={() => cancelOrder(order.id)}
                    >
                      Cancel
                    </button>
                  )}
                </section>
              </footer>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

export default Orders;
