# HRFlow AI Admin Guide

## Initial setup

1. Create and verify the first Firebase HR Manager.
2. Set `FIREBASE_DEMO_UID` before the initial seed or provision the manager through the bootstrap flow.
3. Issue Recruiter and Employee invitations from `POST /api/auth/invitations`.
4. Never distribute organization IDs as signup credentials; use invitation codes.

## Common operations

- Employees: create and maintain employment records, salaries, departments, and documents.
- Recruitment: create jobs, move candidates through stages, review AI scores, and generate interviews.
- Attendance: configure shifts and holidays, review corrections, and monitor overtime.
- Leave: configure policies, accruals, carry-forward rules, and approval levels.
- Payroll: process periods, add earnings/deductions, export CSV, and generate payslips.
- Notifications: create in-app/email notices and scheduled reminders.
- Audit: review privileged authentication and invitation events in `audit_logs`.

## Production care

- Review failed notifications, AI errors, and deep health checks daily.
- Rotate service credentials according to company policy.
- Remove or disable users immediately when access should end.
- Apply migrations through the deployment process, never by editing production tables manually.
- Restore from backups into a non-production project before testing recovery.
