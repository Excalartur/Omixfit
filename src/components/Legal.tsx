import { useState } from "react";
import { t } from "../lib/i18n";
import { IcClose } from "./icons";

// Terms of Service + Privacy Policy overlay (template content; see disclaimer).
export function Legal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"terms" | "privacy">("terms");
  const L = t.legal;
  const items = tab === "terms" ? L.terms : L.privacy;
  return (
    <div className="legal-screen" role="dialog" aria-label={L.open}>
      <header className="legal-top">
        <strong>{L.open}</strong>
        <button className="iconbtn" onClick={onClose} aria-label={L.close}><IcClose /></button>
      </header>
      <div className="legal-body">
        <div className="seg" style={{ marginBottom: 18 }}>
          <button className={tab === "terms" ? "on" : ""} onClick={() => setTab("terms")}>{L.tabTerms}</button>
          <button className={tab === "privacy" ? "on" : ""} onClick={() => setTab("privacy")}>{L.tabPrivacy}</button>
        </div>
        <h2 className="legal-h">{tab === "terms" ? L.tabTerms : L.tabPrivacy}</h2>
        <p className="legal-updated">{L.updated}</p>
        {items.map((it) => (
          <section className="legal-item" key={it.h}>
            <h3>{it.h}</h3>
            <p>{it.p}</p>
          </section>
        ))}
        <p className="legal-disclaimer">{L.disclaimer}</p>
      </div>
    </div>
  );
}
