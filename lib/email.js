import { Resend } from 'resend'

let resend

function getClient() {
  const key = process.env.RESEND_API_KEY
  if (!key || /your-|replace-/i.test(key)) return null
  resend ||= new Resend(key)
  return resend
}

export async function sendOrganizationInvitation({ email, role, token, organizationName }) {
  const client = getClient()
  if (!client) return { sent: false, reason: 'Email delivery is not configured.' }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  const inviteUrl = `${appUrl}/signup?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
  const { error } = await client.emails.send({
    from: process.env.EMAIL_FROM || 'HRFlow AI <onboarding@resend.dev>',
    to: email,
    subject: `Join ${organizationName} on HRFlow AI`,
    text: [
      `You have been invited to join ${organizationName} as ${role.toLowerCase().replace('_', ' ')}.`,
      `Create your account: ${inviteUrl}`,
      'This invitation expires automatically and can only be used by this email address.',
    ].join('\n\n'),
  })
  if (error) throw new Error(error.message)
  return { sent: true }
}
