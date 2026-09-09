// Language pages and downloads work without JavaScript; animations are opt-in.
const tabs = [...document.querySelectorAll('[role="tab"]')];
const labels = document.body.dataset;
let activePlayback = null;

function stopPlayback() {
  if (!activePlayback) return;
  const { image, button, timeout } = activePlayback;
  activePlayback = null;
  clearTimeout(timeout);
  image.onload = image.onerror = null;
  image.src = image.dataset.poster;
  button.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-label', `${labels.play}: ${button.dataset.title}`);
  button.querySelector('span').textContent = `${labels.play} · ${Number(button.dataset.duration) / 1000} ${labels.seconds}`;
}

function selectTab(tab, focus = false) {
  stopPlayback();
  for (const item of tabs) {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  }
  document.querySelector('.demo-status').textContent = '';
  if (focus) tab.focus();
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    const next = { ArrowDown: (index + 1) % tabs.length, ArrowUp: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    selectTab(tabs[next], true);
  });
});

document.querySelectorAll('.play-button').forEach(button => {
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => {
    const wasPlaying = activePlayback?.button === button;
    stopPlayback();
    if (wasPlaying) return;
    const image = button.closest('.demo-panel').querySelector('img');
    const playback = { image, button, timeout: null };
    activePlayback = playback;
    document.querySelector('.demo-status').textContent = '';
    button.setAttribute('aria-pressed', 'true');
    button.setAttribute('aria-label', `${labels.stop}: ${button.dataset.title}`);
    button.querySelector('span').textContent = labels.stop;
    image.onload = () => {
      if (activePlayback === playback) playback.timeout = setTimeout(stopPlayback, Number(button.dataset.duration));
    };
    image.onerror = () => {
      if (activePlayback !== playback) return;
      stopPlayback();
      document.querySelector('.demo-status').textContent = labels.demoError;
    };
    image.src = image.dataset.animation;
  });
});
document.addEventListener('visibilitychange', () => { if (document.hidden) stopPlayback(); });
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting && activePlayback?.button.closest('.demo-panel') === entry.target) stopPlayback();
    }
  });
  document.querySelectorAll('.demo-panel').forEach(panel => observer.observe(panel));
}
