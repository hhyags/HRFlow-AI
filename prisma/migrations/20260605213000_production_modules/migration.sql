CREATE TYPE "WorkflowStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "PayrollItemType" AS ENUM ('EARNING', 'DEDUCTION');
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

CREATE TABLE "shifts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "start_minutes" INTEGER NOT NULL,
  "end_minutes" INTEGER NOT NULL,
  "break_minutes" INTEGER NOT NULL DEFAULT 0,
  "grace_minutes" INTEGER NOT NULL DEFAULT 0,
  "overtime_after_minutes" INTEGER NOT NULL DEFAULT 480,
  "working_days" INTEGER[] NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_shifts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "shift_id" UUID NOT NULL,
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employee_shifts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "holidays" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "location" TEXT,
  "is_optional" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attendance_corrections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "attendance_id" UUID,
  "employee_id" UUID NOT NULL,
  "requested_check_in" TIMESTAMP(3),
  "requested_check_out" TIMESTAMP(3),
  "reason" TEXT NOT NULL,
  "status" "WorkflowStatus" NOT NULL DEFAULT 'PENDING',
  "requested_by" UUID NOT NULL,
  "reviewed_by" UUID,
  "reviewed_at" TIMESTAMP(3),
  "review_note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "attendance_corrections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "leave_policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "type" "LeaveType" NOT NULL,
  "name" TEXT NOT NULL,
  "annual_allowance" DECIMAL(6,2) NOT NULL,
  "accrual_per_month" DECIMAL(6,2) NOT NULL,
  "max_carry_forward" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "max_balance" DECIMAL(6,2),
  "approval_levels" INTEGER NOT NULL DEFAULT 1,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "leave_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "leave_balances" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "policy_id" UUID NOT NULL,
  "year" INTEGER NOT NULL,
  "opening_balance" DECIMAL(7,2) NOT NULL DEFAULT 0,
  "accrued" DECIMAL(7,2) NOT NULL DEFAULT 0,
  "used" DECIMAL(7,2) NOT NULL DEFAULT 0,
  "carried_forward" DECIMAL(7,2) NOT NULL DEFAULT 0,
  "adjusted" DECIMAL(7,2) NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "leave_ledger" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "leave_request_id" UUID,
  "type" "LeaveType" NOT NULL,
  "amount" DECIMAL(7,2) NOT NULL,
  "entry_type" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "effective_date" DATE NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "leave_ledger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "leave_approvals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "leave_request_id" UUID NOT NULL,
  "level" INTEGER NOT NULL,
  "approver_id" UUID,
  "status" "WorkflowStatus" NOT NULL DEFAULT 'PENDING',
  "comment" TEXT,
  "decided_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "leave_approvals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payroll_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "payroll_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "type" "PayrollItemType" NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "taxable" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payroll_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "recipient_id" UUID NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "data" JSONB,
  "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  "scheduled_for" TIMESTAMP(3),
  "sent_at" TIMESTAMP(3),
  "read_at" TIMESTAMP(3),
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "scheduled_reminders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "schedule" TEXT NOT NULL,
  "next_run_at" TIMESTAMP(3) NOT NULL,
  "payload" JSONB NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_run_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "scheduled_reminders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shifts_organization_id_name_key" ON "shifts"("organization_id", "name");
CREATE INDEX "shifts_organization_id_is_active_idx" ON "shifts"("organization_id", "is_active");
CREATE INDEX "employee_shifts_organization_id_employee_id_effective_from_idx" ON "employee_shifts"("organization_id", "employee_id", "effective_from");
CREATE INDEX "employee_shifts_shift_id_idx" ON "employee_shifts"("shift_id");
CREATE UNIQUE INDEX "holidays_organization_id_date_name_key" ON "holidays"("organization_id", "date", "name");
CREATE INDEX "holidays_organization_id_date_idx" ON "holidays"("organization_id", "date");
CREATE INDEX "attendance_corrections_organization_id_status_idx" ON "attendance_corrections"("organization_id", "status");
CREATE INDEX "attendance_corrections_employee_id_created_at_idx" ON "attendance_corrections"("employee_id", "created_at");
CREATE UNIQUE INDEX "leave_policies_organization_id_type_key" ON "leave_policies"("organization_id", "type");
CREATE INDEX "leave_policies_organization_id_is_active_idx" ON "leave_policies"("organization_id", "is_active");
CREATE UNIQUE INDEX "leave_balances_employee_id_policy_id_year_key" ON "leave_balances"("employee_id", "policy_id", "year");
CREATE INDEX "leave_balances_organization_id_year_idx" ON "leave_balances"("organization_id", "year");
CREATE INDEX "leave_ledger_organization_id_effective_date_idx" ON "leave_ledger"("organization_id", "effective_date");
CREATE INDEX "leave_ledger_employee_id_type_idx" ON "leave_ledger"("employee_id", "type");
CREATE UNIQUE INDEX "leave_approvals_leave_request_id_level_key" ON "leave_approvals"("leave_request_id", "level");
CREATE INDEX "leave_approvals_organization_id_status_idx" ON "leave_approvals"("organization_id", "status");
CREATE INDEX "payroll_items_organization_id_payroll_id_idx" ON "payroll_items"("organization_id", "payroll_id");
CREATE INDEX "payroll_items_employee_id_idx" ON "payroll_items"("employee_id");
CREATE INDEX "notifications_organization_id_recipient_id_status_idx" ON "notifications"("organization_id", "recipient_id", "status");
CREATE INDEX "notifications_status_scheduled_for_idx" ON "notifications"("status", "scheduled_for");
CREATE INDEX "scheduled_reminders_is_active_next_run_at_idx" ON "scheduled_reminders"("is_active", "next_run_at");
CREATE INDEX "scheduled_reminders_organization_id_type_idx" ON "scheduled_reminders"("organization_id", "type");

