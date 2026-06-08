# Infrastructure Setup Checklist

## Firebase

- [ ] Production Firebase project created
- [ ] Email/Password authentication enabled
- [ ] Google provider enabled with support email
- [ ] Email verification template configured and branded
- [ ] Password reset template configured
- [ ] Vercel production, preview, and custom domains authorized
- [ ] Service account credentials stored only in Vercel
- [ ] Smoke-test HR Manager account created and verified

## Supabase

- [ ] Production project created in the intended region
- [ ] Database password stored in a password manager
- [ ] Pooled `DATABASE_URL` and direct `DIRECT_URL` configured
- [ ] Firebase third-party authentication enabled for the correct Firebase Project ID
- [ ] Private `hrflow-documents` bucket created
- [ ] All migrations deployed
- [ ] RLS policy and integrity validation passes with `npm run db:validate`
- [ ] Backups and point-in-time recovery reviewed for the selected plan

## Gemini

- [ ] Production API key created in the intended Google Cloud project
- [ ] Billing and quota alerts configured
- [ ] Gemini 2.5 Flash access confirmed
- [ ] Deep health check reports Gemini connectivity
- [ ] AI logs confirm redaction and organization isolation

## Vercel

- [ ] Repository imported and production branch set to `main`
- [ ] All required variables configured for Production
- [ ] Safe preview variables configured separately
- [ ] Build command is `npm run vercel-build`
- [ ] Cron job enabled
- [ ] Deployment protection policy reviewed
- [ ] Production domain attached and SSL issued
- [ ] GitHub quality workflow passes
