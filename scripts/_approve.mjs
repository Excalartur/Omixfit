import puppeteer from "puppeteer-core";
import { signInAs, EMAIL } from "./_auth.mjs";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://localhost:4173";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
let pass=0, fail=0; const ok=(n,c)=>{c?pass++:fail++;console.log(`  ${c?"✓":"✗"} ${n}`);};
const email = `approve-test-${Date.now()}@omixfit.app`;

// Device A: brand-new visitor registers
const ctxA = await b.createBrowserContext();
const A = await ctxA.newPage();
A.on("dialog", d => d.dismiss().catch(()=>{}));
await A.goto(BASE + "/", { waitUntil: "networkidle2" });
await A.evaluate(() => [...document.querySelectorAll(".landing .btn")].find(x=>/כניסה|התחל/.test(x.textContent))?.click());
await A.waitForSelector(".auth-form");
await A.evaluate(() => document.querySelectorAll(".auth-tabs button")[1]?.click()); // sign-up tab
await A.waitForSelector("#auth-name");
await A.type("#auth-name", "טסט אישור");
await A.type("#auth-email", email);
await A.type("#auth-password", "Test-123456");
await A.click(".auth-form .btn-lime");
ok("new sign-up sees the health form", await A.waitForSelector(".health-qs", {timeout:30000}).then(()=>true).catch(()=>false));
// answer all "no", accept terms, submit
await A.evaluate(() => document.querySelectorAll(".hq-toggle").forEach(g => g.querySelectorAll("button")[1].click()));
await A.evaluate(() => { const c = document.querySelector(".health-check input"); if (c && !c.checked) c.click(); });
await A.click(".onboard-wide form .btn-lime");
ok("after submit → awaiting-approval screen", await A.waitForSelector(".onboard-badge", {timeout:15000}).then(()=>true).catch(()=>false));
const stuckOnPending = await A.$(".appbar") === null;
ok("not approved yet → cannot reach the app", stuckOnPending);

// Device B: manager approves
const ctxB = await b.createBrowserContext();
const B = await ctxB.newPage();
B.on("dialog", d => d.dismiss().catch(()=>{}));
await B.goto(BASE + "/#manage", { waitUntil: "networkidle2" });
await signInAs(B, EMAIL.manager);
await B.goto(BASE + "/?x=1#manage", { waitUntil: "networkidle2" });
await B.waitForSelector(".appbar");
// open Members tab (4th segment), find the pending registrant, approve
await B.evaluate(() => document.querySelectorAll(".seg button")[3]?.click());
await sleep(800);
ok("manager sees a pending-approval box", await B.waitForSelector(".approvals-box", {timeout:8000}).then(()=>true).catch(()=>false));
const opened = await B.evaluate((em) => {
  const row = [...document.querySelectorAll(".approvals-box .member-row")].find(r => r.textContent.includes(em.split("@")[0]) || r.querySelector(".mr-sub")?.textContent?.includes(em));
  if (row) { row.click(); return true; }
  // fallback: first pending row
  const first = document.querySelector(".approvals-box .member-row");
  if (first) { first.click(); return true; }
  return false;
}, email);
await B.waitForSelector(".approval-panel", {timeout:5000});
ok("manager sees the health declaration", await B.$(".health-summary") !== null);
await B.click(".approval-panel .btn-lime"); // approve
await sleep(1500);

// Device A: real-time → now approved → app appears, WITHOUT reload
let approved = false;
for (let i=0;i<25;i++){ if (await A.$(".appbar")){approved=true;break;} await sleep(400); }
ok("approved member's screen flips to the app live (no reload)", approved);

await b.close();
console.log(`\n${pass} passed, ${fail} failed  (test user: ${email})`);
