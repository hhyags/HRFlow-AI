-- Replace Supabase Auth profile identity with Firebase Auth while preserving
-- the existing internal UUIDs used by HR records and foreign keys.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

ALTER TABLE "profiles" RENAME TO "users";
ALTER INDEX "profiles_pkey" RENAME TO "users_pkey";
ALTER INDEX "profiles_organization_id_idx" RENAME TO "users_organization_id_idx";
ALTER TABLE "users" ADD COLUMN "firebase_uid" TEXT;
ALTER TABLE "users" ADD COLUMN "email" TEXT;

UPDATE "users" AS u
SET
  "firebase_uid" = 'legacy:' || u."id"::text,
  "email" = COALESCE(
    (SELECT e."email" FROM "employees" e WHERE e."profile_id" = u."id" LIMIT 1),
    'legacy-' || u."id"::text || '@invalid.local'
  );

ALTER TABLE "users" ALTER COLUMN "firebase_uid" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX "users_firebase_uid_key" ON "users"("firebase_uid");
CREATE UNIQUE INDEX "users_organization_id_email_key" ON "users"("organization_id", "email");

ALTER TABLE "users" RENAME CONSTRAINT "profiles_organization_id_fkey" TO "users_organization_id_fkey";

CREATE TABLE "audit_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID,
  "user_id" UUID,
  "action" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "resource_id" TEXT,
  "metadata" JSONB,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization_invites" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "accepted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_invites_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at");
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");
CREATE UNIQUE INDEX "organization_invites_token_hash_key" ON "organization_invites"("token_hash");
CREATE INDEX "organization_invites_organization_id_email_idx" ON "organization_invites"("organization_id", "email");
CREATE INDEX "organization_invites_expires_at_accepted_at_idx" ON "organization_invites"("expires_at", "accepted_at");
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Firebase tokens expose their stable user identifier as the JWT subject.
CREATE OR REPLACE FUNCTION public.current_firebase_uid()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(auth.jwt()->>'sub', '')
$$;

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.users WHERE firebase_uid = public.current_firebase_uid()
$$;

CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.users WHERE firebase_uid = public.current_firebase_uid()
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS "UserRole"
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE firebase_uid = public.current_firebase_uid()
$$;

CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.employees WHERE profile_id = public.current_user_id()
$$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can view organization profiles" ON public.users;
DROP POLICY IF EXISTS "users can update their profile" ON public.users;
CREATE POLICY "users can view organization users"
ON public.users FOR SELECT TO authenticated
USING (organization_id = public.current_organization_id());
CREATE POLICY "users can update their user record"
ON public.users FOR UPDATE TO authenticated
USING (id = public.current_user_id())
WITH CHECK (id = public.current_user_id() AND organization_id = public.current_organization_id());

DROP POLICY IF EXISTS "organization read employees" ON public.employees;
CREATE POLICY "organization read employees"
ON public.employees FOR SELECT TO authenticated
USING (
  organization_id = public.current_organization_id()
  AND (
    public.current_user_role() IN ('HR_MANAGER', 'RECRUITER')
    OR profile_id = public.current_user_id()
  )
);

DROP POLICY IF EXISTS "organization uploads documents" ON public.documents;
CREATE POLICY "organization uploads documents"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (
  organization_id = public.current_organization_id()
  AND uploaded_by = public.current_user_id()
);

DROP POLICY IF EXISTS "hr ai logs read" ON public.ai_request_logs;
CREATE POLICY "hr ai logs read"
ON public.ai_request_logs FOR SELECT TO authenticated
USING (
  organization_id = public.current_organization_id()
  AND (
    public.current_user_role() = 'HR_MANAGER'
    OR requester_id = public.current_user_id()
  )
);

DROP POLICY IF EXISTS "users read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "users update own notifications" ON public.notifications;
CREATE POLICY "users read own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (
  organization_id = public.current_organization_id()
  AND (recipient_id = public.current_user_id() OR public.current_user_role() = 'HR_MANAGER')
);
CREATE POLICY "users update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (recipient_id = public.current_user_id())
WITH CHECK (
  recipient_id = public.current_user_id()
  AND organization_id = public.current_organization_id()
);

CREATE POLICY "hr reads audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (
  organization_id = public.current_organization_id()
  AND public.current_user_role() = 'HR_MANAGER'
);

CREATE POLICY "hr manages organization invitations"
ON public.organization_invites FOR ALL TO authenticated
USING (
  organization_id = public.current_organization_id()
  AND public.current_user_role() = 'HR_MANAGER'
)
WITH CHECK (
  organization_id = public.current_organization_id()
  AND public.current_user_role() = 'HR_MANAGER'
);

-- Storage remains private and tenant-scoped through the existing folder policies.
-- Supabase must be configured to trust the Firebase project as a third-party auth provider.
