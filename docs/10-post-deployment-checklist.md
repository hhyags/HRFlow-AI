# Post-Deployment Testing Checklist

- [ ] A valid invitation allows signup and an invalid/used invitation is rejected.
- [ ] Verification email blocks access until confirmed.
- [ ] Email/password and Google login create secure sessions.
- [ ] Password reset and logout work.
- [ ] HR Manager, Recruiter, and Employee permissions are correct.
- [ ] Cross-organization record IDs cannot be read or modified.
- [ ] Employee, recruitment, attendance, leave, payroll, and review workflows work.
- [ ] PDF resume analysis and candidate ranking work.
- [ ] HR Copilot and analytics reports use organization-only context.
- [ ] Private uploads, signed downloads, exports, and payslips work.
- [ ] Notifications, reminders, and cron jobs run.
- [ ] `/api/health` and `/api/health/deep` pass.
- [ ] Audit records and error monitoring events arrive.
- [ ] Desktop and mobile Playwright journeys pass.
