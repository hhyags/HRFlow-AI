# Vercel Deployment Guide

The project is linked to `saigoutham700-2810s-projects/hrflow-ai`.

Production URL: https://hrflow-ai-alpha.vercel.app

1. Add or rotate variables in Vercel Production.
2. Preserve newlines in `FIREBASE_ADMIN_PRIVATE_KEY`.
3. Run database migrations before deploying schema changes.
4. Deploy with `powershell -File scripts/deploy-vercel.ps1`.
5. Keep the production hostname in Firebase Authorized Domains.
6. Run `npm run production:smoke` and production Playwright tests.
7. Verify the daily Vercel Cron sends `CRON_SECRET`.

The Vercel hostname has managed HTTPS. A custom domain still requires registrar ownership,
DNS records, and Vercel domain attachment.

Next.js handles compression. Static assets use framework caching; authenticated API responses are `private, no-store`.
