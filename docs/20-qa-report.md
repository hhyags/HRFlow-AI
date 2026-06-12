# QA Report

Date: June 12, 2026

- Unit/integration/API/RBAC tests: **79 passed**
- Coverage: **100% statements, lines, functions; 93.88% branches**
- Production Playwright critical workflows: **5 scenarios validated**
- Production smoke checks: **7 passed**
- Dependency audit: **0 vulnerabilities**
- Production build: **passed**
- Prisma schema and migration status: **passed**
- Production data validation: **passed; zero orphan employees**

Live acceptance passed:

- HR Manager: login, employee creation, leave approval, payroll, HR Copilot
- Recruiter: login, job creation, resume upload, resume analysis, candidate ranking,
  interview scheduling
- Employee: login, leave submission, attendance access, payroll and payslip access
- Authentication: verified sessions and persistence across reload
- Google OAuth: authorized account chooser opens without redirect mismatch
- Session refresh: stale Firebase authentication time renews an existing linked session
- Leave engine: repeated monthly accrual is ignored

Playwright's setup timeout was raised to 90 seconds after Chrome page creation exceeded
the old 30-second global limit on one run. No application assertion failed in that event.

Email delivery and monitoring-alert delivery remain untested because provider credentials
are not configured.
