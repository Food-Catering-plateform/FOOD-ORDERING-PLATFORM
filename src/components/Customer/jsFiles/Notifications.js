// Import React hooks and styles
import React, { useEffect, useMemo, useState } from 'react';
import '../css/Notifications.css';

// Import Firebase functions to read data in real-time
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../Firebase/firebaseConfig';

// Import authentication context (current logged-in user)
import { useAuth } from '../../../Services/AuthContext';

/**
 * In-app notifications for the same `Orders` collection the vendor uses (Vendor/Orders.js).
 * Pickup-ready **emails** are sent from the vendor dashboard when status becomes `ready`
 * (see `Services/pickupReadyEmail.js` + `Vendor/Orders.js`) so customers do not need this page open.
 */
const Notifications = () => {
  const { currentUser, authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !currentUser?.uid) {
      setOrders([]);
      return;
    }

    setError('');

    const qById = query(
      collection(db, 'Orders'),
      where('customerId', '==', currentUser.uid)
    );

    const mergeDocs = (snapshots) => {
      const map = new Map();
      snapshots.forEach((snap) => {
        snap.docs.forEach((d) => {
          map.set(d.id, { id: d.id, ...d.data() });
        });
      });
      setOrders([...map.values()]);
    };

    let snapById = null;
    let snapByEmail = null;
    let snapByDisplayName = null;

    const tryMerge = () => {
      const snaps = [snapById, snapByEmail, snapByDisplayName].filter(Boolean);
      if (snaps.length > 0) mergeDocs(snaps);
    };

    const unsubById = onSnapshot(
      qById,
      (snap) => {
        snapById = snap;
        tryMerge();
      },
      (err) => {
        console.error(err);
        setError('Could not load notifications.');
        setOrders([]);
      }
    );

    let unsubByEmail = () => {};
    if (currentUser.email) {
      const qByEmail = query(
        collection(db, 'Orders'),
        where('customerName', '==', currentUser.email)
      );
      unsubByEmail = onSnapshot(
        qByEmail,
        (snap) => {
          snapByEmail = snap;
          tryMerge();
        },
        (err) => console.error(err)
      );
    }

    let unsubByDisplayName = () => {};
    if (currentUser.displayName) {
      const qByDisplayName = query(
        collection(db, 'Orders'),
        where('customerName', '==', currentUser.displayName)
      );
      unsubByDisplayName = onSnapshot(
        qByDisplayName,
        (snap) => {
          snapByDisplayName = snap;
          tryMerge();
        },
        (err) => console.error(err)
      );
    }

    return () => {
      unsubById();
      unsubByEmail();
      unsubByDisplayName();
    };
  }, [authLoading, currentUser?.uid, currentUser?.email, currentUser?.displayName]);

  const readyOrders = useMemo(
    () => orders.filter((o) => o.status === 'ready'),
    [orders]
  );

  const preparingOrders = useMemo(
    () => orders.filter((o) => o.status === 'preparing'),
    [orders]
  );

  const emailConfigured =
    !!process.env.REACT_APP_EMAILJS_SERVICE_ID &&
    !!process.env.REACT_APP_EMAILJS_READY_TEMPLATE_ID &&
    !!process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

  if (authLoading) {
    return <p>Loading notifications…</p>;
  }

  if (!currentUser) {
    return <p>Please sign in to see notifications.</p>;
  }

  return (
    <section>
      <h1>Notifications</h1>

      {!emailConfigured && (
        <p role="status" style={{ fontSize: '0.9rem', color: '#6b7280' }}>
          Email pickup alerts require EmailJS env vars on the deployed build; in-app updates below
          still work from Firestore.
        </p>
      )}

      {error && <p>{error}</p>}

      {readyOrders.length === 0 && preparingOrders.length === 0 && !error && (
        <p>No order updates yet.</p>
      )}

      {preparingOrders.length > 0 && (
        <div>
          <h2>In the kitchen</h2>
          {preparingOrders.map((o) => (
            <p key={o.id}>Preparing order {o.id}</p>
          ))}
        </div>
      )}

      {readyOrders.length > 0 && (
        <div>
          <h2>Ready for collection</h2>
          {readyOrders.map((o) => (
            <p key={o.id}>
              Order {o.id} is ready for pickup
              {o.pickupEmailSent ? ' (email sent)' : ''}.
            </p>
          ))}
        </div>
      )}
    </section>
  );
};

export default Notifications;
