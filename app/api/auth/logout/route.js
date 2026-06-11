import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/firebase/session'

export async function POST(request) {
  return clearSessionCookie(NextResponse.redirect(new URL('/login', request.url), 303))
}

export async function GET(request) {
  return clearSessionCookie(NextResponse.redirect(new URL('/login', request.url), 303))
}
