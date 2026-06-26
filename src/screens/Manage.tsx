import { useMemo, useState } from "react";
import { CATEGORY_META, t } from "../lib/i18n";
import type { ClassSession } from "../lib/types";
import { classTypeOf, confirmedCount, useStore } from "../lib/store";
import {
  addDays,
  fmtTime,
  HEB_DAYS_LONG,
  isToday,
  startOfWeek,
  toKey,
  weekDays,
} from "../lib/date";
import { WeekNav } from "../components/common";
import { SessionEditor } from "../components/SessionEditor";
import { SessionDetail } from "../components/SessionDetail";
import { IcPlus, IcSpark, IcUsers, IcCalendar } from "../components/icons";

type EditorState =
  | { mode: "closed" }
  | { mode: "create"; date: string }
  | { mode: "edit"; session: ClassSession };

export function Manage() {
  const data = useStore((s) => s);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [editor, setEditor] = useState<EditorState>({ mode: "closed" });
  const [detail, setDetail] = useState<ClassSession | null>(null);

  const days = weekDays(weekStart);
  const weekKeys = new Set(days.map(toKey));

  const weekSessions = useMemo(
    () => data.sessions.filter((s) => weekKeys.has(s.date)),
    [data.sessions, weekStart],
  );

  const stats = useMemo(() => {
    let booked = 0;
    let capacity = 0;
    for (const s of weekSessions) {
      if (s.cancelled) continue;
      booked += confirmedCount(s.id, data);
      capacity += s.capacity;
    }
    return {
      sessions: weekSessions.filter((s) => !s.cancelled).length,
      booked,
      fill: capacity ? Math.round((booked / capacity) * 100) : 0,
    };
  }, [weekSessions, data]);

  const byDay = useMemo(() => {
    const map = new Map<string, ClassSession[]>();
    for (const s of weekSessions) {
      if (!map.has(s.date)) map.set(s.date, []);
      map.get(s.date)!.push(s);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.startMin - b.startMin);
    return map;
  }, [weekSessions]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="h1">{t.manageTitle}</h1>
          <div className="sub">{data.locations[0].name}</div>
        </div>
        <button className="btn btn-lime" onClick={() => setEditor({ mode: "create", date: toKey(days[0]) })}>
          <IcPlus width={18} height={18} /> {t.newSession}
        </button>
      </div>

      <div className="stats">
        <div className="stat dark">
          <div className="k"><IcCalendar width={15} height={15} /> {t.weekSessions}</div>
          <div className="v">{stats.sessions}</div>
        </div>
        <div className="stat">
          <div className="k"><IcUsers width={15} height={15} /> {t.totalBooked}</div>
          <div className="v">{stats.booked}</div>
        </div>
        <div className="stat">
          <div className="k"><IcSpark width={15} height={15} /> {t.fillRate}</div>
          <div className="v">{stats.fill}%</div>
        </div>
      </div>

      <div style={{ margin: "4px 0 18px" }}>
        <WeekNav
          weekStart={weekStart}
          onPrev={() => setWeekStart(addDays(weekStart, -7))}
          onNext={() => setWeekStart(addDays(weekStart, 7))}
          onToday={() => setWeekStart(startOfWeek(new Date()))}
        />
      </div>

      <div className="mgr-grid">
        {days.map((d) => {
          const key = toKey(d);
          const slots = byDay.get(key) ?? [];
          return (
            <div key={key} className="mgr-col">
              <div className={`mgr-col-head ${isToday(key) ? "is-today" : ""}`}>
                {HEB_DAYS_LONG[d.getDay()]}
                <small>{d.getDate()}/{d.getMonth() + 1}</small>
              </div>
              {slots.map((s) => {
                const type = classTypeOf(s, data);
                const booked = confirmedCount(s.id, data);
                return (
                  <button
                    key={s.id}
                    className={`mgr-slot ${s.cancelled ? "is-cancelled" : ""}`}
                    style={{ ["--cat-hue" as string]: CATEGORY_META[type.category].hue }}
                    onClick={() => setDetail(s)}
                  >
                    <div className="ms-time">{fmtTime(s.startMin)}</div>
                    <div className="ms-name">{type.name}</div>
                    <div className="ms-fill">
                      {booked}/{s.capacity} · {s.room}
                    </div>
                  </button>
                );
              })}
              <button className="mgr-add" onClick={() => setEditor({ mode: "create", date: key })}>
                <IcPlus width={14} height={14} /> {t.newSession}
              </button>
            </div>
          );
        })}
      </div>

      {detail && (
        <SessionDetail
          session={detail}
          onClose={() => setDetail(null)}
          onEdit={(s) => {
            setDetail(null);
            setEditor({ mode: "edit", session: s });
          }}
        />
      )}
      {editor.mode !== "closed" && (
        <SessionEditor
          session={editor.mode === "edit" ? editor.session : null}
          presetDate={editor.mode === "create" ? editor.date : undefined}
          onClose={() => setEditor({ mode: "closed" })}
        />
      )}
    </div>
  );
}
