# Regenerix backend (Node.js + Express + MySQL)

## Setup
1. `CREATE DATABASE regenerix CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
2. `cd backend && npm install`
3. `cp .env.example .env` -> set DB_*, a long random `JWT_SECRET`, and `CLIENT_URL` (every origin the site runs on, comma-separated, e.g. `http://localhost:5173,http://localhost:5174`).
4. `npm run setup` = `knex migrate:latest` + `node seeds/seed.js` (admin account + starting content; safe to re-run, it never overwrites admin edits).
   **Upgrading an existing install:** run `npm run migrate` then `npm run seed`. The 4 new migrations only ADD tables/columns/indexes.
5. `npm run dev` -> http://localhost:5000
Frontend `.env`: `VITE_API_URL=http://localhost:5000`

## What the website reads
`src/data.js` no longer exists. The site loads `GET /api/public/site` (active content only) and re-checks every minute / when the tab regains focus,
so edits made in the dashboard appear without a redeploy. The starting content lives in `backend/seeds/seedData.js` and is only used to fill an empty database.
Settings whose key starts with `private_` are never sent to the public site.

## Migrations (23)
01-19 original tables, then: 20260201010000 appointments (unique `slot_key` = no double booking), 020000 appointment_history,
030000 notifications (id, user_id, message, message_type, is_read, created_at, detail JSON, photo), 040000 application/job extras
(adds career_applications.cover_letter/resume_name + indexes, jobs.department/employment_type).
`npm run rollback` reverses all of them.

## Appointments
Opening hours come from settings: `slot_start`, `slot_end`, `slot_minutes`, `slot_sunday_start`, `slot_sunday_end`, `booking_days_ahead`. One booking per time slot.
Statuses: pending, confirmed, rescheduled, cancelled, completed, no_show. Cancelled/no-show release the slot. Set `TZ` (default Asia/Kolkata) so "today" and past-time checks use clinic time.

## Notifications
Created inside the same DB transaction that saves the appointment / application, one row per admin account (`admins.role = 'admin'`), so a failed submission never creates one
and a retry cannot create a second. Types: `appointment_booking`, `job_application`; the ids are stored in `detail`.

## API
Public: GET /api/public/site | /pages/:slug | /{services,packages,testimonials,team,stats,why,journey,faqs,blogs,jobs}[/:slug]
        GET /api/public/appointments/slots?date=YYYY-MM-DD
        POST /appointments {name,email,phone,service,team_id?,appointment_date,appointment_time,reason?}
        POST /careers/apply (multipart: name,email,phone,experience,job_id?,cover_letter?,resume=PDF|DOCX)   POST /contact   POST /newsletter
Auth:   POST /api/auth/login | GET /me | PUT /password
Admin (Bearer token), /api/admin:
        <resource> GET, POST, GET/:id, PUT/:id, PATCH/:id/toggle, DELETE/:id for
        nav-items pages sections services packages testimonials team stats why journey faqs blogs jobs messages subscribers
        appointments   GET ?page&limit&q&status&service&team_id&date_from&date_to | GET/:id (with history) | PUT/:id {status | appointment_date+appointment_time, note} | DELETE/:id
        applications   GET ?page&limit&q&job_id&status&date_from&date_to | GET/:id | PUT/:id {status} | DELETE/:id | GET/:id/resume (private download)
        notifications  GET ?limit (newest first, + unread_count) | GET /unread-count | PATCH /:id/read | PATCH /read-all   (own notifications only)
        GET /dashboard | GET,PUT /settings | GET,POST,DELETE /media

## Uploads
Images JPG/PNG/WebP/GIF <= 10 MB, videos MP4/WebM/MOV <= 200 MB -> `uploads/images|videos`, served with range requests. SVG is rejected.
Resumes PDF/DOCX <= `RESUME_MAX_MB` (default 5), signature-checked, stored in `uploads/resumes`, never served statically; only a logged-in admin can download them.
Back up the `uploads` folder with the database.
