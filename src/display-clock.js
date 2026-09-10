// This schedules painting only. Persisted timestamps remain the source of time.
export function displayClock(owner, publish, period, clock = Date.now) {
  let timeout;
  let disposed = false;
  const stop = () => { owner.clearTimeout(timeout); timeout = undefined; };
  const refresh = () => {
    stop();
    if (disposed || owner.document.hidden) return;
    const now = clock();
    publish(now);
    timeout = owner.setTimeout(refresh, period - (now % period));
  };
  owner.addEventListener('focus', refresh);
  owner.document.addEventListener('visibilitychange', refresh);
  refresh();
  return () => {
    disposed = true;
    stop();
    owner.removeEventListener('focus', refresh);
    owner.document.removeEventListener('visibilitychange', refresh);
  };
}
