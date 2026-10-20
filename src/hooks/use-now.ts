import { useEffect, useState } from 'react';

/** Hora actual (ms) que se actualiza cada minuto, para los "faltan X" y los avisos. */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
