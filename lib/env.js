import { z } from 'zod'

const publicSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
})

const serverSchema = publicSchema.extend({
  FIREBASE_ADMIN_CLIENT_EMAIL: z.email(),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().startsWith('postgres'),
  DIRECT_URL: z.string().startsWith('postgres'),
  GEMINI_API_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(24),
})

function formatError(error) {
  return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ')
}

export function validatePublicEnv(env = process.env) {
  const result = publicSchema.safeParse(env)
  if (!result.success) throw new Error(`Invalid public environment: ${formatError(result.error)}`)
  return result.data
}

export function validateServerEnv(env = process.env) {
  const result = serverSchema.safeParse(env)
  if (!result.success) throw new Error(`Invalid server environment: ${formatError(result.error)}`)
  return result.data
}

export function environmentStatus(env = process.env) {
  const publicResult = publicSchema.safeParse(env)
  const serverResult = serverSchema.safeParse(env)
  return {
    configured: serverResult.success,
    publicConfigured: publicResult.success,
    missing: serverResult.success
      ? []
      : serverResult.error.issues.map((issue) => issue.path.join('.')),
  }
}
