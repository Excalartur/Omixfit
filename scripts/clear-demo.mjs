// ---------------------------------------------------------------------------
// One-off cleanup: remove SEEDED DEMO data from the live Firestore so the
// studio's weekly schedule shows only real classes. This keeps the Firestore
// "sync" itself fully intact — it only deletes the demo docs that src/lib/seed.ts
// wrote on first run; your real classes, members and bookings are left alone.
//
// SAFETY: dry run by default (it just lists what it would delete). It only
// deletes when you pass --confirm, and it targets demo docs by their seed-only
// ID patterns:
//   • sessions   id like  s-YYYY-MM-DD-<min>-<type>   (real ones are s-<base36>, e.g. s-1)
//   • users      id like  u-<word>  AND email @omixfit.app  (real users have a Firebase uid + real email)
//   • classTypes the 8 known demo ids (ct-spin, ct-yoga, …)
//   • locations  loc-main
//   • audit      id like  a-seed-*
//   • bookings   any booking that points at a demo session or demo user
// omerido20@gmail.com is a real account (gmail, not @omixfit.app) → never touched.
//
// Usage (reads Firebase config from .env.local, same as the app):
//   OMIX_ADMIN_EMAIL=you@example.com OMIX_ADMIN_PASSWORD=secret \
//     node scripts/clear-demo.mjs                # DRY RUN — lists, deletes nothing
//   OMIX_ADMIN_EMAIL=… OMIX_ADMIN_PASSWORD=… \
//     node scripts/clear-demo.mjs --confirm      # actually delete
// Any signed-in user works (Firestore rules only require auth); use the real
// manager account (e.g. omerido20@gmail.com).
// ---------------------------------------------------------------------------

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  writeBatch,
} from "firebase/firestore";

// ---- load .env.local (no dotenv dep) — fileURLToPath so a path with a space works
function loadEnvFile(url) {
  const out = {};
  try {
    for (const line of readFileSync(fileURLToPath(url), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env.local — fall back to process.env */
  }
  return out;
}
const env = { ...loadEnvFile(new URL("../.env.local", import.meta.url)), ...process.env };

const cfg = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};
if (!cfg.apiKey || !cfg.projectId) {
  console.error("✗ Missing Firebase config. Create .env.local from .env.example first.");
  process.exit(1);
}
const email = env.OMIX_ADMIN_EMAIL;
const password = env.OMIX_ADMIN_PASSWORD;
if (!email || !password) {
  console.error("✗ Set OMIX_ADMIN_EMAIL and OMIX_ADMIN_PASSWORD (a real signed-in account).");
  process.exit(1);
}
const CONFIRM = process.argv.includes("--confirm");

// ---- demo identifiers (mirror src/lib/seed.ts) ------------------------------
const DEMO_TYPE_IDS = new Set([
  "ct-spin", "ct-yoga", "ct-cross", "ct-pil", "ct-box", "ct-str", "ct-hiit", "ct-dance",
]);
const DEMO_LOC_IDS = new Set(["loc-main"]);
const isDemoSession = (id) => /^s-\d{4}-\d{2}-\d{2}-/.test(id);
const isDemoUser = (id, email) => /^u-[a-z]+$/.test(id) && /@omixfit\.app$/i.test(email || "");
const isDemoAudit = (id) => /^a-seed-/.test(id);

// ---- run --------------------------------------------------------------------
const app = initializeApp(cfg);
await signInWithEmailAndPassword(getAuth(app), email, password);
const db = getFirestore(app);
console.log(`Signed in as ${email}.  Mode: ${CONFIRM ? "⚠️  DELETE" : "DRY RUN (no deletes)"}\n`);

const load = async (name) =>
  (await getDocs(collection(db, name))).docs.map((d) => ({ id: d.id, data: d.data() }));

const [users, types, sessions, bookings, locations, audit] = await Promise.all(
  ["users", "classTypes", "sessions", "bookings", "locations", "audit"].map(load),
);

const demoSessions = sessions.filter((s) => isDemoSession(s.id));
const demoSessionIds = new Set(demoSessions.map((s) => s.id));
const demoUsers = users.filter((u) => isDemoUser(u.id, u.data.email));
const demoUserIds = new Set(demoUsers.map((u) => u.id));
const demoTypes = types.filter((t) => DEMO_TYPE_IDS.has(t.id));
const demoLocs = locations.filter((l) => DEMO_LOC_IDS.has(l.id));
const demoAudit = audit.filter((a) => isDemoAudit(a.id));
const demoBookings = bookings.filter(
  (b) => demoSessionIds.has(b.data.sessionId) || demoUserIds.has(b.data.userId),
);

const targets = [
  ["sessions", demoSessions],
  ["bookings", demoBookings],
  ["classTypes", demoTypes],
  ["users", demoUsers],
  ["locations", demoLocs],
  ["audit", demoAudit],
];

console.log("Demo docs found (these would be deleted):");
let total = 0;
for (const [name, list] of targets) {
  total += list.length;
  console.log(`  ${name.padEnd(11)} ${list.length}`);
  for (const x of list.slice(0, 4)) console.log(`        - ${x.id}`);
  if (list.length > 4) console.log(`        … +${list.length - 4} more`);
}
console.log(
  `\nReal data kept untouched:  users ${users.length - demoUsers.length} · ` +
    `classTypes ${types.length - demoTypes.length} · sessions ${sessions.length - demoSessions.length} · ` +
    `bookings ${bookings.length - demoBookings.length}`,
);

if (total === 0) {
  console.log("\n✓ No demo data found — nothing to do.");
  process.exit(0);
}
if (!CONFIRM) {
  console.log("\nDRY RUN — nothing was deleted. Re-run with --confirm to delete the above.");
  process.exit(0);
}

let n = 0;
let batch = writeBatch(db);
for (const [name, list] of targets) {
  for (const x of list) {
    batch.delete(doc(db, name, x.id));
    if (++n % 400 === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  }
}
if (n % 400 !== 0) await batch.commit();
console.log(`\n✓ Deleted ${total} demo docs. The schedule now shows only real classes.`);
process.exit(0);
