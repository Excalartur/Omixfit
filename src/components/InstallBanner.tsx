import { useEffect, useState } from "react";
import { t } from "../lib/i18n";
import { IcClose, IcShare } from "./icons";

// Captures the beforeinstallprompt event (Android/desktop Chrome) and offers an
// install CTA. On iOS there is no such event, so we show "Add to Home Screen"
// guidance instead (plan.md §4.5 note on iOS web-push requiring installed PWA).
export function InstallBanner() {
  const [deferred, setDeferred] = useState<any>(null);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem("omixfit:install-dismissed") === "1",
  );
  const isIOS =
    typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (dismissed || standalone) return null;
  if (!deferred && !isIOS) return null;

  function dismiss() {
    setDismissed(true);
    localStorage.setItem("omixfit:install-dismissed", "1");
  }
  async function install() {
    if (deferred) {
      deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      dismiss();
    }
  }

  return (
    <div className="install-banner">
      <span className="ib-ico">
        <IcShare width={22} height={22} />
      </span>
      <div className="ib-txt">
        <b>{t.installApp}</b>
        <small>
          {isIOS
            ? "הקש/י על שיתוף ← הוספה למסך הבית"
            : t.installHint}
        </small>
      </div>
      {deferred && (
        <button className="btn btn-lime btn-sm" onClick={install}>
          {t.installApp}
        </button>
      )}
      <button className="iconbtn" onClick={dismiss} aria-label={t.close}
        style={{ background: "rgba(255,255,255,.1)", color: "#fff" }}>
        <IcClose />
      </button>
    </div>
  );
}
