# HRFlow AI API Documentation

All application APIs are organization-scoped. Browser requests use the secure session cookie;
trusted clients may send `Authorization: Bearer <Firebase ID token>`. JSON errors use
`{ "error": "message" }`.

## Authentication

- `POST /api/auth/session` - exchange a Firebase ID token for a server session
- `GET /api/auth/session` - return current user and role
- `POST /api/auth/logout` - revoke refresh tokens and clear session
- `POST /api/auth/invitations` - HR Manager creates a Recruiter/Employee invitation

## Core resources

Collection routes support `GET` and authorized `POST`; item routes support `GET`, `PUT`, and
`DELETE` where allowed:

- `/api/employees`
- `/api/jobs`
- `/api/candidates`
- `/api/attendance`
- `/api/leave`
- `/api/payroll`
- `/api/reviews`

## Workflows

- `/api/attendance-engine/*` - shifts, assignments, holidays, clocking, corrections, reports
- `/api/leave-workflow/*` - policies, requests, approvals, accrual, carry-forward, reports
- `/api/payroll-engine/*` - processing, items, payslips, CSV export
- `/api/notifications/*` - inbox, read status, sending, reminders
- `/api/uploads` - private upload and signed download URL

## AI

- `POST /api/ai/resume-analysis`
- `POST /api/ai/candidate-ranking`
- `POST /api/ai/interview-questions`
- `POST /api/ai/hr-copilot`
- `POST /api/ai/report-generator`
- `POST /api/ai/analytics`
- `GET /api/ai/logs`

## Operations

- `GET /api/health` - public configuration health
- `GET /api/health/deep` - protected dependency health using `CRON_SECRET`
- `GET /api/cron/production-jobs` - protected scheduled jobs

Detailed request schemas are defined alongside each route and in `lib/resources.js` and
`lib/ai/schemas.js`.
