# HRFlow AI

## Production stack

HRFlow AI uses Firebase Authentication, PostgreSQL with Prisma, Supabase private
Storage and RLS, Gemini 2.5 Flash, and Vercel.

Production: https://hrflow-ai-alpha.vercel.app

1. Copy `.env.example` to `.env.local` and configure Firebase, Supabase, PostgreSQL, and Gemini.
2. Enable Email/Password and Google authentication in Firebase.
3. Enable the Firebase third-party auth integration in Supabase.
4. Apply the schema:

```powershell
npm run prisma:generate
npm run db:migrate
npm run db:seed
```

5. Set `FIREBASE_DEMO_UID` to the Firebase UID of the first HR Manager before seeding.
   The seeded organization ID is:

```text
11111111-1111-4111-8111-111111111111
```

Firebase identities are linked to internal UUID users in PostgreSQL. Secure session
cookies protect the dashboard, API guards enforce database roles, and Firebase custom
claims allow Supabase Storage/RLS to authorize the same identity.

HR Managers issue single-use Recruiter or Employee signup codes with
`POST /api/auth/invitations`. The code is stored only as a SHA-256 hash and is bound to
the invited email and organization.

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

The dashboard requires a verified Firebase session. With a valid session, dashboard,
employee, and recruitment screens load live organization-scoped API data.

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
npm run production:smoke
```

Playwright signs in with real Firebase QA accounts. Local credentials are generated in
the ignored `.env.qa.local` file. CI requires the matching `QA_*` repository secrets and
`HRFLOW_PRODUCTION_URL`.

## Launch documentation

The complete production handoff is under [`docs`](docs):

- Firebase, environment, Prisma, Supabase, and Gemini setup
- Vercel and production deployment
- Security and monitoring guidance
- Post-deployment validation checklist
- Dated production validation report
- Infrastructure, admin, user, API, architecture, and final launch guides

Run `npm run production:check` with production-like environment variables before release.
Deploy with `powershell -File scripts/deploy-vercel.ps1`.

The application is live and its core production flows pass. Resend email delivery,
external error monitoring, a custom domain, and provider credential rotation remain
operator-owned launch requirements; see `docs/18-launch-readiness-report.md`.