ALTER TABLE "shifts" ADD CONSTRAINT "shifts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_shifts" ADD CONSTRAINT "employee_shifts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_shifts" ADD CONSTRAINT "employee_shifts_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_policies" ADD CONSTRAINT "leave_policies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "leave_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_ledger" ADD CONSTRAINT "leave_ledger_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_ledger" ADD CONSTRAINT "leave_ledger_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_approvals" ADD CONSTRAINT "leave_approvals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_approvals" ADD CONSTRAINT "leave_approvals_leave_request_id_fkey" FOREIGN KEY ("leave_request_id") REFERENCES "leave_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_items" ADD CONSTRAINT "payroll_items_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scheduled_reminders" ADD CONSTRAINT "scheduled_reminders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organization read shifts" ON public.shifts FOR SELECT TO authenticated USING (organization_id = public.current_organization_id());
CREATE POLICY "hr manages shifts" ON public.shifts FOR ALL TO authenticated USING (organization_id = public.current_organization_id() AND public.current_user_role() = 'HR_MANAGER') WITH CHECK (organization_id = public.current_organization_id() AND public.current_user_role() = 'HR_MANAGER');
CREATE POLICY "organization read employee shifts" ON public.employee_shifts FOR SELECT TO authenticated USING (organization_id = public.current_organization_id());
CREATE POLICY "hr manages employee shifts" ON public.employee_shifts FOR ALL TO authenticated USING (organization_id = public.current_organization_id() AND public.current_user_role() = 'HR_MANAGER') WITH CHECK (organization_id = public.current_organization_id() AND public.current_user_role() = 'HR_MANAGER');
CREATE POLICY "organization read holidays" ON public.holidays FOR SELECT TO authenticated USING (organization_id = public.current_organization_id());
CREATE POLICY "hr manages holidays" ON public.holidays FOR ALL TO authenticated USING (organization_id = public.current_organization_id() AND public.current_user_role() = 'HR_MANAGER') WITH CHECK (organization_id = public.current_organization_id() AND public.current_user_role() = 'HR_MANAGER');

CREATE POLICY "users read attendance corrections" ON public.attendance_corrections FOR SELECT TO authenticated USING (organization_id = public.current_organization_id() AND (public.current_user_role() = 'HR_MANAGER' OR employee_id = public.current_employee_id()));
CREATE POLICY "employees create corrections" ON public.attendance_corrections FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_organization_id() AND (public.current_user_role() = 'HR_MANAGER' OR employee_id = public.current_employee_id()));
CREATE POLICY "hr updates corrections" ON public.attendance_corrections FOR UPDATE TO authenticated USING (organization_id = public.current_organization_id() AND public.current_user_role() = 'HR_MANAGER') WITH CHECK (organization_id = public.current_organization_id());

CREATE POLICY "organization read leave policies" ON public.leave_policies FOR SELECT TO authenticated USING (organization_id = public.current_organization_id());
CREATE POLICY "hr manages leave policies" ON public.leave_policies FOR ALL TO authenticated USING (organization_id = public.current_organization_id() AND public.current_user_role() = 'HR_MANAGER') WITH CHECK (organization_id = public.current_organization_id());
CREATE POLICY "users read leave balances" ON public.leave_balances FOR SELECT TO authenticated USING (organization_id = public.current_organization_id() AND (public.current_user_role() = 'HR_MANAGER' OR employee_id = public.current_employee_id()));
CREATE POLICY "users read leave ledger" ON public.leave_ledger FOR SELECT TO authenticated USING (organization_id = public.current_organization_id() AND (public.current_user_role() = 'HR_MANAGER' OR employee_id = public.current_employee_id()));
CREATE POLICY "users read leave approvals" ON public.leave_approvals FOR SELECT TO authenticated USING (organization_id = public.current_organization_id());
CREATE POLICY "hr manages leave approvals" ON public.leave_approvals FOR UPDATE TO authenticated USING (organization_id = public.current_organization_id() AND public.current_user_role() = 'HR_MANAGER') WITH CHECK (organization_id = public.current_organization_id());

CREATE POLICY "users read payroll items" ON public.payroll_items FOR SELECT TO authenticated USING (organization_id = public.current_organization_id() AND (public.current_user_role() = 'HR_MANAGER' OR employee_id = public.current_employee_id()));
CREATE POLICY "hr manages payroll items" ON public.payroll_items FOR ALL TO authenticated USING (organization_id = public.current_organization_id() AND public.current_user_role() = 'HR_MANAGER') WITH CHECK (organization_id = public.current_organization_id());

CREATE POLICY "users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (organization_id = public.current_organization_id() AND (recipient_id = auth.uid() OR public.current_user_role() = 'HR_MANAGER'));
CREATE POLICY "users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid() AND organization_id = public.current_organization_id());
CREATE POLICY "hr reads reminders" ON public.scheduled_reminders FOR SELECT TO authenticated USING (organization_id = public.current_organization_id() AND public.current_user_role() = 'HR_MANAGER');
CREATE POLICY "hr manages reminders" ON public.scheduled_reminders FOR ALL TO authenticated USING (organization_id = public.current_organization_id() AND public.current_user_role() = 'HR_MANAGER') WITH CHECK (organization_id = public.current_organization_id());
