import { useEffect, type ReactNode } from "react";
import { IcClose } from "./icons";
import { t } from "../lib/i18n";

interface SheetProps {
  title?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Custom header replaces the default title bar (e.g. a colored hero). */
  hero?: ReactNode;
}

export function Sheet({ title, onClose, children, footer, hero }: SheetProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="scrim" onMouseDown={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {hero ?? (
          <div className="sheet-head">
            <span className="grip" />
            <h2 className="h2">{title}</h2>
            <button className="iconbtn" onClick={onClose} aria-label={t.close}>
              <IcClose />
            </button>
          </div>
        )}
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}
