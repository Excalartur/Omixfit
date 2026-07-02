import { useState } from "react";
import { t } from "../lib/i18n";
import { submitLead } from "../lib/store";
import { Sheet } from "./Sheet";
import { toast } from "./Toast";

/** Low-friction "leave your details" modal for the landing — creates a lead
 *  without an account so Omer can follow up (docs/business.md §4). */
export function LeadForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!name.trim() || !phone.trim()) {
      toast(t.lead.needNamePhone, "err");
      return;
    }
    setBusy(true);
    try {
      await submitLead({ name, phone, note });
      setDone(true);
    } catch {
      toast(t.lead.err, "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title={t.lead.title}
      onClose={onClose}
      footer={
        done ? (
          <button className="btn btn-lime grow" onClick={onClose}>{t.close}</button>
        ) : (
          <button className="btn btn-lime grow" onClick={submit} disabled={busy}>
            {busy ? "…" : t.lead.submit}
          </button>
        )
      }
    >
      {done ? (
        <div className="pay-card">
          <span className="pay-h">{t.lead.thanksTitle}</span>
          <small className="pay-hint">{t.lead.thanks}</small>
        </div>
      ) : (
        <>
          <p className="muted" style={{ margin: "0 0 12px" }}>{t.lead.subtitle}</p>
          <div className="field"><label>{t.lead.name}</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><label>{t.lead.phone}</label>
            <input className="input" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="field"><label>{t.lead.note}</label>
            <textarea className="input" rows={2} value={note} placeholder={t.lead.notePlaceholder}
              onChange={(e) => setNote(e.target.value)} /></div>
        </>
      )}
    </Sheet>
  );
}
