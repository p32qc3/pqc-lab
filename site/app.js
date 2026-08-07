const links = [...document.querySelectorAll('.site-header nav a')];
const sections = links.map((link) => document.querySelector(link.hash)).filter(Boolean);

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
