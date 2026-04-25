import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../../Firebase/firebaseConfig';
import '../css/Style-Payment.css';
import payfastLogo from '../../../Assets/payfast-logo.png';

function Payment({ setActivePage }) {

  // READ order data from sessionStorage set by Basket.js
  const order = JSON.parse(sessionStorage.getItem('pendingPayment'));
  const [loading, setLoading] = useState(false);

  const placeOrder = async () => {
    if (!order || order.items.length === 0) return;
    setLoading(true);

    const byVendor = order.items.reduce((acc, item) => {
      if (!acc[item.vendorId]) acc[item.vendorId] = { vendorName: item.vendorName, items: [] };
      acc[item.vendorId].items.push(item);
      return acc;
    }, {});

    try {
      for (const [vendorId, { vendorName, items }] of Object.entries(byVendor)) {
        const vendorTotal = items.reduce((sum, i) => sum + parseFloat(i.price) * i.qty, 0);

        await addDoc(collection(db, 'Orders'), {
          vendorID:      vendorId,
          vendorName:    vendorName,
          customerId:    order.customerId,
          customerEmail: order.customerEmail,
          customerName:  order.customerName,
          items:         items.map(i => ({ name: i.name, qty: i.qty, price: parseFloat(i.price) })),
          total:         parseFloat(vendorTotal.toFixed(2)),
          status:        'pending',
          time:          new Date().toLocaleString('en-ZA'),
          createdAt:     new Date().toISOString(),
          notes:         '',
        });
      }

      // Clear the stored payment data after order is placed
      sessionStorage.removeItem('pendingPayment');
      alert('Order placed successfully!');
      setActivePage('shops');

    } catch (err) {
      console.error('Failed to place order:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // If no order data go back to basket
  if (!order) {
    setActivePage('basket');
    return null;
  }

  return (
    <main className="payment-page">
      <header className="payment-header">
        <h1>Complete Your Order</h1>
        <p className="payment-subtitle">Review your order before paying</p>
      </header>

      <section className="payment-container">

        {/* ORDER SUMMARY CARD */}
        <section className="order-summary" aria-labelledby="summary-heading">
          <h2 id="summary-heading">Order Summary</h2>

          <ul className="summary-items">
            {order.items.map((item, i) => (
              <li key={i} className="summary-item">
                <section className="summary-item__info">
                  <strong>{item.name}</strong>
                  <small>x{item.qty} — {item.vendorName}</small>
                </section>
                <strong className="summary-item__price">
                  R {(parseFloat(item.price) * item.qty).toFixed(2)}
                </strong>
              </li>
            ))}
          </ul>

          <footer className="summary-total">
            <strong>Total</strong>
            <strong className="total-amount">
              R {order.total.toFixed(2)}
            </strong>
          </footer>
        </section>

        {/* PAYMENT CARD */}
        <section className="payment-card" aria-labelledby="payment-heading">
          <h2 id="payment-heading">Payment</h2>
          <p className="payment-info">
            You will be redirected to PayFast to complete your payment securely.
          </p>

          <figure className="payfast-badge">
            <img
              src={payfastLogo}


              alt="PayFast secure payment"
              className="payfast-logo"
            />
          </figure>

          <ul className="security-badges">
            <li>SSL Secured</li>
            <li>3D Secure</li>
            <li>Buyer Protected</li>
          </ul>

          {/* BACKEND TEAMMATE REPLACES THIS WITH PAYFAST FORM */}
          <button
            className="pay-btn"
            type="button"
            onClick={placeOrder}
            disabled={loading}
          >
            {loading ? 'Placing Order...' : `Pay R ${order.total.toFixed(2)} with PayFast`}
          </button>

          <p className="payment-cancel">
            Changed your mind?{' '}
            <a href="#basket" onClick={() => setActivePage('basket')}>
              Go back to basket
            </a>
          </p>
        </section>

      </section>
    </main>
  );
}

export default Payment;