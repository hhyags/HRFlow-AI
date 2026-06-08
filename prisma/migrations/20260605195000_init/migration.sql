-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('HR_MANAGER', 'RECRUITER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'REMOTE', 'ON_LEAVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'OPEN', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CandidateStage" AS ENUM ('APPLIED', 'SCREENING', 'INTERVIEW', 'SELECTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'REMOTE', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('CASUAL', 'SICK', 'EARNED', 'UNPAID');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'PROCESSING', 'PAID', 'FAILED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "full_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "profile_id" UUID,
    "department_id" UUID,
    "employee_number" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "job_title" TEXT NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "joining_date" DATE NOT NULL,
    "salary" DECIMAL(12,2),
    "location" TEXT,
    "avatar_url" TEXT,
    "emergency_contact" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "department_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "employment_type" TEXT NOT NULL DEFAULT 'Full-time',
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "openings" INTEGER NOT NULL DEFAULT 1,
    "salary_min" DECIMAL(12,2),
    "salary_max" DECIMAL(12,2),
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "job_id" UUID,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "stage" "CandidateStage" NOT NULL DEFAULT 'APPLIED',
    "ai_score" INTEGER,
    "skills" TEXT[],
    "summary" TEXT,
    "resume_url" TEXT,
    "notes" TEXT,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "check_in" TIMESTAMP(3),
    "check_out" TIMESTAMP(3),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "work_minutes" INTEGER NOT NULL DEFAULT 0,
    "overtime_minutes" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "type" "LeaveType" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "days" DECIMAL(5,2) NOT NULL,
    "reason" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "base_salary" DECIMAL(12,2) NOT NULL,
    "bonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_pay" DECIMAL(12,2) NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "paid_at" TIMESTAMP(3),
    "payslip_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "reviewer_id" UUID,
    "period" TEXT NOT NULL,
    "rating" DECIMAL(3,2) NOT NULL,
    "goals_score" DECIMAL(5,2),
    "feedback" TEXT,
    "strengths" TEXT[],
    "improvements" TEXT[],
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "employee_id" UUID,
    "candidate_id" UUID,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "profiles_organization_id_idx" ON "profiles"("organization_id");

-- CreateIndex
CREATE INDEX "departments_organization_id_idx" ON "departments"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_organization_id_name_key" ON "departments"("organization_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "employees_profile_id_key" ON "employees"("profile_id");

-- CreateIndex
CREATE INDEX "employees_organization_id_status_idx" ON "employees"("organization_id", "status");

-- CreateIndex
CREATE INDEX "employees_department_id_idx" ON "employees"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_organization_id_employee_number_key" ON "employees"("organization_id", "employee_number");

-- CreateIndex
CREATE UNIQUE INDEX "employees_organization_id_email_key" ON "employees"("organization_id", "email");

-- CreateIndex
CREATE INDEX "jobs_organization_id_status_idx" ON "jobs"("organization_id", "status");

-- CreateIndex
CREATE INDEX "candidates_organization_id_stage_idx" ON "candidates"("organization_id", "stage");

-- CreateIndex
CREATE INDEX "candidates_job_id_idx" ON "candidates"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_organization_id_email_job_id_key" ON "candidates"("organization_id", "email", "job_id");

-- CreateIndex
CREATE INDEX "attendance_organization_id_date_idx" ON "attendance"("organization_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_employee_id_date_key" ON "attendance"("employee_id", "date");

-- CreateIndex
CREATE INDEX "leave_requests_organization_id_status_idx" ON "leave_requests"("organization_id", "status");

-- CreateIndex
CREATE INDEX "leave_requests_employee_id_idx" ON "leave_requests"("employee_id");

-- CreateIndex
CREATE INDEX "payroll_organization_id_status_idx" ON "payroll"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_employee_id_period_start_period_end_key" ON "payroll"("employee_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "performance_reviews_organization_id_period_idx" ON "performance_reviews"("organization_id", "period");

-- CreateIndex
CREATE INDEX "performance_reviews_employee_id_idx" ON "performance_reviews"("employee_id");

-- CreateIndex
CREATE INDEX "documents_organization_id_category_idx" ON "documents"("organization_id", "category");

-- CreateIndex
CREATE INDEX "documents_employee_id_idx" ON "documents"("employee_id");

-- CreateIndex
CREATE INDEX "documents_candidate_id_idx" ON "documents"("candidate_id");

-- Supabase identity helpers and row-level security.
CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS "UserRole"
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.employees WHERE profile_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.raw_app_meta_data->>'organization_id') IS NOT NULL THEN
    INSERT INTO public.profiles (id, organization_id, role, full_name, created_at, updated_at)
    VALUES (
      NEW.id,
      (NEW.raw_app_meta_data->>'organization_id')::uuid,
      COALESCE((NEW.raw_app_meta_data->>'role')::"UserRole", 'EMPLOYEE'),
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'HRFlow User'),
      now(),
      now()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organization members can view organization"
ON public.organizations FOR SELECT TO authenticated
USING (id = public.current_organization_id());

CREATE POLICY "users can view organization profiles"
ON public.profiles FOR SELECT TO authenticated
USING (organization_id = public.current_organization_id());

CREATE POLICY "users can update their profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid() AND organization_id = public.current_organization_id());

CREATE POLICY "organization read departments"
ON public.departments FOR SELECT TO authenticated
USING (organization_id = public.current_organization_id());
CREATE POLICY "hr manages departments"
ON public.departments FOR ALL TO authenticated
USING (organization_id = public.current_organization_id() AND public.current_user_role() = 'HR_MANAGER')
WITH CHECK (organization_id = public.current_organization_id() AND public.current_user_role() = 'HR_MANAGER');

CREATE POLICY "organization read employees"
ON public.employees FOR SELECT TO authenticated
USING (
  organization_id = public.current_organization_id()
  AND (
    public.current_user_role() IN ('HR_MANAGER', 'RECRUITER')
    OR profile_id = auth.uid()
  )
);
CREATE POLICY "hr manages employees"
ON public.employees FOR ALL TO authenticated
USING (organization_id = public.current_organization_id() AND public.current_user_role() = 'HR_MANAGER')
WITH CHECK (organization_id = public.current_organization_id() AND public.current_user_role() = 'HR_MANAGER');

CREATE POLICY "organization read jobs"
ON public.jobs FOR SELECT TO authenticated
USING (organization_id = public.current_organization_id());
CREATE POLICY "hr and recruiters manage jobs"
ON public.jobs FOR ALL TO authenticated
USING (organization_id = public.current_organization_id() AND public.current_user_role() IN ('HR_MANAGER', 'RECRUITER'))
WITH CHECK (organization_id = public.current_organization_id() AND public.current_user_role() IN ('HR_MANAGER', 'RECRUITER'));

CREATE POLICY "organization read candidates"
ON public.candidates FOR SELECT TO authenticated
USING (organization_id = public.current_organization_id());
CREATE POLICY "hr and recruiters manage candidates"
ON public.candidates FOR ALL TO authenticated
USING (organization_id = public.current_organization_id() AND public.current_user_role() IN ('HR_MANAGER', 'RECRUITER'))
WITH CHECK (organization_id = public.current_organization_id() AND public.current_user_role() IN ('HR_MANAGER', 'RECRUITER'));

CREATE POLICY "organization read attendance"
ON public.attendance FOR SELECT TO authenticated
USING (
  organization_id = public.current_organization_id()
  AND (
    public.current_user_role() = 'HR_MANAGER'
    OR employee_id = public.current_employee_id()
  )
);
CREATE POLICY "hr manages attendance"
ON public.attendance FOR ALL TO authenticated
USING (organization_id = public.current_organization_id() AND public.current_user_role() = 'HR_MANAGER')
WITH CHECK (organization_id = public.current_organization_id() AND public.current_user_role() = 'HR_MANAGER');

CREATE POLICY "organization read leave"
ON public.leave_requests FOR SELECT TO authenticated
USING (
  organization_id = public.current_organization_id()
  AND (
    public.current_user_role() = 'HR_MANAGER'
    OR employee_id = public.current_employee_id()
  )
);
CREATE POLICY "organization creates leave"
ON public.leave_requests FOR INSERT TO authenticated
WITH CHECK (
  organization_id = public.current_organization_id()
  AND (
    public.current_user_role() = 'HR_MANAGER'
    OR employee_id = public.current_employee_id()
  )
);
CREATE POLICY "hr updates leave"
ON public.leave_requests FOR UPDATE TO authenticated
USING (organization_id = public.current_organization_id() AND public.current_user_role() = 'HR_MANAGER')
WITH CHECK (organization_id = public.current_organization_id());

CREATE POLICY "organization read payroll"
ON public.payroll FOR SELECT TO authenticated
USING (
  organization_id = public.current_organization_id()
  AND (
    public.current_user_role() = 'HR_MANAGER'
    OR employee_id = public.current_employee_id()
  )
);
CREATE POLICY "hr manages payroll"
ON public.payroll FOR ALL TO authenticated
USING (organization_id = public.current_organization_id() AND public.current_user_role() = 'HR_MANAGER')
WITH CHECK (organization_id = public.current_organization_id() AND public.current_user_role() = 'HR_MANAGER');

CREATE POLICY "organization read reviews"
ON public.performance_reviews FOR SELECT TO authenticated
USING (
  organization_id = public.current_organization_id()
  AND (
    public.current_user_role() = 'HR_MANAGER'
    OR employee_id = public.current_employee_id()
  )
);
CREATE POLICY "hr manages reviews"
ON public.performance_reviews FOR ALL TO authenticated
USING (organization_id = public.current_organization_id() AND public.current_user_role() = 'HR_MANAGER')
WITH CHECK (organization_id = public.current_organization_id() AND public.current_user_role() = 'HR_MANAGER');

CREATE POLICY "organization read documents"
ON public.documents FOR SELECT TO authenticated
USING (
  organization_id = public.current_organization_id()
  AND (
    public.current_user_role() IN ('HR_MANAGER', 'RECRUITER')
    OR employee_id = public.current_employee_id()
  )
);
CREATE POLICY "organization uploads documents"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (organization_id = public.current_organization_id() AND uploaded_by = auth.uid());
CREATE POLICY "hr deletes documents"
ON public.documents FOR DELETE TO authenticated
USING (organization_id = public.current_organization_id() AND public.current_user_role() = 'HR_MANAGER');

INSERT INTO storage.buckets (id, name, public)
VALUES ('hrflow-documents', 'hrflow-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "organization storage read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'hrflow-documents'
  AND (storage.foldername(name))[1] = public.current_organization_id()::text
);

CREATE POLICY "organization storage upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'hrflow-documents'
  AND (storage.foldername(name))[1] = public.current_organization_id()::text
);

CREATE POLICY "organization storage delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'hrflow-documents'
  AND (storage.foldername(name))[1] = public.current_organization_id()::text
  AND public.current_user_role() = 'HR_MANAGER'
);

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
