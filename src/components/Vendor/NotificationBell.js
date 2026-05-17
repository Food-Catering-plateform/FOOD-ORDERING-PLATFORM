import React, { useEffect, useState, useRef } from 'react';
import './NotificationBell.css';
import { db } from '../../Firebase/firebaseConfig';
import { collection, onSnapshot, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../../Services/AuthContext';

function NotificationBell() {
  const { currentUser } = useAuth();
  const vendorId = currentUser?.uid;

  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const prevCountRef = useRef(0);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Listen to notifications from Firestore
  useEffect(() => {
    if (!vendorId) return;

    const q = query(
      collection(db, 'Vendors', vendorId, 'notifications'),
      orderBy('time', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const fetched = snap.docs.map(d => ({ docId: d.id, ...d.data() }));

      // Show browser pop-up for any new unread notifications
      const newUnread = fetched.filter(n => !n.read).length;
      if (newUnread > prevCountRef.current && prevCountRef.current !== null) {
        const newest = fetched.find(n => !n.read);
        if (newest && Notification.permission === 'granted') {
          new Notification('New Order Received!', {
            body: newest.message,
            icon: '/favicon.ico',
            tag: newest.orderId,
          });
        }
      }
      prevCountRef.current = newUnread;
      setNotifications(fetched);
    });

    return () => unsub();
  }, [vendorId]);

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const markOneRead = async (docId) => {
    await updateDoc(doc(db, 'Vendors', vendorId, 'notifications', docId), { read: true });
  };

  const markAllRead = async () => {
    for (const n of notifications.filter(n => !n.read)) {
      await updateDoc(doc(db, 'Vendors', vendorId, 'notifications', n.docId), { read: true });
    }
  };

  const clearAll = async () => {
    for (const n of notifications) {
      await deleteDoc(doc(db, 'Vendors', vendorId, 'notifications', n.docId));
    }
    setOpen(false);
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const d = new Date(timeStr);
    if (isNaN(d)) return '';
    const diffMins = Math.floor((Date.now() - d) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString('en-ZA');
  };

  return (
    <div className="notif-bell" ref={dropdownRef}>

      <button
        className={`notif-bell__btn ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setOpen(prev => !prev)}
        aria-label={`Notifications — ${unreadCount} unread`}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notif-bell__badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-bell__dropdown">
          <div className="notif-bell__dropdown-header">
            <span className="notif-bell__title">
              🔔 Notifications
              {unreadCount > 0 && (
                <span className="notif-bell__unread-pill">{unreadCount} new</span>
              )}
            </span>
            <div className="notif-bell__header-actions">
              {unreadCount > 0 && (
                <button className="notif-bell__action-btn" onClick={markAllRead}>
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button className="notif-bell__action-btn notif-bell__action-btn--clear" onClick={clearAll}>
                  Clear all
                </button>
              )}
            </div>
          </div>

          <ul className="notif-bell__list">
            {notifications.length === 0 ? (
              <li className="notif-bell__empty">✅ You're all caught up!</li>
            ) : (
              notifications.map(n => (
                <li
                  key={n.docId}
                  className={`notif-bell__item ${!n.read ? 'unread' : ''}`}
                  onClick={() => markOneRead(n.docId)}
                >
                  <span className="notif-bell__item-icon">🛍️</span>
                  <span className="notif-bell__item-body">
                    <span className="notif-bell__item-msg">{n.message}</span>
                    <span className="notif-bell__item-time">{formatTime(n.time)}</span>
                  </span>
                  {!n.read && <span className="notif-bell__item-dot" />}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;