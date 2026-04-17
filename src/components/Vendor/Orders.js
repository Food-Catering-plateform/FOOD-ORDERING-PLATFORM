import React, { useState } from 'react';
import './Orders.css';

const INITIAL_ORDERS = [
  {
    id: 'ORD-001',
    customerName: 'Thabo Nkosi',
    items: [
      { name: 'Grilled Chicken Burger', qty: 2, price: 89.99 },
      { name: 'Cheese Fries', qty: 1, price: 34.99 },
    ],
    total: 214.97,
    status: 'pending',
    time: '08:14',
    notes: 'No pickles on the burger please',
  },
  {
    id: 'ORD-002',
    customerName: 'Lerato Dlamini',
    items: [
      { name: 'Veggie Wrap', qty: 1, price: 69.99 },
      { name: 'Fresh Orange Juice', qty: 2, price: 29.99 },
    ],
    total: 129.97,
    status: 'preparing',
    time: '08:22',
    notes: '',
  },
  {
    id: 'ORD-003',
    customerName: 'Sipho Molefe',
    items: [
      { name: 'Beef Stew & Rice', qty: 1, price: 99.99 },
    ],
    total: 99.99,
    status: 'ready',
    time: '08:05',
    notes: 'Extra sauce on the side',
  },
  {
    id: 'ORD-004',
    customerName: 'Nomsa Zulu',
    items: [
      { name: 'Grilled Chicken Burger', qty: 3, price: 89.99 },
      { name: 'Soft Drink', qty: 3, price: 19.99 },
    ],
    total: 329.94,
    status: 'completed',
    time: '07:50',
    notes: '',
  },
  {
    id: 'ORD-005',
    customerName: 'Kagiso Sithole',
    items: [
      { name: 'Cheese Fries', qty: 2, price: 34.99 },
      { name: 'Iced Tea', qty: 1, price: 24.99 },
    ],
    total: 94.97,
    status: 'cancelled',
    time: '08:01',
    notes: 'Customer requested cancellation',
  },
];

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
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [filter, setFilter] = useState('all');

  const visibleOrders = filter === 'all'
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
        o.id === id && o.status !== 'completed' && o.status !== 'cancelled'
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
    <div className="orders-page">
      <h1>Orders</h1>

      {/* Summary badges */}
      <div className="orders-summary">
        {FILTER_OPTIONS.slice(1).map(s => (
          <div key={s} className={`summary-badge summary-badge--${s}`}>
            <span className="summary-count">{counts[s]}</span>
            <span className="summary-label">{STATUS_LABELS[s]}</span>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="orders-filters">
        {FILTER_OPTIONS.map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : STATUS_LABELS[f]}
            {f !== 'all' && <span className="filter-count">{counts[f]}</span>}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {visibleOrders.length === 0 ? (
        <p className="no-orders">No {filter === 'all' ? '' : STATUS_LABELS[filter].toLowerCase() + ' '}orders at the moment.</p>
      ) : (
        <div className="orders-list">
          {visibleOrders.map(order => (
            <div key={order.id} className={`order-card order-card--${order.status}`}>
              <div className="order-card__header">
                <div className="order-card__meta">
                  <span className="order-id">{order.id}</span>
                  <span className="order-time">{order.time}</span>
                </div>
                <span className={`status-badge status-badge--${order.status}`}>
                  {STATUS_LABELS[order.status]}
                </span>
              </div>

              <div className="order-card__customer">
                <strong>{order.customerName}</strong>
              </div>

              <ul className="order-items">
                {order.items.map((item, i) => (
                  <li key={i} className="order-item">
                    <span className="item-qty">x{item.qty}</span>
                    <span className="item-name">{item.name}</span>
                    <span className="item-price">R {(item.qty * item.price).toFixed(2)}</span>
                  </li>
                ))}
              </ul>

              {order.notes ? (
                <p className="order-notes">Note: {order.notes}</p>
              ) : null}

              <div className="order-card__footer">
                <span className="order-total">Total: <strong>R {order.total.toFixed(2)}</strong></span>

                <div className="order-actions">
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
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Orders;
