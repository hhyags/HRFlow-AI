import { handleCopilot } from '@/app/api/ai/hr-copilot/route'

export async function POST(request) {
  return handleCopilot(request, true)
}
