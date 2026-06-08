-- CreateTable
CREATE TABLE "ai_cache" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "cache_key" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_request_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "requester_id" UUID NOT NULL,
    "capability" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "request" JSONB NOT NULL,
    "response" JSONB,
    "status" TEXT NOT NULL,
    "error_code" TEXT,
    "error_message" TEXT,
    "cache_hit" BOOLEAN NOT NULL DEFAULT false,
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "total_tokens" INTEGER,
    "latency_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_request_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_cache_organization_id_cache_key_key" ON "ai_cache"("organization_id", "cache_key");
CREATE INDEX "ai_cache_organization_id_capability_idx" ON "ai_cache"("organization_id", "capability");
CREATE INDEX "ai_cache_expires_at_idx" ON "ai_cache"("expires_at");
CREATE INDEX "ai_request_logs_organization_id_capability_created_at_idx" ON "ai_request_logs"("organization_id", "capability", "created_at");
CREATE INDEX "ai_request_logs_requester_id_created_at_idx" ON "ai_request_logs"("requester_id", "created_at");

ALTER TABLE "ai_cache"
ADD CONSTRAINT "ai_cache_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_request_logs"
ADD CONSTRAINT "ai_request_logs_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organization ai cache read"
ON public.ai_cache FOR SELECT TO authenticated
USING (organization_id = public.current_organization_id());

CREATE POLICY "hr ai logs read"
ON public.ai_request_logs FOR SELECT TO authenticated
USING (
  organization_id = public.current_organization_id()
  AND (
    public.current_user_role() = 'HR_MANAGER'
    OR requester_id = auth.uid()
  )
);

-- Cache and audit writes are performed by the server-side Prisma connection.
