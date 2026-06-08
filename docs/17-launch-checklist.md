# Final Launch Checklist

## Before deployment

- [ ] Complete `12-infrastructure-checklist.md`
- [ ] Add all production variables and run `npm run env:validate`
- [ ] Back up the production database
- [ ] Run `npm run db:migrate`
- [ ] Run `npm run db:seed`
- [ ] Run `npm run db:validate`
- [ ] Run `npm run production:check`

## Deployment

- [ ] Link the Vercel project
- [ ] Deploy a preview and complete role acceptance testing
- [ ] Promote or deploy to production
- [ ] Attach the custom domain and verify SSL
- [ ] Add the final domain to Firebase Authorized Domains
- [ ] Run `npm run production:smoke`

## Acceptance

- [ ] HR Manager flow passes
- [ ] Recruiter flow passes
- [ ] Employee flow passes
- [ ] Resume/document/payslip storage access is tenant-safe
- [ ] Gemini capabilities return valid structured results
- [ ] Email and in-app notifications arrive
- [ ] Monitoring receives a controlled test error
- [ ] Audit events appear for login, logout, and invitation creation

## Approval

- [ ] Product owner approval
- [ ] Security approval
- [ ] Data/privacy approval
- [ ] Rollback owner and incident contact identified
