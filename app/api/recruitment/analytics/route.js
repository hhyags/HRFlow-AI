import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getPrisma } from '@/lib/prisma'

export async function GET(request) {
  const auth = await requireAuth(request, ['HR_MANAGER', 'RECRUITER'])
  if (auth.error) return auth.error

  const prisma = getPrisma()
  const organizationId = auth.profile.organizationId

  const [stages, jobs, monthlyApplications] = await Promise.all([
    // Candidate counts grouped by stage
    prisma.candidate.groupBy({
      by: ['stage'],
      where: { organizationId },
      _count: true,
      _avg: { aiScore: true },
    }),
    // Open jobs vs closed/draft jobs count
    prisma.job.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: true,
      _sum: { openings: true },
    }),
    // Candidate application counts grouped by month (last 12 months)
    prisma.candidate.findMany({
      where: {
        organizationId,
        appliedAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
      },
      select: { appliedAt: true },
    }),
  ])

  // Process Stage Counts and Conversions
  const stageCounts = {
    APPLIED: 0,
    SCREENING: 0,
    INTERVIEW: 0,
    SELECTED: 0,
    REJECTED: 0,
  }
  let totalScoreSum = 0
  let totalScoredCount = 0

  stages.forEach((item) => {
    if (stageCounts[item.stage] !== undefined) {
      stageCounts[item.stage] = item._count || 0
    }
    if (item._avg.aiScore !== null) {
      totalScoreSum += (item._avg.aiScore * item._count)
      totalScoredCount += item._count
    }
  })

  const averageAiScore = totalScoredCount ? Math.round(totalScoreSum / totalScoredCount) : 0

  // Calculate Conversions
  const pipelineTotal = stageCounts.APPLIED + stageCounts.SCREENING + stageCounts.INTERVIEW + stageCounts.SELECTED + stageCounts.REJECTED
  const conversions = {
    appliedToScreening: stageCounts.APPLIED ? Math.round((stageCounts.SCREENING / stageCounts.APPLIED) * 100) : 0,
    screeningToInterview: stageCounts.SCREENING ? Math.round((stageCounts.INTERVIEW / stageCounts.SCREENING) * 100) : 0,
    interviewToOffer: stageCounts.INTERVIEW ? Math.round((stageCounts.SELECTED / stageCounts.INTERVIEW) * 100) : 0,
  }

  // Process Job Openings
  const jobStats = {
    DRAFT: 0,
    OPEN: 0,
    PAUSED: 0,
    CLOSED: 0,
    totalOpenings: 0,
  }
  jobs.forEach((item) => {
    if (jobStats[item.status] !== undefined) {
      jobStats[item.status] = item._count || 0
    }
    if (item.status === 'OPEN' && item._sum.openings) {
      jobStats.totalOpenings += Number(item._sum.openings)
    }
  })

  // Process Applications Over Time (monthly)
  const monthlyCounts = Array(12).fill(0)
  const currentMonth = new Date().getUTCMonth()
  monthlyApplications.forEach((cand) => {
    const month = new Date(cand.appliedAt).getUTCMonth()
    const diff = (currentMonth - month + 12) % 12
    if (diff < 12) {
      monthlyCounts[11 - diff] += 1
    }
  })

  return NextResponse.json({
    data: {
      pipeline: {
        stageCounts,
        pipelineTotal,
        conversions,
        averageAiScore,
      },
      jobs: jobStats,
      applicationsTimeline: monthlyCounts,
    },
  })
}
