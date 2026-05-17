import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ── Static mocks ──────────────────────────────────────────────────────────────

jest.mock('../NotificationBell.css', () => ({}));

// ── Firebase mocks ────────────────────────────────────────────────────────────

const mockOnSnapshot = jest.fn();
const mockUpdateDoc  = jest.fn(() => Promise.resolve());
const mockDeleteDoc  = jest.fn(() => Promise.resolve());
const mockCollection = jest.fn((_db, ...path) => ({ path }));
const mockDoc        = jest.fn((_db, ...path) => ({ path }));
const mockQuery      = jest.fn((...args) => args);
const mockOrderBy    = jest.fn((...args) => args);

jest.mock('../../../Firebase/firebaseConfig', () => ({ db: {} }));

jest.mock('firebase/firestore', () => ({
  collection: (...args) => mockCollection(...args),
  onSnapshot: (...args) => mockOnSnapshot(...args),
  updateDoc:  (...args) => mockUpdateDoc(...args),
  deleteDoc:  (...args) => mockDeleteDoc(...args),
  doc:        (...args) => mockDoc(...args),
  query:      (...args) => mockQuery(...args),
  orderBy:    (...args) => mockOrderBy(...args),
}));

// ── Auth mock ─────────────────────────────────────────────────────────────────

let mockCurrentUser = { uid: 'vendor-123' };

jest.mock('../../../Services/AuthContext', () => ({
  useAuth: () => ({ currentUser: mockCurrentUser }),
}));

// ── Browser Notification API mock ─────────────────────────────────────────────

const mockNotificationConstructor = jest.fn();
global.Notification = mockNotificationConstructor;
global.Notification.permission = 'granted';
global.Notification.requestPermission = jest.fn(() => Promise.resolve('granted'));

// ── Import component AFTER mocks ──────────────────────────────────────────────

import NotificationBell from '../NotificationBell';

// ── Helpers ───────────────────────────────────────────────────────────────────

const renderBell = () => render(<NotificationBell />);

function setupNotifications(docs = []) {
  let snapshotCb;

  mockOnSnapshot.mockImplementation((_query, cb) => {
    snapshotCb = cb;
    cb({ docs: docs.map(d => ({ id: d.docId, data: () => d })) });
    return jest.fn(); // unsubscribe
  });

  const triggerSnapshot = (newDocs) => {
    if (snapshotCb) {
      snapshotCb({ docs: newDocs.map(d => ({ id: d.docId, data: () => d })) });
    }
  };

  return { triggerSnapshot };
}

