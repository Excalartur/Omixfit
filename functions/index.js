// ---------------------------------------------------------------------------
// OMIX Cloud Functions (Blaze plan).
//
// syncRoleClaim: the source of truth for a user's role is the `role` field on
// their users/{uid} doc. This trigger mirrors that role into a Firebase Auth
// custom claim, so security rules can verify the role *server-side* (a member
// can't forge `role: admin` by writing their own doc — the claim only changes
// here, and rules read the claim, not the doc). Applies only when the doc id is
// a real auth uid (real accounts are uid-keyed; demo/seeded docs are skipped).
// ---------------------------------------------------------------------------

const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const logger = require("firebase-functions/logger");

initializeApp();

exports.syncRoleClaim = onDocumentWritten("users/{uid}", async (event) => {
  const uid = event.params.uid;
  const after = event.data && event.data.after && event.data.after.data();
  const role = after && after.role;
  if (!role) return;

  const user = await getAuth().getUser(uid).catch(() => null);
  if (!user) return; // no matching auth account (seeded/demo doc) — nothing to do

  const current = (user.customClaims || {}).role;
  if (current === role) return;

  await getAuth().setCustomUserClaims(uid, {
    ...(user.customClaims || {}),
    role,
  });
  logger.info(`role claim updated: ${uid} -> ${role}`);
});

// ---------------------------------------------------------------------------
// Google Calendar 2-way sync (Blaze). The owner (Omer) connects her calendar
// once via OAuth; the refresh token is stored server-side in meta/calendar
// (locked from all clients — only these admin-SDK functions read it). Every
// session create/update/cancel then mirrors into her Google Calendar.
// ---------------------------------------------------------------------------
const fnV1 = require("firebase-functions/v1");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { google } = require("googleapis");

const db = getFirestore();
const CAL_DOC = "meta/calendar";
const CAL_ID = "primary";
const REDIRECT = "https://us-central1-omixfit-be3ff.cloudfunctions.net/calCallback";

function oauth() {
  return new google.auth.OAuth2(process.env.GCAL_CLIENT_ID, process.env.GCAL_CLIENT_SECRET, REDIRECT);
}

// owner clicks "connect" → consent screen
exports.calConnect = fnV1.https.onRequest((req, res) => {
  const url = oauth().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
  });
  res.redirect(url);
});

// Google redirects back here with a code → store the refresh token
exports.calCallback = fnV1.https.onRequest(async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("missing code");
  try {
    const { tokens } = await oauth().getToken(code);
    if (tokens.refresh_token) {
      await db.doc(CAL_DOC).set({ refreshToken: tokens.refresh_token, connectedAt: Date.now() }, { merge: true });
    }
    res.send("<html dir='rtl'><body style='font-family:sans-serif;text-align:center;padding-top:60px;background:#f6efe0'><h2>היומן חובר בהצלחה ✅</h2><p>אפשר לסגור את החלון ולחזור ל-Omix.</p></body></html>");
  } catch (e) {
    logger.error("calCallback", e);
    res.status(500).send("auth failed");
  }
});

async function calendar() {
  const snap = await db.doc(CAL_DOC).get();
  const rt = snap.exists && snap.data().refreshToken;
  if (!rt) return null;
  const o = oauth();
  o.setCredentials({ refresh_token: rt });
  return google.calendar({ version: "v3", auth: o });
}

function buildEvent(s, title) {
  const [y, m, d] = s.date.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0);
  start.setMinutes(s.startMin || 0);
  const end = new Date(start.getTime() + (s.durationMin || 60) * 60000);
  return {
    summary: title || "אימון",
    location: s.room || "",
    start: { dateTime: start.toISOString(), timeZone: "Asia/Jerusalem" },
    end: { dateTime: end.toISOString(), timeZone: "Asia/Jerusalem" },
  };
}

exports.syncSession = fnV1.firestore.document("sessions/{id}").onWrite(async (change) => {
  const cal = await calendar();
  if (!cal) return; // not connected yet
  const after = change.after.exists ? change.after.data() : null;
  const before = change.before.exists ? change.before.data() : null;
  try {
    if (!after || after.cancelled) {
      const evId = (after && after.gcalEventId) || (before && before.gcalEventId);
      if (evId) await cal.events.delete({ calendarId: CAL_ID, eventId: evId }).catch(() => {});
      if (after && after.gcalEventId) await change.after.ref.update({ gcalEventId: FieldValue.delete() });
      return;
    }
    const typeSnap = await db.doc(`classTypes/${after.classTypeId}`).get();
    const title = typeSnap.exists ? typeSnap.data().name : "אימון";
    const ev = buildEvent(after, title);
    if (after.gcalEventId) {
      await cal.events.update({ calendarId: CAL_ID, eventId: after.gcalEventId, requestBody: ev });
    } else {
      const created = await cal.events.insert({ calendarId: CAL_ID, requestBody: ev });
      await change.after.ref.update({ gcalEventId: created.data.id });
    }
  } catch (e) {
    logger.error("syncSession", e);
  }
});
