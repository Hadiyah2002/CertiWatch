# CertiWatch

Government Certificate & Compliance Expiry Management System, built for
**Arki for Advanced Construction Chemicals Co.**

This is the **foundation pass**: project architecture, data models, auth,
reusable dashboard shell, and a seeded dashboard. Certificate/category
CRUD forms, file upload UI, email reminders, search/filtering, and
reports are deliberately left for follow-up prompts (see roadmap below).

## Stack

- **Frontend:** Next.js (App Router) + Tailwind CSS + Recharts
- **Backend:** Django + Django REST Framework
- **Database:** PostgreSQL
- **File storage:** local disk only (Django `MEDIA_ROOT`), no cloud storage
- **Auth:** Django session/cookie auth. No roles — every logged-in user
  has equal access. Each certificate has a `responsible_user` field used
  only to target notifications, never for permissions.

## Project layout

```
certiwatch/
  backend/          Django project
    config/         settings, urls, wsgi/asgi
    accounts/       custom User model + login/logout/me endpoints
    certificates/   Branch, CertificateCategory, Certificate, RenewalRecord
  frontend/         Next.js app
    app/            routes (App Router)
    components/     Sidebar, Topbar, DashboardLayout, HelpPanel, dashboard widgets
    lib/            API client, shared types
```

## Backend setup (no Docker)

Requires Python 3.11+ and a running local PostgreSQL server.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env: set DB_NAME/DB_USER/DB_PASSWORD to a database you've created, e.g.:
#   createdb certiwatch
#   createuser certiwatch --pwprompt

python manage.py migrate
python manage.py seed_data          # creates sample branches/categories/users/certificates
python manage.py createsuperuser    # optional, for /admin/ access

