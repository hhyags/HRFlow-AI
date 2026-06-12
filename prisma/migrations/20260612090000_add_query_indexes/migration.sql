CREATE INDEX IF NOT EXISTS "employees_organization_id_joining_date_idx"
ON "employees"("organization_id", "joining_date");

CREATE INDEX IF NOT EXISTS "jobs_organization_id_created_at_idx"
ON "jobs"("organization_id", "created_at");

CREATE INDEX IF NOT EXISTS "candidates_organization_id_applied_at_idx"
ON "candidates"("organization_id", "applied_at");

CREATE INDEX IF NOT EXISTS "leave_requests_organization_id_created_at_idx"
ON "leave_requests"("organization_id", "created_at");

CREATE INDEX IF NOT EXISTS "payroll_organization_id_period_end_idx"
ON "payroll"("organization_id", "period_end");

CREATE INDEX IF NOT EXISTS "performance_reviews_organization_id_created_at_idx"
ON "performance_reviews"("organization_id", "created_at");
