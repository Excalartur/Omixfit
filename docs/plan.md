# Sports Class Scheduling App — Requirements

**Version:** 0.1 (draft)
**Status:** For review
**Document language:** English (the *product* is Hebrew — see Localization)

---

## 1. Overview

A scheduling platform for a sports/fitness facility (gym, studio, dojo, etc.). Managers publish a weekly class schedule; members browse the week, see availability per class, and book a spot. Built as a responsive web app that also installs as a PWA on iPhone and Android — no native build required.

### Goals
- Let managers define and publish classes quickly, including recurring weekly classes.
- Let members see, at a glance, what's on each day, how many spots are left, and book/cancel.
- Scale cleanly to a few thousand members.
- Fully Hebrew, right-to-left (RTL).

### Non-goals (v1)
- Native iOS/Android apps (PWA only).
- Full payment/billing engine (see open question Q3 — may be a fast follow).
- Multi-tenant SaaS (single facility assumed; multi-branch is a flag, see §5.7).

---

## 2. Roles

| Role | Description | Key permissions |
|------|-------------|-----------------|
| **Member (user)** | Regular customer | View schedule, book/cancel, join waitlist, manage own profile |
| **Instructor/Trainer** | Teaches classes | View their own classes + roster; optionally mark attendance |
| **Manager** | Facility staff | Create/edit/delete classes, set capacity, view all bookings, manage members |
| **Admin** | Owner / super-user | Everything a manager can do + user-role management, settings, reports |

> Decide early whether Instructor is a distinct role or just a label on a class (Q1). Splitting it later is more work than building it in now.

---

## 3. Domain model (core concepts)

Be deliberate about the distinction between a **class type** (the template) and a **class session** (a single dated occurrence). Conflating them is the most common modeling mistake here.

- **ClassType** — reusable definition: name, description, category (e.g. Spinning, Yoga, CrossFit), default capacity, default duration, color. *Not* tied to a date.
- **ClassSession** — one occurrence on a specific date/time. References a ClassType, has its own start time, capacity (can override the default), assigned instructor, and location/room. Created individually or generated from a recurrence rule.
- **RecurrenceRule** — "every Mon & Wed 18:00 for the next 8 weeks." Generates ClassSessions.
- **Booking** — a member's reservation for a ClassSession. States: `confirmed`, `waitlisted`, `cancelled`, `attended`, `no_show`.
- **Member / User** — account, profile, membership status.

```
ClassType 1 ──< ClassSession >── n Booking n ──1 User
                    │
                    └──1 Instructor (optional)
```

---

## 4. Functional requirements

### 4.1 Accounts & authentication
- Member self-registration and login.
- **Phone + SMS OTP login** strongly recommended for the Israeli market (more familiar than email/password). Email/password as fallback.
- Password reset; profile editing (name, phone, photo optional).
- Role assignment handled by Admin.

### 4.2 Manager — class management
- Create a **ClassType** (name, description, category, default capacity).
- Schedule a **ClassSession**: pick type, date, start time, duration, capacity (defaults from type, overridable), instructor, room/location.
- Create **recurring** sessions from a recurrence rule; edit/delete a single occurrence vs. the whole series ("this event" vs "all future events").
- Edit/cancel a session. Cancelling a session must notify all booked members.
- View the roster (booked members + waitlist) for any session.
- Optionally mark attendance / no-shows.

### 4.3 Member — schedule & booking
- **Weekly calendar view** (the primary screen), RTL, navigable forward/back by week.
- Per day, list each ClassSession with: name, time, instructor, **spots remaining / capacity**, and current bookers (see privacy note below).
- Filter by class type/category and by instructor.
- Book a spot in one tap; cancel a booking.
- Join a **waitlist** when full; auto-promote to confirmed when a spot opens, with notification.
- "My bookings" view — upcoming and past.
- Clear feedback when a class is full, already booked, or booking is closed.

> **Privacy — "who booked this class".** Showing every booker's full name to all members exposes personal data and may breach the Israeli Privacy Protection Law (and GDPR if any EU users). Recommended default: show the **count** publicly, and names only to managers/instructors. If you do want social visibility, show first name + last initial, make it **opt-in**, and gate it behind login. Treat the full-roster view as a manager/instructor feature. (Q2)

