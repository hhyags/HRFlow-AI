# Firebase Setup Guide

1. Create a Firebase project and Web App.
2. Enable Email/Password and Google under Authentication > Sign-in method.
3. Add production and preview domains to Authentication > Authorized domains.
4. Create a service account key and store its client email/private key only in server environment variables.
5. Add the Web App values and Admin credentials listed in `.env.example`.
6. Set `FIREBASE_DEMO_UID` to the UID of the seeded HR Manager before running the seed.
7. In Supabase Authentication > Third-Party Auth, enable Firebase and enter the same Firebase Project ID.
8. Create Recruiter and Employee invitations with `POST /api/auth/invitations`; signup codes are single-use, email-bound, and expire.

The server assigns Firebase custom claims `role=authenticated`, `app_role`, and `organization_id`. New password users must verify their email before a dashboard session is issued.
