import { Component, type ErrorInfo, type ReactNode } from "react";
import { t } from "../lib/i18n";
import { IcBolt } from "./icons";

// Graceful degradation (plan.md §5.6): a runtime error in any screen renders a
// friendly, on-brand fallback instead of a blank page - with a reload and a
// "reset local data" escape hatch in case persisted state is the cause.
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surfaced for debugging; a real app would ship this to error tracking.
    console.error("[omixfit] render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="error-screen" dir="rtl">
        <div className="error-card">
          <span className="error-logo">
            <IcBolt width={28} height={28} style={{ color: "var(--ink-900)" }} />
          </span>
          <h1>משהו השתבש</h1>
          <p>
            אירעה תקלה זמנית בטעינת המסך. אפשר לרענן ולנסות שוב - הנתונים שלך
            נשמרים מקומית.
          </p>
          <div className="error-actions">
            <button className="btn btn-lime btn-lg" onClick={() => location.reload()}>
              רענון הדף
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                try {
                  localStorage.removeItem("omixfit:v1");
                } catch {
                  /* ignore */
                }
                location.reload();
              }}
            >
              איפוס נתונים מקומיים
            </button>
          </div>
          <small className="muted" dir="ltr">
            {t.appName} · {this.state.error.message}
          </small>
        </div>
      </div>
    );
  }
}