### 4.4 Booking rules (make these explicit and configurable)
- **Capacity enforcement** with safe concurrency — two members must never both grab the last spot. Use an atomic, transactional decrement / unique constraint, not a read-then-write. This is the one piece where "a few thousand users" can actually bite you, during the 18:00-class rush.
- **Booking window**: how far ahead can members book (e.g. 7 days)? When does booking open/close (e.g. closes 1h before start)?
- **Cancellation policy**: cancel allowed up to X hours before; late cancellation → penalty/strike?
- **Per-member limits**: max active bookings, max bookings per day/week (prevents hoarding).
- **Membership gating**: can only members with an active membership/credits book? (ties to Q3)
- **No-show handling**: track no-shows; optional strike system that temporarily blocks booking.

### 4.5 Notifications
- Booking confirmation, cancellation, waitlist promotion, class-cancelled-by-manager, and reminders (e.g. 2h before).
- Channels: **web push** (PWA), email, and consider **SMS/WhatsApp** — WhatsApp is the dominant channel in Israel and worth budgeting for.
- Note iOS limitation: web push works only for PWAs **added to the home screen** on iOS 16.4+. Plan onboarding that nudges "Add to Home Screen," and don't rely on push as the only reminder channel.

### 4.6 Admin & reporting
- Member list, search, role management.
- Attendance and utilization reports (popular classes, fill rate, no-show rate).
- Facility settings: hours, holidays, booking/cancellation policy values, default capacities.
- Audit log of who changed/cancelled what.

### 4.7 Multi-location (flag, optional for v1)
If the facility has more than one branch, sessions need a location and members need to filter by it. Cheap to design for now, expensive to retrofit — at minimum keep a `location_id` on ClassSession even if there's only one.

---

## 5. Non-functional requirements

### 5.1 Localization & RTL
- Entire UI in Hebrew, full RTL layout (mirrored components, icons, calendar).
- Hebrew date/time formatting; week starts **Sunday** (Israeli convention).
- **Israeli holidays + Shabbat**: many facilities are closed or run a reduced schedule Friday evening through Saturday. The schedule model must support closed days / special hours.
- Even if Hebrew-only at launch, structure copy via an i18n layer so a second language is a config change, not a rewrite.

### 5.2 PWA / mobile
- Installable PWA (manifest, service worker, offline shell, app icon, splash).
- Responsive, touch-first; the weekly calendar must be usable on a phone (consider a day-list view on narrow screens instead of a 7-column grid).
- Works on current iOS Safari and Android Chrome.

### 5.3 Performance & scalability
- A few thousand members is modest, but design for **bursty concurrent booking** when popular classes open. Booking writes must be transactional and fast.
- Schedule reads (the calendar) are the hottest path — cache aggressively; they change infrequently relative to reads.
- Consider live spot-count updates (WebSocket/SSE) so a member doesn't tap "book" on a stale "1 spot left." Optional for v1; at minimum re-validate capacity server-side at booking time.

### 5.4 Security & privacy
- Compliance with the Israeli Privacy Protection Law (and GDPR if relevant).
- Role-based access control enforced **server-side** (never trust the client for "is this user a manager").
- Rate limiting on auth and booking endpoints.
- Minimal PII; encrypt at rest and in transit; clear data-retention policy.

### 5.5 Accessibility
- Israeli web accessibility standard (IS 5568 / WCAG 2.0 AA) is legally required for public services. Build it in from the start — keyboard nav, contrast, screen-reader labels, especially on the calendar.

### 5.6 Availability & reliability
- Backups; graceful degradation if push/SMS provider is down (booking must still work).

---

## 6. Open questions / decisions needed

| # | Question | Why it matters |
|---|----------|----------------|
| Q1 | Is **Instructor** a real role with login, or just a name field? | Affects auth, permissions, and roster screens. |
| Q2 | How public is the **booker list**? Count only, opt-in names, or manager-only? | Privacy/legal exposure; UX. |
| Q3 | Are there **payments / memberships / class credits**, now or later? | Biggest scope swing. Even if "later," gate booking on `membership_active` now. |
| Q4 | **Waitlist** behavior — auto-promote, manual, or none? | Changes booking model and notifications. |
| Q5 | **Cancellation/no-show penalties** — yes or no? | Needs a strike/credit system if yes. |
| Q6 | **Single or multi-branch**? | Cheap now, expensive later. |
| Q7 | **Recurring classes** required for v1? | Almost certainly yes — managers won't hand-enter every week. |
| Q8 | Document and product copy language — confirm Hebrew product, and whether this **spec** should also be in Hebrew. | Affects handoff. |

---

## 7. Suggested v1 cut

To ship something real fast, a reasonable MVP is: phone-OTP auth, manager creates recurring class sessions with capacity, member weekly calendar with spots-remaining + book/cancel, atomic capacity enforcement, basic email/web-push confirmations, Hebrew RTL, PWA install. Defer payments, waitlist, no-show penalties, multi-branch, and live updates to v2.
