document.querySelectorAll('[data-coach-trigger]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const drawer = trigger.closest('.content')?.querySelector('.coach-drawer');
    if (drawer) {
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
    }
  });
});

document.querySelectorAll('[data-coach-close]').forEach((close) => {
  close.addEventListener('click', () => {
    const drawer = close.closest('.coach-drawer');
    if (drawer) {
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
    }
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  document.querySelectorAll('.coach-drawer.is-open').forEach((drawer) => {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
  });
});
