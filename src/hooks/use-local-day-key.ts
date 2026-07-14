import { useEffect, useState } from 'react';

function localDayKey(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function millisecondsUntilNextLocalDay(now = new Date()) {
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  return Math.max(1, nextMidnight.getTime() - now.getTime() + 10);
}

/**
 * Reactive local calendar day. Long-lived front-desk tabs use this signal to
 * recompute status and "today" views immediately after local midnight.
 */
export function useLocalDayKey() {
  const [dayKey, setDayKey] = useState(localDayKey);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      timer = setTimeout(() => {
        setDayKey(localDayKey());
        schedule();
      }, millisecondsUntilNextLocalDay());
    };

    schedule();

    return () => clearTimeout(timer);
  }, []);

  return dayKey;
}

export { localDayKey, millisecondsUntilNextLocalDay };
