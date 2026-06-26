// A short confetti burst for delightful moments (e.g. a successful booking).
// Module-level bus so any code can fire it: celebrate().
import { useEffect, useState } from "react";

const listeners = new Set<() => void>();
export function celebrate() {
  listeners.forEach((l) => l());
}

const COLORS = ["#d6ff3d", "#7c5cff", "#ff5a8a", "#27e0b0", "#ffb43d", "#5ac8ff"];

export function Celebration() {
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    const fire = () => setBurst((n) => n + 1);
    listeners.add(fire);
    return () => {
      listeners.delete(fire);
    };
  }, []);

  if (burst === 0) return null;

  return (
    <ConfettiBurst
      key={burst}
      onDone={() => {
        /* element is keyed; next burst replaces it */
      }}
    />
  );
}

function ConfettiBurst({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1700);
    return () => clearTimeout(t);
  }, [onDone]);

  // Deterministic-ish spread without Math.random in render: sp6read by index.
  const pieces = Array.from({ length: 70 }, (_, i) => {
    const left = (i * 37) % 100;
    const delay = (i % 10) * 0.05;
    const dur = 1 + ((i * 13) % 70) / 100;
    const color = COLORS[i % COLORS.length];
    const drift = ((i % 7) - 3) * 14;
    return { left, delay, dur, color, drift, i };
  });

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <i
          key={p.i}
          style={{
            insetInlineStart: `${p.left}%`,
            background: p.color,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
            transform: `translateX(${p.drift}px)`,
          }}
        />
      ))}
    </div>
  );
}
