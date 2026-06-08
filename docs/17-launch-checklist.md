# Final Launch Checklist

## Before deployment

- [x] Complete infrastructure validation
- [x] Add core production variables and run `npm run env:validate`
- [x] Run `npm run db:migrate`
- [x] Run `npm run db:seed`
- [x] Run `npm run db:validate`
- [x] Run `npm run production:check`

## Deployment

- [x] Link the Vercel project
- [x] Deploy and complete role acceptance testing
- [x] Deploy to production
- [x] Verify managed HTTPS
- [x] Add the production hostname to Firebase Authorized Domains
- [x] Run `npm run production:smoke`
- [ ] Attach an owned custom domain and validate DNS

## Acceptance

- [x] HR Manager flow passes
- [x] Recruiter flow passes
- [x] Employee flow passes
- [x] Resume/document/payslip storage access is tenant-safe
- [x] Gemini capabilities return valid structured results
- [x] In-app notification queue is operational
- [ ] Resend email notifications arrive
- [ ] Monitoring receives a controlled test error
- [x] Audit logging is active

## Approval

- [ ] Product owner approval
- [ ] Security approval
- [ ] Data/privacy approval
- [ ] Rollback owner and incident contact identified
