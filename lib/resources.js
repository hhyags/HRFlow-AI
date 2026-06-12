import { z } from 'zod'
import { roles } from '@/lib/auth'

const text = z.string().trim().min(1)
const optionalText = z.string().trim().optional().nullable()
const uuid = z.string().uuid()
const date = z.coerce.date()
const money = z.coerce.number().nonnegative()

export const resourceConfig = {
  employees: {
    model: 'employee',
    read: [roles.HR_MANAGER, roles.RECRUITER, roles.EMPLOYEE],
    write: [roles.HR_MANAGER],
    include: { department: true },
    orderBy: { createdAt: 'desc' },
    schema: z.object({
      departmentId: uuid.optional().nullable(),
      profileId: uuid.optional().nullable(),
      employeeNumber: text,
      firstName: text,
      lastName: text,
      email: z.string().email(),
      phone: optionalText,
      jobTitle: text,
      status: z.enum(['ACTIVE', 'REMOTE', 'ON_LEAVE', 'INACTIVE']).optional(),
      joiningDate: date,
      salary: money.optional().nullable(),
      location: optionalText,
      avatarUrl: optionalText,
      emergencyContact: z.record(z.string(), z.unknown()).optional().nullable(),
    }),
  },
  jobs: {
    model: 'job',
    read: [roles.HR_MANAGER, roles.RECRUITER, roles.EMPLOYEE],
    write: [roles.HR_MANAGER, roles.RECRUITER],
    include: { department: true, _count: { select: { candidates: true } } },
    orderBy: { createdAt: 'desc' },
    schema: z.object({
      departmentId: uuid.optional().nullable(),
      title: text,
      description: text,
      location: optionalText,
      employmentType: z.string().optional(),
      status: z.enum(['DRAFT', 'OPEN', 'PAUSED', 'CLOSED']).optional(),
      openings: z.coerce.number().int().positive().optional(),
      salaryMin: money.optional().nullable(),
      salaryMax: money.optional().nullable(),
      publishedAt: date.optional().nullable(),
    }),
  },
  candidates: {
    model: 'candidate',
    read: [roles.HR_MANAGER, roles.RECRUITER],
    write: [roles.HR_MANAGER, roles.RECRUITER],
    include: {
      job: true,
      documents: {
        where: { mimeType: 'application/pdf' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, name: true, mimeType: true, sizeBytes: true, createdAt: true },
      },
    },
    orderBy: { appliedAt: 'desc' },
    schema: z.object({
      jobId: uuid.optional().nullable(),
      firstName: text,
      lastName: text,
      email: z.string().email(),
      phone: optionalText,
      stage: z.enum(['APPLIED', 'SCREENING', 'INTERVIEW', 'SELECTED', 'REJECTED']).optional(),
      aiScore: z.coerce.number().int().min(0).max(100).optional().nullable(),
      skills: z.array(z.string()).optional(),
      summary: optionalText,
      resumeUrl: optionalText,
      notes: optionalText,
    }),
  },
  attendance: {
    model: 'attendance',
    read: [roles.HR_MANAGER, roles.EMPLOYEE],
    write: [roles.HR_MANAGER],
    include: { employee: { include: { department: true } } },
    orderBy: { date: 'desc' },
    schema: z.object({
      employeeId: uuid,
      date,
      checkIn: date.optional().nullable(),
      checkOut: date.optional().nullable(),
      status: z.enum(['PRESENT', 'LATE', 'ABSENT', 'REMOTE', 'ON_LEAVE']).optional(),
      workMinutes: z.coerce.number().int().nonnegative().optional(),
      overtimeMinutes: z.coerce.number().int().nonnegative().optional(),
      notes: optionalText,
    }),
  },
  leave: {
    model: 'leaveRequest',
    read: [roles.HR_MANAGER, roles.EMPLOYEE],
    write: [roles.HR_MANAGER, roles.EMPLOYEE],
    include: { employee: { include: { department: true } } },
    orderBy: { createdAt: 'desc' },
    schema: z.object({
      employeeId: uuid,
      type: z.enum(['CASUAL', 'SICK', 'EARNED', 'UNPAID']),
      startDate: date,
      endDate: date,
      days: z.coerce.number().positive(),
      reason: optionalText,
      status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
      reviewedBy: uuid.optional().nullable(),
      reviewedAt: date.optional().nullable(),
    }),
  },
  payroll: {
    model: 'payroll',
    read: [roles.HR_MANAGER, roles.EMPLOYEE],
    write: [roles.HR_MANAGER],
    include: { employee: { include: { department: true } } },
    orderBy: { periodEnd: 'desc' },
    schema: z.object({
      employeeId: uuid,
      periodStart: date,
      periodEnd: date,
      baseSalary: money,
      bonus: money.optional(),
      deductions: money.optional(),
      netPay: money,
      status: z.enum(['DRAFT', 'PROCESSING', 'PAID', 'FAILED']).optional(),
      paidAt: date.optional().nullable(),
      payslipUrl: optionalText,
    }),
  },
  reviews: {
    model: 'performanceReview',
    read: [roles.HR_MANAGER, roles.EMPLOYEE],
    write: [roles.HR_MANAGER],
    include: { employee: true, reviewer: true },
    orderBy: { createdAt: 'desc' },
    schema: z.object({
      employeeId: uuid,
      reviewerId: uuid.optional().nullable(),
      period: text,
      rating: z.coerce.number().min(0).max(5),
      goalsScore: z.coerce.number().min(0).max(100).optional().nullable(),
      feedback: optionalText,
      strengths: z.array(z.string()).optional(),
      improvements: z.array(z.string()).optional(),
      submittedAt: date.optional().nullable(),
    }),
  },
}

export function getResource(name) {
  return resourceConfig[name] || null
}

export function validateResource(config, payload, partial = false) {
  return (partial ? config.schema.partial() : config.schema).safeParse(payload)
}
