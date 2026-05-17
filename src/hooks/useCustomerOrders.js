import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../Firebase/firebaseConfig';
import { useAuth } from '../Services/AuthContext';

export function useCustomerOrders() {
  const { currentUser, authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!currentUser?.uid) {
      setOrders([]);
      setError('');
      setLoading(false);
      return;
    }

    setLoading(true);
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
      const sorted = [...map.values()].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setOrders(sorted);
      setLoading(false);
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
      (snap) => { snapById = snap; tryMerge(); },
      (err) => {
        console.error(err);
        setError('Could not load notifications.');
        setOrders([]);
        setLoading(false);
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
        (snap) => { snapByEmail = snap; tryMerge(); },
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
        (snap) => { snapByDisplayName = snap; tryMerge(); },
        (err) => console.error(err)
      );
    }

    return () => {
      unsubById();
      unsubByEmail();
      unsubByDisplayName();
    };
  }, [authLoading, currentUser?.uid, currentUser?.email, currentUser?.displayName]);

  return { orders, error, loading: authLoading || loading };
}
