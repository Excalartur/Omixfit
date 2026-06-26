// Runtime smoke test for the core engine (booking atomicity, gating, dates).
// Bundled via esbuild and run under a localStorage shim — see runner.mjs.
import { startOfWeek, toKey, addDays, fmtTime } from "../src/lib/date";
import { buildSeed } from "../src/lib/seed";
import {
  book,
  cancelBooking,
  confirmedCount,
  getState,
  upsertSession,
} from "../src/lib/store";
import type { ClassSession } from "../src/lib/types";

let pass = 0;
let fail = 0;
function ok(name: string, cond: boolean) {
  if (cond) {
    pass++;
    console.log("  ✓ " + name);
  } else {
    fail++;
    console.log("  ✗ " + name);
  }
}

// 1. Week starts Sunday
ok("startOfWeek lands on Sunday", startOfWeek(new Date()).getDay() === 0);
ok("fmtTime formats minutes", fmtTime(18 * 60 + 30) === "18:30");

// 2. Seed invariants: no session is overbooked
const seed = buildSeed();
let overbooked = 0;
for (const s of seed.sessions) {
  const n = seed.bookings.filter(
    (b) => b.sessionId === s.id && b.state === "confirmed",
  ).length;
  if (n > s.capacity) overbooked++;
}
ok("no seeded session exceeds capacity", overbooked === 0);
ok("seed has sessions this week", seed.sessions.some((s) => {
  const ws = startOfWeek(new Date());
  const keys = new Set(Array.from({ length: 7 }, (_, i) => toKey(addDays(ws, i))));
  return keys.has(s.date);
}));

// 3. Atomic capacity: synthetic future session, capacity 1
const future = toKey(addDays(new Date(), 10));
const st = getState();
st.facility.maxActiveBookings = 999; // isolate the capacity check from the limit check
const member = st.users.find((u) => u.role === "member")!;
const member2 = st.users.filter((u) => u.role === "member")[1]!;
const synthetic: ClassSession = {
  id: "test-synth-1",
  classTypeId: st.classTypes[0].id,
  date: future,
  startMin: 18 * 60,
  durationMin: 45,
  capacity: 1,
  instructorId: st.users.find((u) => u.role === "instructor")!.id,
  locationId: st.locations[0].id,
  room: "טסט",
};
upsertSession(synthetic);

ok("first booking succeeds", book(synthetic.id, member.id) === "ok");
ok("count is 1 after booking", confirmedCount(synthetic.id) === 1);
ok("double-booking same user blocked", book(synthetic.id, member.id) === "already");
ok("second user hits capacity -> full", book(synthetic.id, member2.id) === "full");

cancelBooking(synthetic.id, member.id);
ok("count is 0 after cancel", confirmedCount(synthetic.id) === 0);
ok("spot reopens after cancel", book(synthetic.id, member2.id) === "ok");

// 4. Membership gating (Q3)
const blocked: ClassSession = { ...synthetic, id: "test-synth-2", capacity: 5 };
upsertSession(blocked);
const m3 = st.users.filter((u) => u.role === "member")[2]!;
m3.membershipActive = false; // mutate in place; bookability reads current state
ok("inactive membership blocks booking", book(blocked.id, m3.id) === "membership");

// 5. Booking window: a session in the past is closed
const past: ClassSession = {
  ...synthetic,
  id: "test-synth-3",
  date: toKey(addDays(new Date(), -2)),
};
upsertSession(past);
ok("past session is closed", book(past.id, member.id) === "closed");

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) {
  // @ts-expect-error node global
  process.exit(1);
}
