import {
  chooseOpeningMode,
  createOpeningStore,
  localDateKey,
} from './opening-core.js';

const overlay = document.querySelector('#site-opening');
const skipButton = document.querySelector('#opening-skip');
let browserStorage;
try {
  browserStorage = window.localStorage;
} catch {
  browserStorage = undefined;
}
const store = createOpeningStore(browserStorage);
const today = localDateKey();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mode = chooseOpeningMode({
  completedToday: store.completedToday(today),
  reducedMotion,
});
let completionTimer = 0;
let finished = false;

function finishOpening({ remember = true } = {}) {
  if (finished) return;
  finished = true;
  window.clearTimeout(completionTimer);
  if (remember) store.markComplete(today);
  document.body.classList.remove('opening-active');
  document.body.classList.add('opening-complete');
  overlay.hidden = true;
  window.dispatchEvent(new CustomEvent('pqc:opening-complete'));
}

if (mode === 'skip') {
  finishOpening({ remember: false });
} else {
  overlay.hidden = false;
  document.body.classList.add('opening-active');
  overlay.classList.add(mode === 'reduced' ? 'opening--reduced' : 'opening--full');
  requestAnimationFrame(() => overlay.classList.add('is-playing'));
  completionTimer = window.setTimeout(
    () => finishOpening(),
    mode === 'reduced' ? 500 : 3100,
  );
  skipButton.addEventListener('click', () => finishOpening(), { once: true });
}
