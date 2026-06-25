export const safeStorage = {
  getItem: (key, defaultValue = null) => {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? val : defaultValue;
    } catch (e) {
      console.warn('localStorage read error:', e);
      return defaultValue;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.error('localStorage write error / storage exhausted:', e);
      return false;
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error('localStorage remove error:', e);
      return false;
    }
  }
};
