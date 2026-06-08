# Vercel Deployment Guide

1. Import the GitHub repository into Vercel.
2. Select Next.js and keep the repository root as the project root.
3. Add every `.env.example` variable for Production and the required Preview environments.
4. Preserve newlines in `FIREBASE_ADMIN_PRIVATE_KEY`.
5. Run database migrations once against production before promoting the deployment.
6. Deploy with `powershell -File scripts/deploy-vercel.ps1`.
7. Add the production hostname to Firebase Authorized Domains.
8. Verify the daily Vercel Cron is enabled and sends `CRON_SECRET`.

Next.js handles compression. Static assets use framework caching; authenticated API responses are `private, no-store`.
