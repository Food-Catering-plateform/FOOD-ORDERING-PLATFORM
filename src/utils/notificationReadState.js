const storageKey = (uid) => `customerNotifSeen_${uid}`;

/** Last order status the customer acknowledged per order id */
export const loadSeenStatus = (uid) => {
  if (!uid) return {};
  try {
    const raw = localStorage.getItem(storageKey(uid));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveSeenStatus = (uid, seenStatus) => {
  if (!uid) return;
  localStorage.setItem(storageKey(uid), JSON.stringify(seenStatus));
};

export const isOrderUnread = (order, seenStatus) => {
  const seen = seenStatus[order.id];
  if (seen === undefined) return true;
  return seen !== order.status;
};

export const markOrderSeen = (seenStatus, order) => ({
  ...seenStatus,
  [order.id]: order.status,
});

export const markAllOrdersSeen = (seenStatus, orders) => {
  const next = { ...seenStatus };
  orders.forEach((o) => {
    next[o.id] = o.status;
  });
  return next;
};

export const getUnreadOrders = (orders, seenStatus) =>
  orders.filter((o) => isOrderUnread(o, seenStatus));
