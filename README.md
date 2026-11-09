# BOMA Digital Platform

The Bono-Ahafo-music project for musicians and instrumentalists.

A Node.js/Express and MongoDB application for the Bono Musicians Association. Public pages, member/coordinator/admin workspaces, member invitations, profile review, directory verification, and booking request intake are separate, directly addressable pages. Public profiles are read from approved member records; the directory does not substitute sample records for database results.

The authenticated dashboards and public pages share a responsive navy-and-gold design system, modeled on the reference screenshot in `imageproject/Bono Musicians Association Dashboard.png`. Public pages use a consistent mobile navigation and footer. The member dashboard shows live counts, approved directory profiles, a QR membership card and received booking requests; empty states are used for unsupported services rather than sample data.

## Requirements

- Node.js 20 or newer
- MongoDB Community Server running locally, or a MongoDB connection URI

XAMPP can remain open, but Apache/PHP/MySQL are not used by this Node/MongoDB application. Start the app with Node and browse to `http://localhost:3000`.

## Local setup

1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URI` to your MongoDB server and replace `JWT_SECRET` with a random secret of at least 32 characters.
3. Set a unique `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` (at least 12 characters).
4. From this folder, run `npm install`.
5. Create the initial administrator once with `npm run seed:admin`.
6. Start the application with `npm run dev`.
7. Open `http://localhost:3000`. Check `http://localhost:3000/api/health` for database status.

The initial administrator password is read only from `.env` and is hashed before it is saved. Do not commit `.env` or use development credentials in production.

## Standalone pages

- `/` — public homepage
- `/about.html`, `/directory.html`, `/talent.html?id=...`, `/bands.html`, `/booking.html`
- `/events.html`, `/announcements.html`, `/leadership.html`, `/gallery.html`, `/membership.html`, `/contact.html`, `/verify.html`
- `/login.html`, `/invite.html?token=...`, `/portal.html`
- `/admin.html`, `/coordinator.html`, `/member.html`
- `/member-profile.html`, `/my-membership.html`, `/my-payments.html`, `/member-bookings.html`
- `/member-media.html`, `/member-events.html`, `/member-announcements.html`, `/member-reports.html`, `/member-settings.html`

Public content pages have their own HTML entry points and share only styles and small page scripts. Administrative and member workspaces each load independently and enforce roles again through the API.

## Current API

- `GET /api/health` — application and MongoDB readiness
- `POST /api/auth/login` — sign in to an active account; session is held in an HTTP-only cookie
- `GET /api/auth/me` — current signed-in user
- `POST /api/auth/logout` — clear the session cookie
- `POST /api/invitations` — create a 72-hour, one-time member or coordinator invitation (super admin); coordinators can invite members only into their assigned group
- `POST /api/invitations/accept` — verify the invitation email and set a password; account waits for administrator activation
- `GET /api/members` — super admin sees all members; coordinators see members in their own assigned group only
- `PATCH /api/admin/members/:id` — activate/suspend a member or approve/reject their public profile
- `GET /api/admin/coordinators` and `PATCH /api/admin/accounts/:id/status` — administrator coordinator management
- `GET/PUT /api/member/profile` — member's own profile; edits remove directory visibility until review
- `GET /api/member/dashboard` — live membership/talent/booking counts, featured profiles and a generated membership verification QR
- `GET /api/member/bookings` and `PATCH /api/member/bookings/:id/status` — view and respond to booking requests addressed to the signed-in member
- `GET /api/admin/bookings` — super-admin-only booking request list
- `GET /api/talents` — active, publicly approved profiles; supports `q`, `profession`, `location`, `instrument`, and `genre`, plus `page` and `limit` pagination (maximum 60 profiles per request)
- `GET /api/talents/:id` — one approved public profile
- `GET /api/verify/:membershipId` — limited public verification of active membership
- `POST /api/bookings` — submit a booking request for an approved member
- `GET /api/admin/summary` — super-admin-only counts
- `GET /api/site-content` — public About, director, sponsor, gallery, and footer content
- `GET/PUT /api/admin/site-content` — super-admin-only website editor settings; publishing is immediate
- `POST /api/admin/site-media` — super-admin-only JPG, PNG, or WebP uploads (6 MB maximum); uploaded images are served from `/site-media/`

The Website & Content area in the super-admin workspace edits About copy, director biographies and portraits, sponsor details/logos, gallery photos, social links, app-store links, and footer text. Social and app-store destinations must be HTTPS URLs; app badges remain visibly marked as coming soon until real store links are supplied. Public images are stored on the application server, so include `public/site-media/` in deployment backups and only upload material approved for public display. Website editor actions are written to the audit log. Member profiles appear in the public directory and homepage only after they are active and approved for public display.

There is no public member sign-up endpoint. Invitation links are currently created in the authenticated admin/coordinator workspace and must be shared manually. Outbound email delivery is not configured. Booking requests are stored in MongoDB and members can accept or decline their own requests.

## Remaining implementation milestones

1. Transactional email delivery, invitation resend/revoke, and account recovery.
2. PDF download is currently provided by the browser print dialog; add server-side PDF generation if a downloadable PDF file is required.
3. Configure an events/announcements service and band profile management.
4. Add media galleries, upload retention/cleanup, and moderation workflows if needed.
5. Dues, expenses, Paystack initialization/server-side verification, webhook validation, and receipts.
6. Automated tests, deployment configuration, backup/recovery, and operational hardening.

The existing project did not include a Paystack integration, payment ledger, event/video service, or notification store. Their dashboard states are intentionally marked unavailable, and no payment is shown as successful. The website editor supports public photo galleries and logos, but not member video uploads or moderation. Email, cloud media, and payment integrations require association-owned service credentials. Configure them as environment secrets; never put private keys in browser code. Set `PUBLIC_BASE_URL` to the canonical deployment origin so printed membership QR codes resolve to the correct site.
