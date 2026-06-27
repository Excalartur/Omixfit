import { useState } from "react";
import { t } from "../lib/i18n";
import { submitHealthForm } from "../lib/store";
import { VersionTag } from "../components/common";
import { OmixMark } from "../components/Brand";
import { Toaster, toast } from "../components/Toast";
import { IcCheck } from "../components/icons";
import type { HealthForm as HF, User } from "../lib/types";

const QS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7"] as const;
type QKey = (typeof QS)[number];

async function signOut() {
  const { signOutUser } = await import("../lib/firebase");
  await signOutUser();
}

// Post-registration gate. A fresh sign-up first signs the health declaration +
// terms, then waits here until staff approves (the live Firestore listener flips
// this to the app the moment approval lands). Rendered by <App /> when the
// current user is pending/rejected.
export function Onboarding({ user }: { user: User }) {
  if (user.approvalStatus === "rejected") return <Rejected />;
  if (!user.healthForm) return <HealthDeclaration user={user} />;
  return <Pending />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="onboard">
      <div className="onboard-card">
        <span className="brand-emblem">
          <OmixMark size={52} />
        </span>
        {children}
        <button className="link-btn onboard-signout" onClick={signOut}>
          {t.signOut}
        </button>
        <VersionTag className="login-version" />
      </div>
      <Toaster />
    </div>
  );
}

function Pending() {
  return (
    <Shell>
      <span className="onboard-badge">{t.pending.badge}</span>
      <h1>{t.pending.title}</h1>
      <p className="login-sub">{t.pending.body(t.appName)}</p>
      <p className="login-note">{t.pending.hint}</p>
    </Shell>
  );
}

function Rejected() {
  return (
    <Shell>
      <h1>{t.rejected.title}</h1>
      <p className="login-sub">{t.rejected.body}</p>
    </Shell>
  );
}

function HealthDeclaration({ user }: { user: User }) {
  const H = t.health;
  const [ans, setAns] = useState<Partial<Record<QKey, boolean>>>({});
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(false);
  const [sign, setSign] = useState(user.name);
  const [busy, setBusy] = useState(false);

  const flagged = QS.some((q) => ans[q] === true);
  const allAnswered = QS.every((q) => ans[q] !== undefined);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!allAnswered) return toast(H.qIntro, "err");
    if (!terms) return toast(H.needTerms, "err");
    if (!sign.trim()) return toast(H.needSign, "err");
    setBusy(true);
    const form: HF = {
      q1: !!ans.q1, q2: !!ans.q2, q3: !!ans.q3, q4: !!ans.q4,
      q5: !!ans.q5, q6: !!ans.q6, q7: !!ans.q7,
      notes: notes.trim(),
      termsAccepted: true,
      signedName: sign.trim(),
      submittedAt: Date.now(),
    };
    try {
      await submitHealthForm(user.id, form);
      toast(H.sentToast, "ok");
      // The store update (healthForm present) re-renders this to <Pending />.
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="onboard onboard-form">
      <div className="onboard-card onboard-wide">
        <span className="brand-emblem">
          <OmixMark size={52} />
        </span>
        <h1>{H.title}</h1>
        <p className="login-sub">{H.subtitle}</p>

        <form onSubmit={submit}>
          <h2 className="onboard-h2">{H.sectionQ}</h2>
          <p className="onboard-qintro">{H.qIntro}</p>
          <div className="health-qs">
            {QS.map((q) => (
              <div className="health-q" key={q}>
                <span className="hq-text">{H[q]}</span>
                <div className="hq-toggle" role="group">
                  <button
                    type="button"
                    className={ans[q] === true ? "on yes" : ""}
                    aria-pressed={ans[q] === true}
                    onClick={() => setAns((a) => ({ ...a, [q]: true }))}
                  >
                    {H.yes}
                  </button>
                  <button
                    type="button"
                    className={ans[q] === false ? "on no" : ""}
                    aria-pressed={ans[q] === false}
                    onClick={() => setAns((a) => ({ ...a, [q]: false }))}
                  >
                    {H.no}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {flagged && <p className="health-flag" role="alert">{H.flagged}</p>}

          <div className="field">
            <label htmlFor="hf-notes">{H.notesLabel}</label>
            <textarea
              id="hf-notes"
              className="input"
              rows={2}
              placeholder={H.notesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <h2 className="onboard-h2">{H.sectionTerms}</h2>
          <p className="health-terms">{H.termsText}</p>
          <label className="health-check">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
            />
            <span className="hc-box" aria-hidden="true">
              {terms && <IcCheck width={15} height={15} />}
            </span>
            <span>{H.termsCheckbox}</span>
          </label>

          <div className="field">
            <label htmlFor="hf-sign">{H.signLabel}</label>
            <input
              id="hf-sign"
              className="input"
              type="text"
              placeholder={H.signPlaceholder}
              value={sign}
              onChange={(e) => setSign(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-lime btn-block btn-lg" disabled={busy}>
            {busy ? H.submitting : H.submit}
          </button>
        </form>

        <button className="link-btn onboard-signout" onClick={signOut}>
          {t.signOut}
        </button>
      </div>
      <Toaster />
    </div>
  );
}
