# Master Plan Execution

Started: June 12, 2026

## Pre-Work

- [x] Created Vercel project `hrflow-ai-staging`.
- [x] Saved coverage, build, and E2E baselines in `docs/baselines`.
- [x] Confirmed GitHub Actions runs coverage, build, dependency audit, and E2E.
- [x] Changed CI browser validation to use `HRFLOW_STAGING_URL`.
- [x] Installed Testing Library and MSW.

Baseline:

- Unit/integration tests: 79 passed.
- Coverage: 100% statements, lines, and functions; 93.88% branches.
- Production E2E: 5 passed.
- Production build: passed.

## Infrastructure Required

The staging Vercel project intentionally has no production secrets. Before a staging
deployment can be used, provide a separate Supabase staging project and configure:

- `HRFLOW_STAGING_URL` in GitHub Actions secrets.
- Staging Firebase configuration and authorized staging domain.
- Staging Supabase URL, keys, database URLs, and storage bucket.
- Staging Gemini key or a restricted test key.
- Staging QA accounts for manager, recruiter, and employee roles.

Production database credentials must not be copied into staging.
