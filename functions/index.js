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
