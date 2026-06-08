import { NextResponse } from 'next/server'

export class AiError extends Error {
  constructor(message, { code = 'AI_ERROR', status = 500, retryAfter = null } = {}) {
    super(message)
    this.name = 'AiError'
    this.code = code
    this.status = status
    this.retryAfter = retryAfter
  }
}

export function aiErrorResponse(error) {
  const status = error instanceof AiError ? error.status : 500
  const body = {
    error: error instanceof AiError ? error.message : 'AI request failed',
    code: error instanceof AiError ? error.code : 'AI_INTERNAL_ERROR',
  }
  const headers = error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : undefined
  return NextResponse.json(body, { status, headers })
}
