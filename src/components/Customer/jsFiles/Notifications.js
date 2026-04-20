// Import React hooks and styles
import React, { useEffect, useMemo, useState } from 'react';
import '../css/Notifications.css';

// Import Firebase functions to read data in real-time
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../Firebase/firebaseConfig';

// Import authentication context (current logged-in user)
import { useAuth } from '../../../Services/AuthContext';

// Main component
const Notifications = () => {

  // Get logged-in user and loading state
  const { currentUser, authLoading } = useAuth();

  // Store orders and error messages
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  // Unique key to track which orders already sent email (stored in browser)
  const notifiedStorageKey = currentUser?.uid
    ? `ready-email-notified:${currentUser.uid}`
    : null;

  // Function to send email when order is ready
  const sendReadyEmail = async (order) => {
    // Get EmailJS config from environment variables
    const serviceId = process.env.REACT_APP_EMAILJS_SERVICE_ID;
    const templateId = process.env.REACT_APP_EMAILJS_READY_TEMPLATE_ID;
    const publicKey = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

    // If config missing → don't send
    if (!serviceId || !templateId || !publicKey) return false;

    // Get recipient email
    const recipientEmail = order.customerEmail || currentUser?.email;
    if (!recipientEmail) return false;

    // Send email request
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: {
          to_email: recipientEmail,
          customer_name: order.customerName || 'Customer',
          order_id: order.id,
          total_amount: typeof order.total === 'number' ? `R ${order.total.toFixed(2)}` : '',
          pickup_time: order.time || 'as soon as possible',
        },
      }),
    });

    return response.ok; // return success
  };

  // Fetch orders in real-time from Firestore
  useEffect(() => {
    // If not logged in → clear orders
    if (authLoading || !currentUser?.uid) {
      setOrders([]);
      return;
    }

    setError('');

    // Query: get orders that belong to current user
    const q = query(
      collection(db, 'Orders'),
      where('customerId', '==', currentUser.uid)
    );

    // Real-time listener
    const unsub = onSnapshot(
      q,
      (snap) => {
        // Convert documents into array
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setOrders(rows);
      },
      (err) => {
        // Handle error
        console.error(err);
        setError('Could not load notifications.');
        setOrders([]);
      }
    );

    // Cleanup listener when component unmounts
    return () => unsub();
  }, [authLoading, currentUser?.uid]);

  // Send email notifications for "ready" orders (only once)
  useEffect(() => {
    if (!notifiedStorageKey) return;

    // Filter ready orders
    const readyOrdersToNotify = orders.filter((o) => o.status === 'ready');
    if (readyOrdersToNotify.length === 0) return;

    // Get already notified order IDs from localStorage
    const stored = JSON.parse(localStorage.getItem(notifiedStorageKey) || '[]');
    const notifiedIds = new Set(stored);

    const sendMissingEmails = async () => {
      for (const order of readyOrdersToNotify) {
        // Skip if already emailed
        if (notifiedIds.has(order.id)) continue;

        try {
          const sent = await sendReadyEmail(order);
          if (sent) notifiedIds.add(order.id);
        } catch (err) {
          console.error(err);
        }
      }

      // Save updated notified IDs
      localStorage.setItem(notifiedStorageKey, JSON.stringify([...notifiedIds]));
    };

    sendMissingEmails();
  }, [orders, notifiedStorageKey]);

  // Memo: filter ready orders (performance optimization)
  const readyOrders = useMemo(
    () => orders.filter((o) => o.status === 'ready'),
    [orders]
  );

  // Memo: filter preparing orders
  const preparingOrders = useMemo(
    () => orders.filter((o) => o.status === 'preparing'),
    [orders]
  );

  // Show loading state
  if (authLoading) {
    return <p>Loading notifications…</p>;
  }

  // If user not logged in
  if (!currentUser) {
    return <p>Please sign in to see notifications.</p>;
  }

  // UI display
  return (
    <section>
      <h1>Notifications</h1>

      {/* Show error if exists */}
      {error && <p>{error}</p>}

      {/* If no orders */}
      {readyOrders.length === 0 && preparingOrders.length === 0 && !error && (
        <p>No order updates yet.</p>
      )}

      {/* Preparing orders */}
      {preparingOrders.length > 0 && (
        <div>
          <h2>In the kitchen</h2>
          {preparingOrders.map((o) => (
            <p key={o.id}>Preparing order {o.id}</p>
          ))}
        </div>
      )}

      {/* Ready orders */}
      {readyOrders.length > 0 && (
        <div>
          <h2>Ready for collection</h2>
          {readyOrders.map((o) => (
            <p key={o.id}>Order {o.id} is ready</p>
          ))}
        </div>
      )}
    </section>
  );
};

export default Notifications;
