# Monitoring Guide

Use `/api/health` for public uptime checks and `/api/health/deep` for protected dependency checks. The deep route requires `Authorization: Bearer <CRON_SECRET>` and validates PostgreSQL, Firebase Admin, Supabase Storage, and Gemini.

Set `ERROR_MONITORING_WEBHOOK` to an error collector. Application logs are structured JSON with request IDs and sensitive-field redaction. Monitor:

- 401/403 and Firebase revocation spikes
- failed notification deliveries
- Gemini latency, rate-limit, and schema errors
- database pool saturation and slow queries
- storage upload failures
- cron execution and leave accrual outcomes
- privileged actions in `audit_logs`
