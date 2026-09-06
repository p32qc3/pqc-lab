import {
  chooseOpeningMode,
  createOpeningStore,
  localDateKey,
} from './opening-core.js';

const overlay = document.querySelector('#site-opening');
const skipButton = document.querySelector('#opening-skip');
const pageContent = [...document.querySelectorAll('.skip-link, .site-header, main, footer')];
const previousFocus = document.activeElement;
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
  const restoreFocus = overlay.contains(document.activeElement);
  overlay.hidden = true;
  pageContent.forEach((element) => { element.inert = false; });
  if (restoreFocus) {
    const target = previousFocus !== document.body && previousFocus.isConnected
      ? previousFocus : document.querySelector('.brand');
    target?.focus({ preventScroll: true });
  }
  window.dispatchEvent(new CustomEvent('pqc:opening-complete'));
}

if (mode === 'skip') {
  finishOpening({ remember: false });
} else {
  overlay.hidden = false;
  document.body.classList.add('opening-active');
  pageContent.forEach((element) => { element.inert = true; });
  skipButton.focus({ preventScroll: true });
  overlay.classList.add(mode === 'reduced' ? 'opening--reduced' : 'opening--full');
  requestAnimationFrame(() => overlay.classList.add('is-playing'));
  completionTimer = window.setTimeout(
    () => finishOpening(),
    mode === 'reduced' ? 500 : 3100,
  );
  skipButton.addEventListener('click', () => finishOpening(), { once: true });
  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') finishOpening();
    if (event.key === 'Tab') {
      event.preventDefault();
      skipButton.focus();
    }
  });
}
