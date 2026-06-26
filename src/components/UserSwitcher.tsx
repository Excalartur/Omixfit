import { t } from "../lib/i18n";
import { resetData, setCurrentUser, useStore } from "../lib/store";
import { Sheet } from "./Sheet";
import { Avatar } from "./common";
import { toast } from "./Toast";
import { IcCheck } from "./icons";

// Demo affordance: switch between seeded users to experience each role.
// In production this is replaced by phone+OTP auth (plan.md §4.1).
export function UserSwitcher({ onClose }: { onClose: () => void }) {
  const data = useStore((s) => s);
  const order = { manager: 0, admin: 1, instructor: 2, member: 3 } as const;
  const users = [...data.users].sort((a, b) => order[a.role] - order[b.role]);

  return (
    <Sheet title={t.switchUser} onClose={onClose}>
      <p className="muted" style={{ margin: 0, fontSize: ".88rem" }}>
        הדגמה: התחבר/י כמשתמש אחר כדי לראות את חוויית המתאמן מול חוויית הניהול.
        בגרסה החיה — כניסה עם טלפון וקוד SMS.
      </p>
      <div className="roster">
        {users.map((u) => (
          <button
            key={u.id}
            className="roster-row"
            style={{ width: "100%", textAlign: "start", background: "transparent", border: "none", borderBottom: "1px solid var(--line)" }}
            onClick={() => {
              setCurrentUser(u.id);
              toast(`${t.loginAs} ${u.name}`, "ok");
              onClose();
            }}
          >
            <Avatar user={u} size={38} />
            <span className="nm">
              {u.name}
              <span className="chip" style={{ marginInlineStart: 8, background: "var(--surface-2)", color: "var(--text-2)", fontSize: ".7rem" }}>
                {t.roles[u.role]}
              </span>
            </span>
            {u.id === data.currentUserId && (
              <span style={{ color: "var(--lime-600)" }}>
                <IcCheck width={20} height={20} />
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="divider" />
      <button
        className="btn btn-ghost btn-sm"
        style={{ alignSelf: "flex-start" }}
        onClick={() => {
          resetData();
          toast("הנתונים אופסו", "info");
          onClose();
        }}
      >
        איפוס נתוני הדגמה
      </button>
    </Sheet>
  );
}
