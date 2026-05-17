import React, { useEffect, useMemo, useRef, useState } from 'react';
import './NotificationBell.css';
import { assets } from '../../Assets/assets';
import { useAuth } from '../../Services/AuthContext';
import { useCustomerOrders } from '../../hooks/useCustomerOrders';
import { getNotificationKey, STATUS_CONFIG } from '../Customer/notificationConfig';
import { loadReadKeys, saveReadKeys } from '../../utils/notificationReadState';

export default function NotificationBell({ setActivePage, activePage }) {
  const { currentUser } = useAuth();
  const { orders, loading } = useCustomerOrders();
  const [readKeys, setReadKeys] = useState(() => loadReadKeys(currentUser?.uid));
  const [open, setOpen] = useState(false);
  const [shaking, setShaking] = useState(false);
  const rootRef = useRef(null);
  const prevUnreadCountRef = useRef(0);
  const isFirstUnreadRef = useRef(true);
  const [baselineKeys, setBaselineKeys] = useState(null);

  useEffect(() => {
    setReadKeys(loadReadKeys(currentUser?.uid));
    setBaselineKeys(null);
    isFirstUnreadRef.current = true;
    prevUnreadCountRef.current = 0;
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!loading && baselineKeys === null) {
      setBaselineKeys(new Set(orders.map(getNotificationKey)));
    }
  }, [loading, orders, baselineKeys]);

  useEffect(() => {
    if (activePage === 'notifications' && currentUser?.uid && orders.length > 0) {
      const allKeys = new Set(orders.map(getNotificationKey));
      setReadKeys(allKeys);
      saveReadKeys(currentUser.uid, allKeys);
    }
  }, [activePage, currentUser?.uid, orders]);

  const unreadOrders = useMemo(
    () => orders.filter((o) => {
      const key = getNotificationKey(o);
      if (readKeys.has(key)) return false;
      if (baselineKeys?.has(key)) return false;
      return true;
    }),
    [orders, readKeys, baselineKeys]
  );

  const unreadCount = unreadOrders.length;

  useEffect(() => {
    if (loading) return;

    if (isFirstUnreadRef.current) {
      isFirstUnreadRef.current = false;
      prevUnreadCountRef.current = unreadCount;
      return;
    }

    if (unreadCount > prevUnreadCountRef.current) {
      setShaking(true);
      const timer = setTimeout(() => setShaking(false), 800);
      prevUnreadCountRef.current = unreadCount;
      return () => clearTimeout(timer);
    }

    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount, loading]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const markKeyRead = (key) => {
    if (!currentUser?.uid) return;
    setReadKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      saveReadKeys(currentUser.uid, next);
      return next;
    });
  };

  const handleToggle = () => {
    setOpen((prev) => !prev);
  };

  const handleItemClick = (order) => {
    markKeyRead(getNotificationKey(order));
    setOpen(false);
    setActivePage('notifications');
  };

  const handleViewAll = () => {
    if (currentUser?.uid && orders.length > 0) {
      const allKeys = new Set(orders.map(getNotificationKey));
      setReadKeys(allKeys);
      saveReadKeys(currentUser.uid, allKeys);
    }
    setOpen(false);
    setActivePage('notifications');
  };

  if (!currentUser) return null;

  return (
    <div className="nav-notif" ref={rootRef}>
      <button
        type="button"
        className={`nav-notif__btn${shaking ? ' nav-notif__btn--shake' : ''}`}
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`}
      >
        <img src={assets.notificationbell} alt="" className="nav-notif__icon" />
        {unreadCount > 0 && (
          <span className="nav-notif__badge" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section className="nav-notif__panel" role="menu" aria-label="Unread notifications">
          <header className="nav-notif__panel-header">
            <strong>Notifications</strong>
            {unreadCount > 0 && (
              <span className="nav-notif__panel-count">{unreadCount} unread</span>
            )}
          </header>

          <ul className="nav-notif__list">
            {loading ? (
              <li className="nav-notif__empty">Loading…</li>
            ) : unreadCount === 0 ? (
              <li className="nav-notif__empty">No unread notifications</li>
            ) : (
              unreadOrders.map((order) => {
                const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                return (
                  <li key={getNotificationKey(order)}>
                    <button
                      type="button"
                      className="nav-notif__item"
                      role="menuitem"
                      onClick={() => handleItemClick(order)}
                    >
                      <span className="nav-notif__item-emoji">{config.emoji}</span>
                      <span className="nav-notif__item-body">
                        <strong className="nav-notif__item-title">{order.vendorName}</strong>
                        <span className="nav-notif__item-msg">{config.label}</span>
                      </span>
                      {order.time && (
                        <time className="nav-notif__item-time">{order.time}</time>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          <footer className="nav-notif__panel-footer">
            <button type="button" className="nav-notif__view-all" onClick={handleViewAll}>
              View all notifications
            </button>
          </footer>
        </section>
      )}
    </div>
  );
}
