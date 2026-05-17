import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../Firebase/firebaseConfig';
import { useAuth } from '../Services/AuthContext';

const CustomerOrdersContext = createContext({
  orders: [],
  error: '',
  loading: true,
});

export function CustomerOrdersProvider({ children }) {
  const { currentUser, authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return undefined;
    }

    if (!currentUser?.uid) {
      setOrders([]);
      setError('');
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError('');

    /**
     * Merge multiple Firestore snapshots into one deduplicated, sorted list.
     *
     * KEY FIX: when the same order id appears in more than one snapshot,
     * we keep whichever copy has the LATEST updatedAt/createdAt timestamp.
     * This prevents a stale snapshot from overwriting a fresher status update
     * that arrived on a different listener.
     */
    const mergeAndSet = (snapshots) => {
      const map = new Map();

      snapshots.forEach((snap) => {
        (snap.docs || []).forEach((d) => {
          const incoming = { id: d.id, ...d.data() };
          const existing = map.get(d.id);

          if (!existing) {
            // First time we see this order — just store it
            map.set(d.id, incoming);
          } else {
            // Order already in map — only replace if incoming is newer
            const incomingTime = new Date(
              incoming.updatedAt || incoming.createdAt || 0
            ).getTime();
            const existingTime = new Date(
              existing.updatedAt || existing.createdAt || 0
            ).getTime();

            if (incomingTime >= existingTime) {
              map.set(d.id, incoming);
            }
            // else: keep existing (it is fresher), discard stale incoming
          }
        });
      });

      const sorted = [...map.values()].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );

      setOrders(sorted);
      setLoading(false);
    };

    let snapById = null;
    let snapByEmail = null;
    let snapByCustomerEmail = null;
    let snapByDisplayName = null;
    let usedFallback = false;

    const tryMerge = () => {
      const snaps = [snapById, snapByEmail, snapByCustomerEmail, snapByDisplayName].filter(Boolean);
      if (snaps.length > 0) mergeAndSet(snaps);
    };

    const fetchFallback = async () => {
      if (usedFallback) return;
      usedFallback = true;
      setLoading(true);
      try {
        const snaps = [];
        const byId = await getDocs(
          query(collection(db, 'Orders'), where('customerId', '==', currentUser.uid))
        );
        snaps.push(byId);

        if (currentUser.email) {
          const byCustomerEmail = await getDocs(
            query(collection(db, 'Orders'), where('customerEmail', '==', currentUser.email))
          ).catch(() => ({ docs: [] }));
          snaps.push(byCustomerEmail);

          const byName = await getDocs(
            query(collection(db, 'Orders'), where('customerName', '==', currentUser.email))
          ).catch(() => ({ docs: [] }));
          snaps.push(byName);
        }

        mergeAndSet(snaps);
      } catch (err) {
        console.error('Fallback getDocs failed:', err);
        setError('Could not load notifications.');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    let unsubById = () => {};
    let unsubByEmail = () => {};
    let unsubByCustomerEmail = () => {};
    let unsubByDisplayName = () => {};

    try {
      unsubById = onSnapshot(
        query(collection(db, 'Orders'), where('customerId', '==', currentUser.uid)),
        (snap) => { snapById = snap; tryMerge(); },
        (err) => { console.error(err); fetchFallback(); }
      );
    } catch {
      fetchFallback();
    }

    if (currentUser.email) {
      try {
        unsubByCustomerEmail = onSnapshot(
          query(collection(db, 'Orders'), where('customerEmail', '==', currentUser.email)),
          (snap) => { snapByCustomerEmail = snap; tryMerge(); },
          (err) => console.error(err)
        );
      } catch { /* ignore */ }

      try {
        unsubByEmail = onSnapshot(
          query(collection(db, 'Orders'), where('customerName', '==', currentUser.email)),
          (snap) => { snapByEmail = snap; tryMerge(); },
          (err) => console.error(err)
        );
      } catch { /* ignore */ }
    }

    if (currentUser.displayName) {
      try {
        unsubByDisplayName = onSnapshot(
          query(collection(db, 'Orders'), where('customerName', '==', currentUser.displayName)),
          (snap) => { snapByDisplayName = snap; tryMerge(); },
          (err) => console.error(err)
        );
      } catch { /* ignore */ }
    }

    return () => {
      unsubById();
      unsubByEmail();
      unsubByCustomerEmail();
      unsubByDisplayName();
    };
  }, [authLoading, currentUser?.uid, currentUser?.email, currentUser?.displayName]);

  const value = useMemo(
    () => ({ orders, error, loading: authLoading || loading }),
    [orders, error, authLoading, loading]
  );

  return (
    <CustomerOrdersContext.Provider value={value}>
      {children}
    </CustomerOrdersContext.Provider>
  );
}

export function useCustomerOrders() {
  return useContext(CustomerOrdersContext);
}