# Attendance management

## Two connected interfaces

- `/attendance-portal` is the public employee entry point. It has its own mobile-first layout and login screen, without the ERP header or sidebar. It reuses the existing ERP authentication, users, API, database, company, branch, and role model.
- `/attendance` is the internal ERP administration page. It is restricted to attendance record permissions and provides scoped summary cards, server-side filters, pagination, workplace administration, and filtered CSV export.
- Both interfaces write/read the same `attendance_records` and `attendance_events` transaction boundary, so an accepted portal punch is immediately visible to an authorized administrator after refresh.
- Portal requests include an `Idempotency-Key`; the database unique index and employee advisory lock protect refreshes, multiple tabs, double taps, and concurrent API calls.

The portal intentionally remains a route/layout boundary in the existing React application rather than a second application. This keeps one secure authentication implementation and one deployable web image. Split it into a separately deployed application only if independent scaling, branding, or release ownership becomes necessary.

## Scope and decisions

Attendance is part of the existing ERP API and React application. A user account is the employee identity; clients never submit an employee ID when punching. PostgreSQL server time is authoritative. Company time zone defaults to `Africa/Cairo` and may be overridden at branch level.

The initial policy supports one work period per employee and business date. A forgotten open checkout blocks another check-in until HR corrects the record with a mandatory reason. Shifts, grace periods, workdays, holidays, night shifts, and location enforcement are configurable; payroll consequences are deliberately not inferred.

Browser geolocation is risk evidence, not biometric verification and not proof against GPS spoofing. The backend validates age, accuracy, employee/workplace assignment, and Haversine distance and stores IP, user agent, accuracy, distance, and server timestamp. Location details are available only through attendance-management permissions.

## API

- `GET /api/attendance/me/today`
- `POST /api/attendance/check-in`
- `POST /api/attendance/check-out`
- `GET /api/attendance/me/history`
- `GET /api/attendance/admin/records`
- `PATCH /api/attendance/admin/records/:id`
- `GET|POST /api/attendance/admin/workplaces`
- `PATCH /api/attendance/admin/workplaces/:id`
- `POST /api/attendance/admin/workplaces/:id/assignments`
- `GET|POST /api/attendance/admin/shifts`
- `POST /api/attendance/admin/shifts/:id/assignments`
- `GET|PATCH /api/attendance/admin/settings`

Permissions are `attendance.punch`, `attendance.read`/`attendance.view`, `attendance.write`/`attendance.manage`, and `attendance.locations`. Employee punches are self-scoped; management queries are company and branch scoped.

## Local operation

Run `npm run db:migrate`, then start the API and ERP interface with `npm run dev`. Sign in and open `/attendance`. Location enforcement is off by default to avoid locking out existing users; HR should create workplaces, assign employees, validate coordinates/radii, then enable it through the settings API.

## VPS rollout

Back up PostgreSQL and verify the dump, build the immutable revision, and run the one-shot `migrate` service before replacing API and worker containers. Migration `022_attendance_management.sql` is additive. Geolocation requires HTTPS in modern browsers, which the production Caddy topology provides. Run the release gate and smoke checks described in `vps-deployment.md`; no automatic production deployment is performed by this feature.
