import React, { useState } from 'react';
import md5 from 'md5';
import '../css/Style-Payment.css';
import payfastLogo from '../../../Assets/payfast-logo.png';


function Payment({ setActivePage, setBasket }) {

  const order = JSON.parse(localStorage.getItem('pendingPayment'));
  const [loading] = useState(false);

  if (!order) {
    setActivePage('basket');
    return null;
  }

  const paymentId = `order_${Date.now()}`;
  localStorage.setItem('pendingPaymentId', paymentId);

  // STEP 1 — define params (no signature yet)
  const params = {
    merchant_id:   '10048201',
    merchant_key:  'alyr23z2b1yii',
    return_url:    'http://localhost:3001/payment-success',
    cancel_url:    'http://localhost:3001/basket',
    name_first:    order.customerName || 'Test',
    email_address: 'sbtu01@payfast.co.za',
    m_payment_id:  paymentId,
    amount:        order.total.toFixed(2),
    item_name:     'Campus Food Order',
  };

  // STEP 2 — generate signature from params
  // STEP 2 — generate signature (merchant_key must be INCLUDED in signature for sandbox)
const signatureString = Object.entries(params)
  .map(([key, val]) => `${key}=${encodeURIComponent(String(val)).replace(/%20/g, '+')}`)
  .join('&');


  const signature = md5(signatureString);
  const finalParams = { ...params, signature };


  return (
    <main className="payment-page">
      <header className="payment-header">
        <h1>Complete Your Order</h1>
        <p className="payment-subtitle">Review your order before paying</p>
      </header>

      <section className="payment-container">

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
            <strong className="total-amount">R {order.total.toFixed(2)}</strong>
          </footer>
        </section>

        <section className="payment-card" aria-labelledby="payment-heading">
          <h2 id="payment-heading">Payment</h2>
          <p className="payment-info">
            You will be redirected to PayFast to complete your payment securely.
          </p>

          <figure className="payfast-badge">
            <img src={payfastLogo} alt="PayFast secure payment" className="payfast-logo" />
          </figure>

          <ul className="security-badges">
            <li>SSL Secured</li>
            <li>3D Secure</li>
            <li>Buyer Protected</li>
          </ul>

          {/* STEP 4 — use finalParams in form */}
          <form action="https://sandbox.payfast.co.za/eng/process" method="POST">
            {Object.entries(finalParams).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
            <button className="pay-btn" type="submit" disabled={loading}>
              Pay R {order.total.toFixed(2)} with PayFast
            </button>
          </form>

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