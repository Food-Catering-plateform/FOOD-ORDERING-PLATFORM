import {
  isOrderUnread,
  markOrderSeen,
  markAllOrdersSeen,
  getUnreadOrders,
} from './notificationReadState';

const order = (id, status) => ({ id, status });

test('order is unread when never seen', () => {
  expect(isOrderUnread(order('a', 'pending'), {})).toBe(true);
});

test('order is unread when status changed since last seen', () => {
  expect(isOrderUnread(order('a', 'preparing'), { a: 'pending' })).toBe(true);
});

test('order is read when status matches last seen', () => {
  expect(isOrderUnread(order('a', 'preparing'), { a: 'preparing' })).toBe(false);
});

test('vendor approval shows as unread for customer who saw pending', () => {
  const seen = markOrderSeen({}, order('1', 'pending'));
  const unread = getUnreadOrders([order('1', 'preparing')], seen);
  expect(unread).toHaveLength(1);
});

test('markAllOrdersSeen clears unread list', () => {
  const seen = markAllOrdersSeen({}, [order('1', 'preparing'), order('2', 'ready')]);
  expect(getUnreadOrders([order('1', 'preparing'), order('2', 'ready')], seen)).toHaveLength(0);
});
