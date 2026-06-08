# Supabase Setup Guide

1. Enable the Firebase third-party auth integration using the Firebase Project ID.
2. Confirm Firebase users receive the `role: authenticated` custom claim.
3. Create the private `hrflow-documents` bucket or use `SUPABASE_STORAGE_BUCKET`.
4. Apply all Prisma SQL migrations, including storage and Firebase RLS policies.
5. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
6. Verify storage paths begin with `<organization_id>/`.
7. Test signed URLs and confirm they expire after five minutes.

Browser Supabase clients obtain Firebase ID tokens through `accessToken`; server uploads still validate Firebase sessions and tenant paths before using the service role.
