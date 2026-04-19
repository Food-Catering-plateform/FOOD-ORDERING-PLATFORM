import React, { useEffect, useState } from 'react';
import './Orders.css';

import { collection, addDoc, updateDoc, getDocs, doc, deleteDoc,query,where } from "firebase/firestore";
import { db } from "../../Firebase/firebaseConfig";
import { useAuth } from "../../Services/AuthContext";




const STATUS_FLOW = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'completed',
};

const STATUS_LABELS = {
  pending: 'Pending',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const FILTER_OPTIONS = ['all', 'pending', 'preparing', 'ready', 'completed', 'cancelled'];

function Orders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const { vendorId } = useAuth();

///function to fetch the data from the orders table into to display them 

useEffect(() => {
  if (!vendorId) return;

  const fetchOrders = async () => {
    try {
      const q = query(
        collection(db, "Orders"),
        where("vendorID", "==", vendorId)
      );

      const data = await getDocs(q);
      const fetched = data.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrders(fetched);

    } catch (error) {
      console.error("Unable to fetch orders", error);
    }
  };

  fetchOrders();

},[vendorId])

  const visibleOrders =
    filter === 'all'
      ? orders
      : orders.filter(o => o.status === filter);

  function advanceStatus(id) {
    setOrders(prev =>
      prev.map(o =>
        o.id === id && STATUS_FLOW[o.status]
          ? { ...o, status: STATUS_FLOW[o.status] }
          : o
      )
    );
  }

  function cancelOrder(id) {
    setOrders(prev =>
      prev.map(o =>
        o.id === id &&
        o.status !== 'completed' &&
        o.status !== 'cancelled'
          ? { ...o, status: 'cancelled' }
          : o
      )
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

                  {order.status !== 'completed' &&
                    order.status !== 'cancelled' && (
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