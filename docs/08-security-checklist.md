# Security Checklist

- [ ] Firebase Email/Password and Google are the only enabled providers.
- [ ] Production domains are authorized in Firebase.
- [ ] Admin private key and Supabase service role are server-only.
- [ ] Firebase third-party auth is restricted to the correct project.
- [ ] All tenant tables have RLS enabled and organization policies applied.
- [ ] Storage bucket is private and tenant-folder policies are active.
- [ ] Session cookies are `httpOnly`, `Secure`, `SameSite=Lax`, and revocable.
- [ ] Mutations reject cross-origin cookie requests.
- [ ] Email verification is required.
- [ ] Public signup requires a single-use, email-bound organization invitation.
- [ ] CSP, frame denial, MIME sniffing protection, and permissions policy are present.
- [ ] Auth, AI, and reset endpoints are rate limited.
- [ ] Logs redact tokens, cookies, passwords, secrets, and payroll values.
- [ ] Dependency audit and production tests pass.
