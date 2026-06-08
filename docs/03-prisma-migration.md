# Prisma Migration Guide

1. Back up PostgreSQL.
2. Set `DATABASE_URL` to the pooled connection and `DIRECT_URL` to the direct connection.
3. Run `npm run prisma:generate`.
4. Review `prisma/migrations/20260608093000_firebase_auth/migration.sql`.
5. Run `npm run db:migrate`.
6. Set `FIREBASE_DEMO_UID` and run `npm run db:seed` only when demo data is required.

The Firebase migration renames `profiles` to `users`, preserves internal UUIDs, adds Firebase UID/email uniqueness, updates RLS helpers, and creates `audit_logs`. Legacy users receive placeholder Firebase IDs and must be reconciled before production sign-in.
