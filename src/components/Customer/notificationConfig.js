export const STATUS_CONFIG = {
  pending: {
    label:   'Order Received',
    emoji:   '🧾',
    message: 'Your order has been received and is waiting for the vendor to confirm.',
    mod:     'pending',
  },
  preparing: {
    label:   'Being Prepared',
    emoji:   '👨‍🍳',
    message: 'Your order is currently being prepared in the kitchen.',
    mod:     'preparing',
  },
  ready: {
    label:   'Ready for Collection',
    emoji:   '✅',
    message: 'Your order is ready! Head to the vendor to collect it now.',
    mod:     'ready',
  },
  completed: {
    label:   'Order Completed',
    emoji:   '🎉',
    message: 'You have collected your order. Enjoy your meal!',
    mod:     'completed',
  },
  cancelled: {
    label:   'Order Cancelled',
    emoji:   '❌',
    message: 'Your order was cancelled by the vendor. Please place a new order.',
    mod:     'cancelled',
  },
};

export const getNotificationKey = (order) => `${order.id}:${order.status}`;
