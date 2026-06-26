import { CATEGORY_META, t } from "../lib/i18n";
import type { ClassSession } from "../lib/types";
import {
  bookability,
  classTypeOf,
  confirmedCount,
  useStore,
  userBooking,
} from "../lib/store";
import { fmtTime } from "../lib/date";
import { CapacityBar } from "./common";
import { IcCheck, IcClock, IcPin, IcUser } from "./icons";

export function ClassCard({
  session,
  onOpen,
}: {
  session: ClassSession;
  onOpen: (s: ClassSession) => void;
}) {
  const data = useStore((s) => s);
  const type = classTypeOf(session, data);
  const meta = CATEGORY_META[type.category];
  const instructor = data.users.find((u) => u.id === session.instructorId)!;
  const booked = confirmedCount(session.id, data);
  const left = session.capacity - booked;
  const mine = !!userBooking(session.id, data.currentUserId, data);
  const status = bookability(session, data.currentUserId, data);

  const isMember = data.users.find((u) => u.id === data.currentUserId)!.role === "member";

  return (
    <article
      className={`class-card ${mine ? "is-mine" : ""} ${
        left <= 0 && !mine ? "is-full" : ""
      } ${session.cancelled ? "is-cancelled" : ""}`}
      style={{ ["--cat-hue" as string]: meta.hue }}
      onClick={() => onOpen(session)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen(session)}
    >
      <span className="cat-rail" />
      <div className="cc-top">
        <div className="cc-time">
          <span className="t">{fmtTime(session.startMin)}</span>
          <span className="dur">{session.durationMin}׳</span>
        </div>
        <div className="cc-main">
          <h4 className="cc-title">
            <span className="cc-emoji">{meta.emoji}</span>
            {type.name}
          </h4>
          <div className="cc-meta">
            <span className="m">
              <IcUser />
              {t.withInstructor} {instructor.name}
            </span>
            <span className="m">
              <IcPin />
              {session.room}
            </span>
            <span className="m">
              <IcClock />
              {fmtTime(session.startMin)}–{fmtTime(session.startMin + session.durationMin)}
            </span>
          </div>
        </div>
      </div>

      <div className="cc-bottom">
        {session.cancelled ? (
          <span className="chip" style={{ background: "#fff0f1", color: "var(--danger)" }}>
            {t.cancelled}
          </span>
        ) : (
          <CapacityBar booked={booked} capacity={session.capacity} />
        )}

        {isMember && !session.cancelled && (
          <div className="cc-action" onClick={(e) => e.stopPropagation()}>
            {mine ? (
              <span className="mine-flag">
                <IcCheck width={16} height={16} /> {t.booked}
              </span>
            ) : status.canBook ? (
              <button className="btn btn-lime btn-sm" onClick={() => onOpen(session)}>
                {t.book}
              </button>
            ) : status.reason === "full" ? (
              <button className="btn btn-ghost btn-sm" disabled>
                {t.full}
              </button>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => onOpen(session)}>
                {t.book}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
