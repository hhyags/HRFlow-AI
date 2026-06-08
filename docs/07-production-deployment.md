# Production Deployment Guide

Release order:

1. Back up PostgreSQL.
2. Validate environment variables.
3. Run coverage and production build.
4. Apply Prisma migrations.
5. Run `npm run db:seed` and `npm run db:validate`.
6. Configure Firebase third-party auth in Supabase.
7. Deploy to Vercel.
8. Configure DNS and wait for Vercel SSL issuance.
9. Run `/api/health` and protected `/api/health/deep`.
10. Execute the post-deployment checklist.
11. Monitor authentication, audit, AI, and notification errors during rollout.

Rollback application code through Vercel. Database rollback requires a reviewed forward migration; do not manually reverse the identity migration after users are provisioned.