const makeNotif = (overrides = {}) => ({
  docId:   'notif-abc123',
  orderId: 'order-abc123',
  message: 'New order #ABC123 — R 50.00',
  time:    new Date().toISOString(),
  read:    false,
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────────────

describe('NotificationBell – rendering', () => {
  beforeEach(() => {
    mockCurrentUser = { uid: 'vendor-123' };
    jest.clearAllMocks();
    global.Notification.permission = 'granted';
  });

  it('renders the bell button', () => {
    setupNotifications();
    renderBell();
    expect(screen.getByTitle('Notifications')).toBeInTheDocument();
  });

  it('does not show badge when there are no unread notifications', async () => {
    setupNotifications([makeNotif({ read: true })]);
    renderBell();
    await waitFor(() => {
      expect(document.querySelector('.notif-bell__badge')).not.toBeInTheDocument();
    });
  });

  it('shows badge with correct count for unread notifications', async () => {
    setupNotifications([
      makeNotif({ docId: 'n1', read: false }),
      makeNotif({ docId: 'n2', read: false }),
    ]);
    renderBell();
    await waitFor(() => {
      expect(document.querySelector('.notif-bell__badge')).toBeInTheDocument();
      expect(document.querySelector('.notif-bell__badge').textContent).toBe('2');
    });
  });

  it('shows 99+ when unread count exceeds 99', async () => {
    const manyNotifs = Array.from({ length: 100 }, (_, i) =>
      makeNotif({ docId: `n${i}`, read: false })
    );
    setupNotifications(manyNotifs);
    renderBell();
    await waitFor(() => {
      expect(document.querySelector('.notif-bell__badge').textContent).toBe('99+');
    });
  });

  it('dropdown is not visible by default', () => {
    setupNotifications();
    renderBell();
    expect(document.querySelector('.notif-bell__dropdown')).not.toBeInTheDocument();
  });

  it('does not call onSnapshot when currentUser is null', () => {
    mockCurrentUser = null;
    mockOnSnapshot.mockReturnValue(jest.fn());
    renderBell();
    expect(mockOnSnapshot).not.toHaveBeenCalled();
  });

  it('requests notification permission on mount when permission is default', () => {
    global.Notification.permission = 'default';
    setupNotifications();
    renderBell();
    expect(global.Notification.requestPermission).toHaveBeenCalled();
  });

  it('does not request permission when already granted', () => {
    global.Notification.permission = 'granted';
    setupNotifications();
    renderBell();
    expect(global.Notification.requestPermission).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Dropdown open / close
// ─────────────────────────────────────────────────────────────────────────────

describe('NotificationBell – dropdown open/close', () => {
  beforeEach(() => {
    mockCurrentUser = { uid: 'vendor-123' };
    jest.clearAllMocks();
  });

  it('opens dropdown when bell is clicked', () => {
    setupNotifications();
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    expect(document.querySelector('.notif-bell__dropdown')).toBeInTheDocument();
  });

  it('closes dropdown when bell is clicked again', () => {
    setupNotifications();
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    fireEvent.click(screen.getByTitle('Notifications'));
    expect(document.querySelector('.notif-bell__dropdown')).not.toBeInTheDocument();
  });

  it('closes dropdown when clicking outside', () => {
    setupNotifications();
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    expect(document.querySelector('.notif-bell__dropdown')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(document.querySelector('.notif-bell__dropdown')).not.toBeInTheDocument();
  });

  it('shows empty state when no notifications', () => {
    setupNotifications([]);
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    expect(screen.getByText(/you're all caught up/i)).toBeInTheDocument();
  });

  it('shows notification message in dropdown', async () => {
    setupNotifications([makeNotif({ message: 'New order #XYZ999 — R 75.00' })]);
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    await waitFor(() => {
      expect(screen.getByText('New order #XYZ999 — R 75.00')).toBeInTheDocument();
    });
  });

  it('shows unread pill in header when there are unread notifications', async () => {
    setupNotifications([makeNotif({ read: false })]);
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    await waitFor(() => {
      expect(screen.getByText(/1 new/i)).toBeInTheDocument();
    });
  });

  it('shows Mark all read button when there are unread notifications', async () => {
    setupNotifications([makeNotif({ read: false })]);
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    await waitFor(() => {
      expect(screen.getByText(/mark all read/i)).toBeInTheDocument();
    });
  });

  it('shows Clear all button when there are notifications', async () => {
    setupNotifications([makeNotif()]);
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    await waitFor(() => {
      expect(screen.getByText(/clear all/i)).toBeInTheDocument();
    });
  });

  it('does not show Mark all read when all notifications are read', async () => {
    setupNotifications([makeNotif({ read: true })]);
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    await waitFor(() => {
      expect(screen.queryByText(/mark all read/i)).not.toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Mark as read
// ─────────────────────────────────────────────────────────────────────────────

describe('NotificationBell – mark as read', () => {
  beforeEach(() => {
    mockCurrentUser = { uid: 'vendor-123' };
    jest.clearAllMocks();
  });

  it('calls updateDoc when a notification item is clicked', async () => {
    setupNotifications([makeNotif({ docId: 'notif-1', read: false })]);
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    await waitFor(() => screen.getByText('New order #ABC123 — R 50.00'));
    fireEvent.click(screen.getByText('New order #ABC123 — R 50.00'));
    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalled();
      const lastCall = mockUpdateDoc.mock.calls[0];
      expect(lastCall[lastCall.length - 1]).toEqual({ read: true });
    });
  });

  it('calls updateDoc for all unread when Mark all read is clicked', async () => {
    setupNotifications([
      makeNotif({ docId: 'n1', read: false }),
      makeNotif({ docId: 'n2', read: false, message: 'New order #DEF456 — R 30.00' }),
    ]);
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    await waitFor(() => screen.getByText(/mark all read/i));
    fireEvent.click(screen.getByText(/mark all read/i));
    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
    });
  });

  it('shows unread dot for unread notifications', async () => {
    setupNotifications([makeNotif({ read: false })]);
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    await waitFor(() => {
      expect(document.querySelector('.notif-bell__item-dot')).toBeInTheDocument();
    });
  });

  it('does not show unread dot for read notifications', async () => {
    setupNotifications([makeNotif({ read: true })]);
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    await waitFor(() => {
      expect(document.querySelector('.notif-bell__item-dot')).not.toBeInTheDocument();
    });
  });

  it('shows unread class on unread notification item', async () => {
    setupNotifications([makeNotif({ read: false })]);
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    await waitFor(() => {
      expect(document.querySelector('.notif-bell__item.unread')).toBeInTheDocument();
    });
  });

  it('does not show unread class on read notification item', async () => {
    setupNotifications([makeNotif({ read: true })]);
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    await waitFor(() => {
      expect(document.querySelector('.notif-bell__item.unread')).not.toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Clear all
// ─────────────────────────────────────────────────────────────────────────────

describe('NotificationBell – clear all', () => {
  beforeEach(() => {
    mockCurrentUser = { uid: 'vendor-123' };
    jest.clearAllMocks();
  });

  it('calls deleteDoc for each notification when Clear all is clicked', async () => {
    setupNotifications([
      makeNotif({ docId: 'n1' }),
      makeNotif({ docId: 'n2', message: 'New order #DEF456 — R 30.00' }),
    ]);
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    await waitFor(() => screen.getByText(/clear all/i));
    fireEvent.click(screen.getByText(/clear all/i));
    await waitFor(() => {
      expect(mockDeleteDoc).toHaveBeenCalledTimes(2);
    });
  });

  it('closes dropdown after clearing all', async () => {
    setupNotifications([makeNotif()]);
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    await waitFor(() => screen.getByText(/clear all/i));
    fireEvent.click(screen.getByText(/clear all/i));
    await waitFor(() => {
      expect(document.querySelector('.notif-bell__dropdown')).not.toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatTime
// ─────────────────────────────────────────────────────────────────────────────

describe('NotificationBell – formatTime', () => {
  beforeEach(() => {
    mockCurrentUser = { uid: 'vendor-123' };
    jest.clearAllMocks();
  });

  it('shows Just now for a notification created less than 1 minute ago', async () => {
    setupNotifications([makeNotif({ time: new Date().toISOString() })]);
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    await waitFor(() => {
      expect(screen.getByText('Just now')).toBeInTheDocument();
    });
  });

  it('shows minutes ago for a notification created 30 minutes ago', async () => {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    setupNotifications([makeNotif({ time: thirtyMinsAgo })]);
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    await waitFor(() => {
      expect(screen.getByText('30m ago')).toBeInTheDocument();
    });
  });

  it('shows hours ago for a notification created 3 hours ago', async () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    setupNotifications([makeNotif({ time: threeHoursAgo })]);
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    await waitFor(() => {
      expect(screen.getByText('3h ago')).toBeInTheDocument();
    });
  });

  it('shows date for a notification older than 24 hours', async () => {
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    setupNotifications([makeNotif({ time: yesterday })]);
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    await waitFor(() => {
      const timeEl = document.querySelector('.notif-bell__item-time');
      expect(timeEl).toBeInTheDocument();
      expect(timeEl.textContent).not.toBe('');
    });
  });

  it('returns empty string for missing time', async () => {
    setupNotifications([makeNotif({ time: null })]);
    renderBell();
    fireEvent.click(screen.getByTitle('Notifications'));
    await waitFor(() => {
      const timeEl = document.querySelector('.notif-bell__item-time');
      expect(timeEl.textContent).toBe('');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// has-unread CSS class
// ─────────────────────────────────────────────────────────────────────────────

describe('NotificationBell – has-unread class', () => {
  beforeEach(() => {
    mockCurrentUser = { uid: 'vendor-123' };
    jest.clearAllMocks();
  });

  it('adds has-unread class to button when there are unread notifications', async () => {
    setupNotifications([makeNotif({ read: false })]);
    renderBell();
    await waitFor(() => {
      expect(screen.getByTitle('Notifications')).toHaveClass('has-unread');
    });
  });

  it('does not add has-unread class when all notifications are read', async () => {
    setupNotifications([makeNotif({ read: true })]);
    renderBell();
    await waitFor(() => {
      expect(screen.getByTitle('Notifications')).not.toHaveClass('has-unread');
    });
  });

  it('does not add has-unread class when there are no notifications', async () => {
    setupNotifications([]);
    renderBell();
    await waitFor(() => {
      expect(screen.getByTitle('Notifications')).not.toHaveClass('has-unread');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Browser push notification
// ─────────────────────────────────────────────────────────────────────────────

describe('NotificationBell – browser push notification', () => {
  beforeEach(() => {
    mockCurrentUser = { uid: 'vendor-123' };
    jest.clearAllMocks();
    global.Notification.permission = 'granted';
  });

  it('fires browser notification when new unread notification arrives', async () => {
    const { triggerSnapshot } = setupNotifications([]);
    renderBell();

    triggerSnapshot([makeNotif({ read: false })]);

    await waitFor(() => {
      expect(mockNotificationConstructor).toHaveBeenCalledWith(
        'New Order Received!',
        expect.objectContaining({ body: 'New order #ABC123 — R 50.00' })
      );
    });
  });

  it('does not fire browser notification when permission is denied', async () => {
    global.Notification.permission = 'denied';
    const { triggerSnapshot } = setupNotifications([]);
    renderBell();

    triggerSnapshot([makeNotif({ read: false })]);

    await waitFor(() => {
      expect(mockNotificationConstructor).not.toHaveBeenCalled();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Firestore subscription
// ─────────────────────────────────────────────────────────────────────────────

describe('NotificationBell – Firestore subscription', () => {
  beforeEach(() => {
    mockCurrentUser = { uid: 'vendor-123' };
    jest.clearAllMocks();
  });

  it('subscribes to notifications on mount', () => {
    setupNotifications();
    renderBell();
    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes from Firestore on unmount', () => {
    const unsub = jest.fn();
    mockOnSnapshot.mockReturnValue(unsub);
    const { unmount } = renderBell();
    unmount();
    expect(unsub).toHaveBeenCalled();
  });
});