python manage.py runserver          # http://localhost:8000
```

Seed script also creates the two accounts login is restricted to:
`info@arkichem.com` (Faisal Alhayan) and
`abdullahalzeer35@gmail.com` (Abdullah Fahad Zeer), both with password
`ChangeMe123!` — **change these before any real deployment.** There is
no public registration page anywhere in this app; the only way to add
another account is directly via Django admin or the ORM.

To actually send email reminders, fill in the `EMAIL_*` variables in
`.env` with real SMTP credentials. Alerts are sent from the company
mailbox (`GM@arkichem.com`) via HostGator SMTP — see `.env.example` for
the exact keys; the real mailbox password only ever goes in your private
`.env` (which is gitignored). The **sender** comes only from `.env`
(`DEFAULT_FROM_EMAIL`, falling back to `EMAIL_HOST_USER`); the
**recipients** come only from the active entries on the Alert Recipients
page and can be any domain (Gmail, company addresses, anything). Port
587 with `EMAIL_USE_TLS=True` is the usual combination; if that fails,
try port 465 with `EMAIL_USE_SSL=True` and `EMAIL_USE_TLS=False`. TLS
and SSL must never both be True (a clear warning is logged at startup if
they are, because every send would fail). `FRONTEND_BASE_URL` sets the
address used for the "View certificate" link in alert emails (defaults
to `FRONTEND_ORIGIN`).
Boolean env vars (`EMAIL_USE_TLS`, `EMAIL_USE_SSL`, `DJANGO_DEBUG`)
accept true/false, 1/0, yes/no or on/off in any case; anything else is
rejected with a clear error. `EMAIL_TIMEOUT` (default 20 seconds) caps
how long a send waits on the mail server.

To check the email setup on its own, run:

```bash
python manage.py send_test_email you@gmail.com colleague@company.com
python manage.py send_test_email you@gmail.com --debug   # show the SMTP conversation
```

It takes one or more addresses, prints the effective email config (never
the password) and sends one test message to each, failing loudly with the
full error if anything is wrong. `--debug` prints the whole SMTP exchange,
so you can see the server's final reply (e.g. `250 OK id=...`) — that
line proves the server accepted the message.

Without valid credentials, `check_reminders` will still run fully — every
recipient is tried separately, and each one prints either
`[email] Sent to X` or `[email] FAILED for X: <error>` instead of
crashing the whole command. If nobody received a certificate's email,
it is **not** marked as sent, so the next run tries again.

To see the reminder system in action, run:

```bash
python manage.py check_reminders
```

This checks every certificate against its own `alert_days_before` and,
for anything due:
- creates a website `Notification` (visible via the bell icon in the
  topbar, the Notifications page, or Django admin)
- sends a real email to every active `EmailRecipient` (one separate
  message per recipient, over a single SMTP connection)

**Reminders repeat every 7 days**, not just once — as long as a
certificate stays within its own `alert_days_before` window, it'll keep
alerting weekly until it's renewed (which clears its reminder history
and starts a fresh cycle). Run the command again immediately and it'll
report everything as "not due yet"; nothing repeats before 7 days have
passed since the last send. Safe to run daily via cron.

**Important if you're upgrading an existing database:** this version
makes `reference_number` unique. If you already have certificates with
duplicate reference numbers (from before this constraint existed),
`python manage.py migrate` handles that automatically — a data
migration renames any existing duplicates (appending `-DUP2`, `-DUP3`,
etc.) *before* the unique constraint is applied, so the migration can't
fail on data that predates it. Those renamed values are just
placeholders, though — search for `-DUP` afterward and give those
certificates their real reference numbers.

## Frontend setup (no Docker)

Requires Node.js 18.18+.

```bash
cd frontend
npm install
cp .env.example .env.local   # only needed if backend isn't on localhost:8000
npm run dev                  # http://localhost:3000
```

The frontend proxies `/api/*` to the Django backend (see
`next.config.js`) so the session cookie is treated as same-origin in the
browser. In production, put both apps behind the same reverse proxy
domain (e.g. Nginx routing `/api/*` to Django and everything else to
Next.js) so this keeps working without cross-site cookie configuration.

**API URL convention:** every backend endpoint intentionally has **no**
trailing slash (e.g. `/api/certificates`, not `/api/certificates/`).
This is because the Next.js dev proxy strips trailing slashes before
forwarding requests, which breaks Django's usual trailing-slash
convention. Keep this consistent for any new endpoints you add.

## What's implemented in this pass

- Django project with `accounts` (custom email-based `User`, no role
  field) and `certificates` (`Branch`, `CertificateCategory`,
  `Certificate`, `RenewalRecord`) apps, migrated against PostgreSQL.
- Session-based login/logout/me endpoints + CSRF bootstrap endpoint.
- Full DRF `ModelViewSet`s for Branch/Category/Certificate/RenewalRecord
  plus a `/api/dashboard/stats` endpoint the dashboard charts consume.
- **`Certificate.status` has three states**: `active`, `expiring_soon`,
  `expired` — all fully automatic, calculated from `expiry_date` on
  every save. Renewing a certificate is an **action** (creates a
  `RenewalRecord`, bumps `expiry_date`, status recalculates
  automatically) rather than a status of its own.
- **`reference_number`** — required field on every certificate for the
  government-issued registration/license number, shown next to the name
  everywhere (list, detail, forms). **Enforced unique** at both the
  database level and the API (a friendly "A certificate with this
  reference number already exists." error, not a raw 500) — two
  certificates can no longer be created with the same reference number.
- **Full Category CRUD**: list, create, edit, delete at `/categories`,
  with a friendly error if you try to delete one still in use. Each
  category shows how many certificates it contains; clicking a category
  drills down to `/categories/[id]`, a dedicated page listing only that
  category's certificates with a "Back to Categories" link — this is a
  real route (not a query-param filter on the certificates page), so
  the browser's back button naturally returns you to the category grid.
  **That context now follows you one level deeper too**: clicking a
  certificate from inside a category's (or branch's) filtered list
  carries `?from=category&categoryId=…` (or `branch`/`branchId`) onto
  the certificate detail page, so its back link says "Back to
  {category/branch name}" and returns to that same filtered list —
  instead of always dropping you at the full, unfiltered certificates
  list regardless of where you came from.
- **Full Branch CRUD**: `/branches` shows branches as a card grid
  (rounded cards, not a table) with hover-revealed Edit/Delete icons and
  a certificate count per card. Clicking a card (not the icons) drills
  down to `/branches/[id]`, listing that branch's certificates, same
  back-button behavior as categories.
- **Full Certificate CRUD**: list at `/certificates` (shows everything;
  filtered views live on the category/branch drill-down pages instead),
  create at `/certificates/new`, detail + document preview + Renew
  action at `/certificates/[id]`, edit at `/certificates/[id]/edit`.
- **Date fields display and accept dd/mm/yyyy**, not the browser's
  locale-dependent format. This uses `react-datepicker`
  (`components/ui/DateField.tsx`) instead of the native
  `<input type="date">`, since the native input's displayed format
  can't be forced independent of OS/browser locale. Internally it still
  sends plain ISO (`yyyy-mm-dd`) to the backend — used on both the
  certificate form and the renewal modal.
- **File upload**: certificate documents (PDF/JPG/JPEG/PNG) stored
  locally via Django's `MEDIA_ROOT`/`FileField`, no cloud storage.
  Renewing a certificate can optionally attach a new document — the
  previous one is automatically preserved in the renewal history.
- Next.js shell: dark-green sidebar (Dashboard, Certificates,
  Notifications, Categories, Branches, Alert Recipients, Manage Users,
  Reports —
  Settings has been removed, it was never more than a placeholder; Home
  has also been removed since it was an exact duplicate of Dashboard,
  with `/` now redirecting there instead), topbar (a working search box,
  notification icon, a help icon that opens the Help & Guide panel, a
  clickable avatar/name that opens a
  "View Profile" / "Log Out" menu), white rounded-card content area.
- Dashboard home with 4 stat cards (Total / Active / Expiring Soon /
  Expired), a bar chart of certificates by days-until-expiry, and a
  status-breakdown donut chart — both fed by live data from the backend.
- `seed_data` management command populating 6 branches (Head
  Office/Riyadh, Jeddah, Dammam, Factory Malham, Khamis Mushait,
  Madinah Munawwarah — locations are reasonable placeholders, refine as
  needed), 7 categories, 12 certificates with realistic reference
  numbers spread across active/expiring_soon/expired states, and the 2
  accounts login is restricted to (see below).
- Login page wired to real session auth; other pages are protected by an
  `AuthGuard` that redirects to `/login` if there's no active session.
- **Status uses each certificate's own threshold.** `alert_days_before`
  (default 30, fully editable) is a single, unified value per
  certificate: once expiry is within that many days, status switches
  from Active to Expiring Soon, AND `check_reminders` starts sending
  reminders for it — the same threshold drives both. Expired means the
  expiry date has arrived or passed (the expiry date itself counts as
  expired, not expiring_soon). Editable on the certificate create/edit
  form (next to Expiry Date) and shown on the detail page as "Alert
  Threshold".
- **Renewing a certificate lets you set a fresh threshold for the new
  cycle.** The Renew modal pre-fills "Alert me before expiry (days)"
  with the certificate's current value, editable — so a certificate
  that needed a 60-day heads-up last cycle can be renewed with, say, a
  15-day threshold instead, if that fits the new cycle better. Leaving
  it as-is keeps the existing value; the field is optional on the
  API (`POST /api/renewals`), so omitting it entirely is also fine.
- **Reminders repeat every 7 days, with real email sending.** Two
  models back this: `ReminderLog` (one row per certificate+channel,
  tracking `last_sent_at`) and `Notification` (a shared, company-wide
  notice-board entry, not per-user). The `check_reminders` management
  command checks every certificate against its own `alert_days_before`,
  and for anything due — meaning never sent before, or 7+ days since
  the last send — it creates a `Notification` for the website channel,
  **sends a real email** (via Django's SMTP backend, configured through
  `EMAIL_*` env vars) to every active `EmailRecipient`. Reminders go out
  as email and website notifications only. If sending to one
  recipient fails, it prints `[email] FAILED for X: <error>` and the
  command moves on — it never crashes over one bad address or an
  unreachable mail server. The email channel is only recorded as sent
  if at least one recipient got it.
  Safe to run daily via cron. **Renewing a certificate clears its
  `ReminderLog` entries**, so the new expiry cycle starts sending fresh
  reminders again. **Every channel's wording comes from one shared
  function**, `build_reminder_message()` (in `check_reminders.py`) —
  previously each channel built its own message independently, and the
  website notification could show a confusing negative day count like
  "-30 days" for an already-expired certificate. Now every channel says
  either "expiring soon in N days" (or "expiring soon today") or
  "expired N days ago", consistently, with expiry dates shown as
  dd-mm-yyyy. Email gets the full multi-line version; the website
  notification gets a condensed single-line version (the certificate
  name is already shown separately in the bell dropdown, and
  `Notification.message` is a short field, so repeating the full
  block there would be redundant and risk overflowing it for a
  long-named certificate).
- **Notification bell in the topbar**: shows an unread-count badge and
  opens a quick-preview dropdown (about 420px wide) of the latest 5
  notifications (certificate name, "Expiring in 4 days" / "Expired 3
  days ago", reference number, branch, relative time like "2h ago"),
  each clickable to mark as read and jump to that certificate, plus a
  "Mark all as read" option and a "View all notifications" link. The
  unread count is polled every 2 minutes (one shared poller for the bell
  and the sidebar badge) and refreshes immediately after anything is
  marked read.
- **No public sign-up — access is entirely invite-only via Manage
  Users.** There is no registration endpoint anywhere in the app
  (verified across both the API and the frontend), and the login page
  itself has no sign-up link or form — it's email and password only.
  The seed script creates two starting accounts, Faisal Alhayan
  (`info@arkichem.com`) and Abdullah Fahad Zeer
  (`abdullahalzeer35@gmail.com`), and from then on the **only** way
  anyone else gets access is an already-logged-in user adding them via
  the Manage Users page (`/manage-users`, linked from the sidebar).
  That page lists every user (active and deactivated), lets you add a
  new one (name, email, password — created the same way the seed script
  does, through Django's `UserManager`), and lets you deactivate anyone
  except yourself — deactivating your own account while logged in as it
  is blocked both in the UI and on the backend, so there's no way to
  accidentally lock yourself out. Deactivating sets `is_active=False`
  rather than hard-deleting, so a deactivated person's history (e.g.
  `RenewalRecord.renewed_by`) isn't lost, and they simply can no longer
  log in. **Deactivated users can be reactivated** from the same page —
  a green "Activate" button (visually distinct from the red Deactivate
  action, so the two can't be confused) appears in place of Deactivate
  once someone's turned off, restoring their access immediately.
- **`responsible_user` has been removed entirely** from the Certificate
  model, API, and forms. Alert targeting is no longer per-certificate —
  see Alert Recipients below.
- **Alert Recipients page** (`/alert-recipients`): the single place to
  manage who receives email reminders, via a single Email Recipients
  list. Each entry has a name, email address, an active/inactive toggle
  (pause someone without deleting them), and a remove button, plus a
  small inline form to add new recipients. Backed by the
  `EmailRecipient` model, with full CRUD via the API. Website
  notifications are company-wide and need no recipient list.
- **Profile page** (`/profile`): the topbar avatar/name is now clickable,
  opening a small dropdown with "View Profile" and "Log Out" (this is
  also the first place a Log Out button exists anywhere in the app).
  The Profile page lets you view and edit your own name/email, and
  change your own password (current password + new password +
  confirm). This is deliberately scoped to **your own account only** —
  `PATCH /api/auth/me` and `POST /api/auth/change-password` never take
  a target user id, unlike Manage Users which handles everyone else's
  accounts. Changing your password correctly keeps you logged in
  afterward (Django ties session validity to a hash of the password, so
  without explicitly calling `update_session_auth_hash`, changing your
  own password would silently log you out — that's handled).
- **Reports page** (`/reports`), fully built out — no longer a
  placeholder:
  - Summary cards (Total / Active / Expiring Soon / Expired, all-time)
  - **Certificates Expired** report with a year and month picker
    (month is optional — leave it on "All Months" to see the whole
    year), listing which certificates fall in that period
  - A bar chart of certificates expiring per month for a selected year
  - Branch-wise and category-wise breakdown tables (total + status
    split per branch/category)
  - Every report has **PDF and Excel export buttons** — PDF via
    `reportlab` (chosen over `weasyprint` specifically because it's
    pure Python with no system-level Cairo/Pango dependencies, so it
    installs cleanly on Windows with nothing extra to configure), Excel
    via `openpyxl`
  - All aggregation happens in the database via Django ORM (`Count`,
    conditional `Count(..., filter=Q(...))`, date-range filtering,
    `ExtractMonth`) — the backend never fetches every certificate and
    computes totals in Python or in the browser
- **The topbar search box is now functional.** Debounced 300ms after
  typing stops, it searches certificates (by name and reference
  number), branches (by name), and categories (by name) via a single
  `GET /api/search?q=...` endpoint — done server-side with database
  filtering, not by fetching everything and searching in the browser.
  Results appear grouped by type in a dropdown, each capped to 5 per
  group; clicking one navigates straight to that item's detail page.
  Handles empty queries (no dropdown), no-results ("No results found
  for..."), and out-of-order responses (a slow earlier keystroke's
  response can't overwrite a faster later one).
- **The old duplicate "Home" page has been removed.** `/` and
  `/dashboard` used to render the exact same content under two
  different sidebar entries; `/` now redirects straight to
  `/dashboard`, so any existing bookmarks to the root path still land
  somewhere valid instead of 404ing, and the sidebar only lists
  Dashboard once.
- **`issue_date` / `expiry_date` are now validated against each
  other** — a certificate's expiry date must be after its issue date,
  everywhere that relationship can be set: the certificate create/edit
  form (checked live client-side the moment both dates are filled in,
  and again on the backend via the serializer), the `Certificate` model
  itself (`clean()`, for anything that calls `full_clean()`, e.g. the
  Django admin), and the renewal endpoint (a new expiry date can't
  land before the certificate's existing issue date either). Every
  layer uses the same message: "Expiry date must be after the issue
  date."

- **Renamed from ArkiWatch to CertiWatch** across all user-visible
  text (sidebar, login page, loading screen, browser tab title "CertiWatch
  | Certificate & Compliance Expiry Management", Manage Users text),
  code comments, `.env.example` and the frontend package name
  (`certiwatch-frontend`). The company name "Arki for Advanced
  Construction Chemicals Co." and the Arki logo are unchanged.
- **Bigger Arki logo in the sidebar** (96×64), on one row with the
  "CertiWatch" name, vertically centred, sized so the row fits the
  sidebar and the mobile drawer without overflowing. The sidebar's
  header, nav and footer live in one shared component used by both the
  desktop sidebar and the mobile drawer; the drawer's close button sits
  just outside the panel so it never covers the name.
- **Fully responsive, from 360px phones up to desktop.** Below the `md`
  breakpoint a hamburger button in the topbar opens the sidebar as a
  slide-in drawer (closes on backdrop click, Escape, link click or route
  change; locks page scrolling while open). On phones the certificate
  tables become stacked cards, wide tables scroll sideways inside their
  card, page headers and action buttons stack cleanly, dropdowns
  (notifications, user menu, search results) stay inside the screen,
  modals scroll within 90% of the screen height, chart labels angle so
  they don't collide, form fields use 16px text (stops iOS zooming in on
  focus) and tap targets are at least 40px tall. Desktop layout is
  unchanged.
- **Email notifications sent from `GM@arkichem.com`** via HostGator
  SMTP, with stricter email settings (real booleans, TLS/SSL conflict
  warning, `EMAIL_TIMEOUT`, `SERVER_EMAIL`, `FRONTEND_BASE_URL`) and a
  `send_test_email` command — see Backend setup above.
- **More reliable alert emails.** Each alert (`send_alert_email()` in
  `check_reminders.py`) has the subject
  "CertiWatch Alert: {name} - {expiring soon in N days / expired N days
  ago}", a plain-text body plus a clean HTML version (inline styles, no
  images, a small details table and a "View certificate" link), a
  Reply-To of the sending mailbox, and a Message-ID on the sender's own
  domain instead of this computer's name (spam filters penalize the
  latter). Each recipient gets their own message over one shared SMTP
  connection; one bad address never blocks the others; and if nobody
  received a certificate's email it is retried on the next run instead
  of being silently marked as sent.
- **Notifications page** (`/notifications`, in the sidebar right after
  Dashboard, with a live unread-count badge). Styled like the
  Certificates page: a "Mark all as read" button, three clickable
  summary cards (Unread / Expiring Soon / Expired) that apply that
  filter, filter tabs (All / Unread / Expiring Soon / Expired) plus a
  search box (certificate name or reference number), and the list
  grouped into Today / Yesterday / Earlier. Each notification is a
  large card with a status badge, the certificate name, "Expiring in N
  days" / "Expired N days ago", reference number, expiry date
  (dd-mm-yyyy), branch, time ago, and an unread dot and highlight;
  buttons to view the certificate or mark it read (clicking the card
  does both). Loads 20 at a time with "Load more", shows loading
  skeletons and a friendly empty state, and works on phones (cards
  stack, the filter tabs scroll sideways).
- **Notification API extended** (no new models or migrations): each
  notification now includes nested certificate details (id, name,
  reference number, expiry date, status, days until expiry, branch and
  category names). `GET /api/notifications` accepts `?is_read=true|false`,
  `?status=expiring_soon|expired` and `?q=` (certificate name or
  reference number), 20 per page. New `GET /api/notifications/unread-count`
  and `GET /api/notifications/summary` (counts for the summary cards).
  Marking one as read is still `PATCH /api/notifications/{id}` with
  `{"is_read": true}`, and marking all is still
  `POST /api/notifications/mark-all-read`.
- **Help & Guide panel**: the "?" icon in the top bar now opens a
  right-side slide-over (full width on phones) with an accordion
  covering getting started, adding a certificate, how alerts work,
  status meanings, renewing, alert recipients and users, reports, and
  "Need more help?". It closes with the X button, Esc or a click
  outside, and is keyboard accessible. All the text lives in
  `frontend/lib/helpContent.ts` so it's easy to edit. Support contact
  details go in `frontend/lib/support.ts` (`SUPPORT_EMAIL`,
  `SUPPORT_PHONE`); they're empty for now, so the contact block stays
  hidden until you fill them in.

## Not yet (planned as separate follow-up prompts)

1. Deeper dashboard interactions (drill-downs, filters)
2. Search / filtering across certificates (beyond category/branch drill-down)
3. Renewal history view (the data is captured via `RenewalRecord` on
   every renewal; there's no page listing that history yet)
4. Deployment on the client's own server (reverse proxy config,
   `DEBUG=False` hardening, static/media serving, backups, and a real
   cron schedule for `check_reminders`)

## Email troubleshooting

If `send_test_email` or `check_reminders` says an email was sent but it
never arrives, check these in order:

1. **Bounce messages in the sender mailbox.** Log in to the sending
   mailbox (e.g. `GM@arkichem.com` in HostGator webmail). If the
   recipient's server rejected the message after accepting it, a
   "Mail delivery failed" / "Undeliverable" bounce lands here with the
   reason.
2. **cPanel → Track Delivery.** Search for the recipient address to see
   whether HostGator delivered, deferred or rejected the message, and the
   exact response from the receiving server.
3. **cPanel → Email Deliverability.** Make sure SPF and DKIM show as
   valid for the sending domain (use "Repair" if cPanel offers it).
   Missing or broken SPF/DKIM is the most common reason Gmail and
   company mail servers drop or spam-folder messages.
4. **The recipient's spam/junk folder** (and, for Gmail, the Promotions
   and Updates tabs). If it's there, mark it "Not spam" so future alerts
   land in the inbox.

Running `python manage.py send_test_email you@gmail.com --debug` shows the
server's final reply line (e.g. `250 OK id=...`). If you see that, the
HostGator server accepted the message and the problem is further along
(steps 1–4 above), not in CertiWatch's settings.

## Troubleshooting

**Login says "Request failed" or a `500`/`RuntimeError` mentioning
`APPEND_SLASH`.**
This was a real bug in an earlier version: the Next.js dev proxy
(`rewrites()` in `next.config.js`) strips the trailing slash off API
URLs before forwarding them to Django, which broke Django's default
trailing-slash URL convention on POST requests. It's fixed now — every
API URL (frontend and backend) intentionally has **no** trailing slash,
and `APPEND_SLASH` is turned off in Django, so this failure mode can't
happen again. If you still see a `500` error, open your browser's dev
tools (F12) → Network tab, click the failed request, check the
**Response** tab for the real error, and also check the terminal
running `python manage.py runserver` for the full traceback — the
frontend now shows the real backend error instead of a generic one.

**Stuck in a redirect loop between `me` and `me/` in the Network tab, and
every request says `(disk cache)`.**
This happened once during development of this project too. If you ever
tested this app before a fix was applied, your browser can cache old
redirect responses very aggressively (301/308 redirects are cacheable
by default) and keep "replaying" them from disk cache forever, even
after the underlying server issue is fixed — so it looks like the app
is still broken when it isn't. Two things fix it:
1. It's now prevented from happening again: every `/api/*` response
   explicitly sends `Cache-Control: no-store`, and the frontend also
   requests with `cache: 'no-store'`.
2. If you're hitting a redirect loop that was cached *before* this fix
   was in place, clear it out once: DevTools (F12) → **Application**
   tab → **Storage** (left sidebar) → **Clear site data** button. Then
   reload and try again.

**"Could not reach the backend" on login or on the dashboard.**
The Django server (`python manage.py runserver`) isn't running, isn't
on port 8000, or crashed. Check the terminal you started it in for a
traceback.

**Dashboard loads but shows all zeros / an error banner.**
You likely skipped `python manage.py seed_data`, or your database is
empty for another reason. Run it from `backend/` with the virtual
environment active.

**`django.db.utils.OperationalError` on `migrate` or `runserver`.**
PostgreSQL isn't running, or the credentials in `backend/.env` don't
match a database/user you actually created. Re-check the `createdb` /
`createuser` step.

**Port already in use.**
Something else is already using 3000 or 8000. Stop it, or run
`python manage.py runserver 8001` / `npm run dev -- -p 3001` and update
`CERTIWATCH_API_PROXY_TARGET` accordingly.

**Adding a new report/export endpoint and it 404s even though the view
looks right.** Don't name your export query parameter `format` — it's
reserved by Django REST Framework for its own content-negotiation
system (`?format=json`, `?format=api`), and DRF intercepts it and
raises its own 404 *before* your view code ever runs if the value
isn't a registered renderer. This is why every report endpoint here
uses `?export=pdf`/`?export=xlsx` instead of `?format=`.

**Still stuck?**
Copy the exact error text from the browser console (F12 → Console) and
the terminal running `manage.py runserver`, and send both — that's
enough to pinpoint it precisely.
