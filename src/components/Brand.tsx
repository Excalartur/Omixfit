import { useEffect, useState } from "react";
import { t } from "../lib/i18n";

// OMIX emblem — an approximation of the brand mark (a gold beaded strand crossed
// by an olive leaf). Recolors via CSS vars. Swap for the exact artwork by
// dropping a file in /public and pointing this at an <img>.
export function OmixMark({ size = 30 }: { size?: number }) {
  // Gold spine/strand crossing an olive leaf — the curve x at a given y (used to
  // centre the vertebrae beads on the gold strand).
  const goldX = (y: number) => 46 - ((y - 10) / 44) * 28;
  const beads = [16, 22, 28, 34, 40, 46];
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className="omix-mark">
      {/* olive leaf sweep + a small leaf tip */}
      <path
        d="M18 10 C 35 22, 35 42, 46 54"
        fill="none"
        stroke="var(--olive, #6e8b4e)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M18 10 c -3.4 -2.2 -2.6 -6.6 1.6 -7.2 c 1.4 4 -0.2 6 -1.6 7.2 z" fill="var(--olive, #6e8b4e)" />
      {/* gold spine */}
      <path
        d="M46 10 C 29 22, 29 42, 18 54"
        fill="none"
        stroke="var(--gold, #c8a24a)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* vertebrae beads centred on the gold spine */}
      {beads.map((y) => (
        <rect
          key={y}
          x={goldX(y) - 6}
          y={y - 1.6}
          width="12"
          height="3.4"
          rx="1.7"
          fill="var(--gold, #c8a24a)"
        />
      ))}
    </svg>
  );
}

/** Full OMIX lockup — emblem + wordmark — for the app bar and landing. */
export function OmixLogo({ size = 30, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`omix-logo ${className}`}>
      <OmixMark size={size} />
      <span className="omix-word">{t.appName}</span>
    </span>
  );
}

/** Live Jerusalem (Asia/Jerusalem) wall clock for the trainer. */
export function JerusalemClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const time = now.toLocaleTimeString("he-IL", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return (
    <div className="jclock" title={t.jerusalem}>
      <span className="jclock-city">{t.jerusalem}</span>
      <time dir="ltr">{time}</time>
    </div>
  );
}
