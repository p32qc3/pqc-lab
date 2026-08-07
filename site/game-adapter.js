export function createHighScoreStore(storage, key = 'pqc-runner-high-score-v1') {
  let memory = 0;

  function load() {
    try {
      const saved = Number.parseInt(storage?.getItem(key) ?? '0', 10);
      if (Number.isFinite(saved) && saved > memory) memory = saved;
    } catch {
      // Private browsing and strict policies may block storage.
    }
    return memory;
  }

  function save(score) {
    const normalized = Math.max(0, Math.floor(Number(score) || 0));
    memory = Math.max(load(), normalized);
    try {
      storage?.setItem(key, String(memory));
    } catch {
      // The in-memory score remains available for this visit.
    }
    return memory;
  }

  return { load, save };
}

export function isJumpCommand(event) {
  return !event.repeat && (event.code === 'Space' || event.code === 'ArrowUp');
}

export function formatScore(score) {
  const normalized = Math.min(99999, Math.max(0, Math.floor(Number(score) || 0)));
  return String(normalized).padStart(5, '0');
}
