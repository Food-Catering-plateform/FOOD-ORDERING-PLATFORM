import React, { useEffect, useState, useRef } from 'react';
import { db } from '../../../Firebase/firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';

function PaymentSuccess({ setActivePage, setBasket }) {
  const [status, setStatus] = useState('Confirming your order...');
  const hasSaved = useRef(false); // ← prevents double save in React Strict Mode

  useEffect(() => {
    if (hasSaved.current) return; // ← if already ran, skip
    hasSaved.current = true;

    const saveOrder = async () => {
      const order = JSON.parse(localStorage.getItem('pendingPayment'));

      if (!order) {
        setStatus('No order found.');
        return;
      }

      try {
        const byVendor = order.items.reduce((acc, item) => {
          const vid = item.vendorId || item.vendorID || 'unknown';
          const vname = item.vendorName || 'Unknown Vendor';
          if (!acc[vid]) acc[vid] = { vendorName: vname, items: [] };
          acc[vid].items.push(item);
          return acc;
        }, {});

        for (const [vendorId, { vendorName, items }] of Object.entries(byVendor)) {
          const vendorTotal = items.reduce((sum, i) => sum + parseFloat(i.price) * i.qty, 0);

          await addDoc(collection(db, 'Orders'), {
            vendorID:      vendorId,
            vendorName:    vendorName,
            customerId:    order.customerId,
            customerEmail: order.customerEmail,
            customerName:  order.customerName,
            items:         items.map(i => ({ name: i.name || 'Item', qty: i.qty, price: parseFloat(i.price) })),
            total:         parseFloat(vendorTotal.toFixed(2)),
            status:        'pending', // ← changed back to pending so status tracker works
            time:          new Date().toLocaleString('en-ZA'),
            createdAt:     new Date().toISOString(),
            notes:         '',
          });
        }

        localStorage.removeItem('pendingPayment');
        localStorage.removeItem('pendingPaymentId');
        if (setBasket) setBasket([]);
        setStatus('Order confirmed! Redirecting...');
        setTimeout(() => setActivePage('orders'), 2000);

      } catch (err) {
        console.error('Failed to save order:', err);
        setStatus('Payment received but order failed to save. Contact support.');
      }
    };

    saveOrder();
  }, [setActivePage, setBasket]);

  return (
    <main style={{ textAlign: 'center', padding: '60px 20px' }}>
      <h1>✅ Payment Successful</h1>
      <p>{status}</p>
    </main>
  );
}

export default PaymentSuccess;