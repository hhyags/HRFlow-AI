# Environment Setup Guide

Copy `.env.example` to `.env.local` and replace every placeholder. Never commit `.env.local`.

Required groups:

- Firebase Web and Admin credentials
- Supabase URL, anon key, service role key, and private bucket name
- PostgreSQL pooled and direct URLs
- Gemini API key
- `CRON_SECRET` and `HRFLOW_BOOTSTRAP_SECRET`

Run `npm run env:validate` before migrations or deployment. Set `HRFLOW_VALIDATE_ENV=1` in production to fail startup when required configuration is missing.

The Vercel Production environment is configured for `https://hrflow-ai-alpha.vercel.app`.
QA credentials are kept only in `.env.qa.local` and must never be committed. Email
delivery and external error alerts additionally require `RESEND_API_KEY`, `EMAIL_FROM`,
and `ERROR_MONITORING_WEBHOOK`.
