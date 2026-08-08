const links = [...document.querySelectorAll('.site-header nav a')];
const sections = links.map((link) => document.querySelector(link.hash)).filter(Boolean);
const root = document.documentElement;

let signalFrame = 0;
let signalX = 50;
let signalY = 30;

function updateSignalPosition() {
  signalFrame = 0;
  root.style.setProperty('--signal-x', `${signalX}%`);
  root.style.setProperty('--signal-y', `${signalY}%`);
}

function queueSignalPosition(clientX, clientY) {
  signalX = Math.max(0, Math.min(100, (clientX / window.innerWidth) * 100));
  signalY = Math.max(0, Math.min(100, (clientY / window.innerHeight) * 100));
  if (!signalFrame) signalFrame = requestAnimationFrame(updateSignalPosition);
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

window.addEventListener('touchmove', (event) => {
  const touch = event.touches[0];
  if (touch) queueSignalPosition(touch.clientX, touch.clientY);
}, { passive: true });
