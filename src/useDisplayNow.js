import { useEffect, useState } from 'react';
import { displayClock } from './display-clock.js';

export function useDisplayNow(running, owner = window) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => displayClock(owner, setNow, running ? 1000 : 60000), [running, owner]);
  return now;
}
