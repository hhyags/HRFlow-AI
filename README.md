# HRFlow AI

## Supabase setup

1. Create a Supabase project and copy `.env.example` to `.env.local`.
2. Add the project URL, anon key, service role key, pooled database URL, and direct database URL.
3. Apply the schema:

```powershell
npm run prisma:generate
npm run db:migrate
npm run db:seed
```

4. Create the first Supabase Auth user with `POST /api/auth/register`. Use the seeded organization ID:

```text
11111111-1111-4111-8111-111111111111
```

Set its role to `HR_MANAGER` and send the configured `HRFLOW_BOOTSTRAP_SECRET` in the
`x-bootstrap-secret` header. Supabase metadata and the database trigger create the matching application profile.

## API

Authenticated CRUD resources:

- `/api/employees`
- `/api/jobs`
- `/api/candidates`
- `/api/attendance`
- `/api/leave`
- `/api/payroll`
- `/api/reviews`

Use `GET` and `POST` on collection routes. Use `GET`, `PUT`, and `DELETE` on `/<resource>/<id>`.

Other endpoints:

- `/api/dashboard`
- `/api/uploads`
- `/api/auth/login`
- `/api/auth/logout`
- `/api/auth/session`
- `/api/auth/register`
- `/api/auth/reset-password`

The UI retains its demo dataset when Supabase is not configured. With a valid session, dashboard, employee, and recruitment screens load live API data.

## Gemini AI

Set `GEMINI_API_KEY` in `.env.local`. The default model is `gemini-2.5-flash`.

AI endpoints:

- `POST /api/ai/resume-analysis` - multipart PDF upload or JSON with `documentId`
- `POST /api/ai/candidate-ranking` - `candidateId` and `jobId`
- `POST /api/ai/interview-questions` - job, optional candidate, and question counts
- `POST /api/ai/hr-copilot` - message, recent conversation history, and optional report flag
- `POST /api/ai/report-generator` - forces a structured HR report
- `POST /api/ai/analytics` - attrition risk, hiring forecast, or workforce planning
- `GET /api/ai/logs` - HR manager audit access

AI responses are schema-validated, organization-scoped, cached in PostgreSQL, rate-limited
per user, and recorded in `ai_request_logs`. Resume PDF bytes are never stored in AI logs.

## Production modules

The production workflow APIs are organization-scoped and enforce the existing RBAC rules:

- `/api/attendance-engine` - shifts, assignments, holidays, clocking, corrections, and reports
- `/api/leave-workflow` - policies, balances, accrual, carry-forward, approvals, and reports
- `/api/payroll-engine` - payroll processing, adjustments, PDF payslips, and CSV exports
- `/api/notifications` - in-app/email delivery, read status, and scheduled reminders
- `/api/cron/production-jobs` - protected reminder delivery and monthly leave accrual

Set `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`, and optionally
`ERROR_MONITORING_WEBHOOK` in `.env.local`. The cron endpoint requires
`Authorization: Bearer <CRON_SECRET>`.

Apply the production module migration and regenerate Prisma:

```powershell
npm run prisma:generate
npm run db:migrate
npm run db:seed
```

## Verification

```powershell
npm run test:coverage
npm run test:e2e
npm run build
```

Playwright uses the locally installed Chrome by default. Set `PLAYWRIGHT_CHANNEL=msedge`
to run the E2E suite with Microsoft Edge instead.
