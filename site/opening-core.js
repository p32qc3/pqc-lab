const DEFAULT_KEY = 'pqc-opening-completed-date-v1';

function pad(value) {
  return String(value).padStart(2, '0');
}

export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function chooseOpeningMode({ completedToday, reducedMotion }) {
  if (completedToday) return 'skip';
  return reducedMotion ? 'reduced' : 'full';
}

export function createOpeningStore(storage, key = DEFAULT_KEY) {
  return {
    completedToday(dateKey) {
      try {
        return storage?.getItem(key) === dateKey;
      } catch {
        return false;
      }
    },
    markComplete(dateKey) {
      try {
        storage?.setItem(key, dateKey);
        return Boolean(storage);
      } catch {
        return false;
      }
    },
  };
}
