const storageKey = (uid) => `customerNotifRead_${uid}`;

export const loadReadKeys = (uid) => {
  if (!uid) return new Set();
  try {
    const raw = localStorage.getItem(storageKey(uid));
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

export const saveReadKeys = (uid, keys) => {
  if (!uid) return;
  localStorage.setItem(storageKey(uid), JSON.stringify([...keys]));
};
