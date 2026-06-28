import { useEffect, useState } from "react";

// Live clock tick (plan.md §5.3). Components that render time-dependent state -
// "booking closes 30m before", a session becoming "past" - read this so the UI
// stays correct as time passes, without requiring a user interaction. Cheap: a
// single interval per mounted screen, re-rendering only that subtree.
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
