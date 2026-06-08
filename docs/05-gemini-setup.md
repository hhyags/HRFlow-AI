# Gemini Setup Guide

Set `GEMINI_API_KEY` and keep `GEMINI_MODEL=gemini-2.5-flash`. Validate access with:

```powershell
Invoke-RestMethod -Headers @{ Authorization = "Bearer $env:CRON_SECRET" } https://your-domain/api/health/deep
```

The AI service includes schema validation, caching, per-user rate limits, retries, redacted request logs, and organization-scoped context. Validate resume analysis, candidate ranking, interview questions, Copilot reports, hiring forecasts, and attrition analysis with non-sensitive test data before launch.
