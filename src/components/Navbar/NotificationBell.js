import React, { useEffect, useMemo, useRef, useState } from 'react';
import './NotificationBell.css';
import { assets } from '../../Assets/assets';
import { useAuth } from '../../Services/AuthContext';
import { useCustomerOrders } from '../../Context/CustomerOrdersContext';
import { STATUS_CONFIG } from '../Customer/notificationConfig';
import {
  getUnreadOrders,
  loadSeenStatus,
  markAllOrdersSeen,
  markOrderSeen,
  saveSeenStatus,
} from '../../utils/notificationReadState';

export default function NotificationBell({ setActivePage, activePage, onSeenStatusChange }) {
  const { currentUser } = useAuth();
  const { orders, loading } = useCustomerOrders();
  const [seenStatus, setSeenStatus] = useState(() => loadSeenStatus(currentUser?.uid));
  const [open, setOpen] = useState(false);
  const [shaking, setShaking] = useState(false);
  const rootRef = useRef(null);
  const prevUnreadCountRef = useRef(0);
  const isFirstUnreadRef = useRef(true);

  // Reload seen status when user changes
  useEffect(() => {
    const loaded = loadSeenStatus(currentUser?.uid);
    setSeenStatus(loaded);
    isFirstUnreadRef.current = true;
    prevUnreadCountRef.current = 0;
    if (onSeenStatusChange) onSeenStatusChange(loaded);
  }, [currentUser?.uid, onSeenStatusChange]);

  const unreadOrders = useMemo(
    () => getUnreadOrders(orders, seenStatus),
    [orders, seenStatus]
  );

  const unreadCount = unreadOrders.length;

  // Shake bell when new unread arrives — but NOT on initial load
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

  // Close panel on outside click or Escape key
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

  // Mark a single order as seen and propagate to parent
  const acknowledgeOrder = (order) => {
    if (!currentUser?.uid) return;
    setSeenStatus((prev) => {
      const next = markOrderSeen(prev, order);
      saveSeenStatus(currentUser.uid, next);
      if (onSeenStatusChange) onSeenStatusChange(next);
      return next;
    });
  };

  // Mark ALL orders as seen and propagate to parent
  const acknowledgeAll = () => {
    if (!currentUser?.uid || orders.length === 0) return;
    setSeenStatus((prev) => {
      const next = markAllOrdersSeen(prev, orders);
      saveSeenStatus(currentUser.uid, next);
      if (onSeenStatusChange) onSeenStatusChange(next);
      return next;
    });
  };

  const handleToggle = () => {
    setOpen((prev) => !prev);
  };

  // Click a specific notification: mark ONLY that one as read, then navigate
  const handleItemClick = (order) => {
    acknowledgeOrder(order);
    setOpen(false);
    setActivePage('notifications');
  };

  // "View all" — just navigate, do NOT mark anything as read
  const handleViewAll = () => {
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
            <div className="nav-notif__panel-header-right">
              {unreadCount > 0 && (
                <>
                  <span className="nav-notif__panel-count">{unreadCount} unread</span>
                  <button
                    type="button"
                    className="nav-notif__mark-all-btn"
                    onClick={acknowledgeAll}
                  >
                    Mark all read
                  </button>
                </>
              )}
            </div>
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
                  <li key={`${order.id}-${order.status}`}>
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