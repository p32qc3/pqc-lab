const links = [...document.querySelectorAll('.site-header nav a')];
const sections = links.map((link) => document.querySelector(link.hash)).filter(Boolean);
const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealTargets = [...document.querySelectorAll('[data-reveal]')];

let signalFrame = 0;
let signalX = 50;
let signalY = 30;
let revealStarted = false;

function updateSignalPosition() {
  signalFrame = 0;
  root.style.setProperty('--signal-x', `${signalX}%`);
  root.style.setProperty('--signal-y', `${signalY}%`);
}

function queueSignalPosition(clientX, clientY) {
  if (document.hidden || reducedMotion) return;
  signalX = Math.max(0, Math.min(100, (clientX / window.innerWidth) * 100));
  signalY = Math.max(0, Math.min(100, (clientY / window.innerHeight) * 100));
  if (!signalFrame) signalFrame = requestAnimationFrame(updateSignalPosition);
}

function revealEverything() {
  revealTargets.forEach((target) => target.classList.add('is-revealed'));
}

function startReveal() {
  if (revealStarted) return;
  revealStarted = true;
  if (!reducedMotion && 'IntersectionObserver' in window) {
    document.body.classList.add('reveal-ready');
    const revealObserver = new IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -8%', threshold: .08 });
    revealTargets.forEach((target) => revealObserver.observe(target));
  } else {
    revealEverything();
  }
}

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      links.forEach((link) => {
        if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
    }
  }, { rootMargin: '-38% 0px -52%' });

  sections.forEach((section) => observer.observe(section));
}

window.addEventListener('pointermove', (event) => {
  queueSignalPosition(event.clientX, event.clientY);
}, { passive: true });

if (document.body.classList.contains('opening-active')) {
  window.addEventListener('pqc:opening-complete', startReveal, { once: true });
} else startReveal();

document.addEventListener('visibilitychange', () => {
  document.body.classList.toggle('motion-paused', document.hidden);
  if (document.hidden && signalFrame) {
    cancelAnimationFrame(signalFrame);
    signalFrame = 0;
  }
});
