# אומיקספיט · Omixfit

A sporty, Hebrew‑first **RTL PWA** for booking fitness classes — built from
[`docs/plan.md`](docs/plan.md). Trainees browse the week and book a spot in one
tap; trainers/managers publish and manage the schedule.

> **Stack:** Vite + React + TypeScript, hand‑crafted CSS design system, zero
> runtime UI dependencies. State persists to `localStorage` (a real backend
> swaps in behind the same store API).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
npm run preview    # serve the production build on :4173
npm test           # runtime smoke test of the booking engine
npm run icons      # regenerate PWA icons
```

The app opens as **דנה פרץ (a member)**. Use the **user switcher** (top‑left)
to log in as נועה (manager) or an instructor and see the management side.

## What works today

**Trainee**
- Weekly calendar, RTL, **week starts Sunday**, Hebrew dates; navigate weeks.
- Day strip with per‑day class counts; Shabbat marked as reduced activity.
- Class cards: time, instructor, room, live **spots‑remaining** bar, category color.
- Category filters; tap a card → detail sheet with description + book/cancel.
- **My Bookings** (upcoming / past) with empty‑state onboarding.

**Trainer / Manager**
- Week grid (7 columns) with fill counts; KPI tiles (sessions, booked, fill‑rate).
- Create a session (type, date, time, duration, capacity, instructor, room).
- **Recurrence**: generate 1 / 4 / 8 weekly occurrences in one action.
- Edit / cancel / delete a session; cancelling notifies (toast stand‑in).
- **Roster** with names + phones and **attendance / no‑show** marking.

**Platform**
- Installable PWA (manifest, service worker offline shell, generated icons).
- iOS / Android install guidance banner.
- Atomic capacity enforcement, booking window, cancellation cutoff, anti‑hoarding
  limit, membership gating — all verified by `npm test` (12 checks).

## Architecture

```
src/
  lib/        types · date (Sunday-start, Hebrew) · i18n · seed · store (booking engine)
  components/ ClassCard · SessionDetail · SessionEditor · UserSwitcher · Sheet · Toast · icons
  screens/    Schedule (trainee) · MyBookings · Manage (trainer)
  styles/     theme.css (tokens + primitives) · app.css (layout + screens)
public/       manifest · sw.js · icons
```

Product decisions (Q1–Q8 from the plan) are baked in: instructor is a real role;
booker names are **staff‑only** (privacy); booking is gated on `membershipActive`;
`locationId` lives on every session; the `Booking` state enum already includes
`waitlisted`/`no_show` for v2.

## Iteration status (Ralph loop)

- [x] Scaffold, design system, data layer + booking engine, both experiences, PWA.
- [ ] **Next:** live spot‑count polish, richer manager reports, ClassType manager,
      member profile, animation/empty‑state pass, real visual QA in a browser.
