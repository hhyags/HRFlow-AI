# Security Report

Date: June 12, 2026

Passed:

- Firebase verified identities and revocable secure session cookies
- Organization-scoped RBAC and PostgreSQL RLS
- Private Supabase bucket, signed URLs, and tenant-prefixed paths
- Cross-origin mutation protection with proxy-aware origin validation
- CSP and standard security headers
- API authentication, role denial, rate limits, and audit logging
- Per-user mutation throttling and bounded in-memory limiter storage
- Sanitized generic API errors that do not return database exception details
- Normalized employee and candidate identity email values
- Refresh-only session renewal that cannot create or reprovision users
- Zero known production dependency vulnerabilities
- No supplied credentials tracked by Git

Required before unrestricted real-user launch:

- Rotate the Supabase service-role key
- Rotate the PostgreSQL database password
- Rotate the Gemini API key
- Synchronize replacements to Vercel and local environments
- Configure and verify external error alerts

Residual risk: mutation throttling is local to each serverless instance. Replace it with a
shared Redis-backed limiter before sustained high-volume or adversarial traffic.
