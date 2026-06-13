import { PrismaClient } from '@prisma/client'
import { printSeedEnvironmentError, validateSeedEnvironment } from './seed-preflight.mjs'

const prisma = new PrismaClient()
const organizationId = '11111111-1111-4111-8111-111111111111'

async function main() {
  validateSeedEnvironment()

  await prisma.organization.upsert({
    where: { id: organizationId },
    update: {
      settings: {
        workspace: { timezone: 'America/New_York', locale: 'en-US', currency: 'USD' },
        ai: { enabled: true, cacheEnabled: true, payrollContext: false },
      },
    },
    create: {
      id: organizationId,
      name: 'Acme Corporation',
      slug: 'acme-corporation',
      settings: {
        workspace: { timezone: 'America/New_York', locale: 'en-US', currency: 'USD' },
        ai: { enabled: true, cacheEnabled: true, payrollContext: false },
      },
    },
  })

  const departments = {}
  for (const name of ['Design', 'Engineering', 'People', 'Product', 'Marketing']) {
    departments[name] = await prisma.department.upsert({
      where: { organizationId_name: { organizationId, name } },
      update: {},
      create: { organizationId, name },
    })
  }

  const rows = [
    ['EMP-001', 'Sarah', 'Chen', 'sarah.chen@acme.test', 'Senior Product Designer', 'Design', 'ACTIVE', 98000],
    ['EMP-002', 'Marcus', 'Johnson', 'marcus.johnson@acme.test', 'Frontend Engineer', 'Engineering', 'ACTIVE', 112000],
    ['EMP-003', 'Elena', 'Rodriguez', 'elena.rodriguez@acme.test', 'People Operations Lead', 'People', 'REMOTE', 105000],
    ['EMP-004', 'David', 'Kim', 'david.kim@acme.test', 'Product Manager', 'Product', 'ACTIVE', 118000],
    ['EMP-005', 'Aisha', 'Patel', 'aisha.patel@acme.test', 'Growth Marketing Manager', 'Marketing', 'ON_LEAVE', 96000],
    ['EMP-006', 'Lucas', 'Martin', 'lucas.martin@acme.test', 'Talent Acquisition Partner', 'People', 'ACTIVE', 92000],
    ['EMP-007', 'Sophia', 'Turner', 'sophia.turner@acme.test', 'Technical Recruiter', 'People', 'ACTIVE', 90000],
    ['EMP-008', 'Omar', 'Hassan', 'omar.hassan@acme.test', 'Backend Engineer', 'Engineering', 'REMOTE', 116000],
    ['EMP-009', 'Grace', 'Lee', 'grace.lee@acme.test', 'Recruitment Coordinator', 'People', 'ACTIVE', 78000],
    ['EMP-010', 'Benjamin', 'Clark', 'benjamin.clark@acme.test', 'Product Recruiter', 'People', 'ACTIVE', 94000],
  ]
  const employees = []
  for (let index = 0; index < rows.length; index += 1) {
    const [employeeNumber, firstName, lastName, email, jobTitle, department, status, salary] = rows[index]
    employees.push(await prisma.employee.upsert({
      where: { organizationId_employeeNumber: { organizationId, employeeNumber } },
      update: {
        firstName, lastName, email, jobTitle, status, salary,
        departmentId: departments[department].id,
      },
      create: {
        organizationId, employeeNumber, firstName, lastName, email, jobTitle, status, salary,
        departmentId: departments[department].id,
        location: index === 2 ? 'Remote' : 'New York',
        joiningDate: new Date(Date.UTC(2022 + (index % 3), index + 1, 10 + index)),
      },
    }))
  }

  const demoUser = await prisma.user.upsert({
    where: { firebaseUid: process.env.FIREBASE_DEMO_UID },
    update: {
      preferences: {
        emailNotifications: true,
        inAppNotifications: true,
        weeklyDigest: true,
        theme: 'SYSTEM',
      },
    },
    create: {
      firebaseUid: process.env.FIREBASE_DEMO_UID,
      organizationId,
      email: 'elena.rodriguez@acme.test',
      fullName: 'Elena Rodriguez',
      role: 'HR_MANAGER',
      preferences: {
        emailNotifications: true,
        inAppNotifications: true,
        weeklyDigest: true,
        theme: 'SYSTEM',
      },
    },
  })
  await prisma.employee.update({
    where: { id: employees[2].id },
    data: { profileId: demoUser.id },
  })

  const recruiterIndexes = [0, 3, 5, 6, 8]
  for (let index = 0; index < recruiterIndexes.length; index += 1) {
    const employee = employees[recruiterIndexes[index]]
    const recruiter = await prisma.user.upsert({
      where: { firebaseUid: `seed:recruiter:${index + 1}` },
      update: {
        organizationId,
        email: employee.email,
        fullName: `${employee.firstName} ${employee.lastName}`,
        role: 'RECRUITER',
        preferences: {
          emailNotifications: true,
          inAppNotifications: true,
          weeklyDigest: false,
          theme: 'SYSTEM',
        },
      },
      create: {
        firebaseUid: `seed:recruiter:${index + 1}`,
        organizationId,
        email: employee.email,
        fullName: `${employee.firstName} ${employee.lastName}`,
        role: 'RECRUITER',
        preferences: {
          emailNotifications: true,
          inAppNotifications: true,
          weeklyDigest: false,
          theme: 'SYSTEM',
        },
      },
    })
    await prisma.employee.update({
      where: { id: employee.id },
      data: { profileId: recruiter.id },
    })
  }

  const jobSpecs = [
    ['Product Designer', 'Design', 2],
    ['Frontend Engineer', 'Engineering', 4],
    ['People Partner', 'People', 1],
    ['Data Analyst', 'Product', 2],
    ['Backend Engineer', 'Engineering', 3],
  ]
  const jobs = []
  for (const [title, department, openings] of jobSpecs) {
    const existing = await prisma.job.findFirst({ where: { organizationId, title } })
    jobs.push(existing
      ? await prisma.job.update({
          where: { id: existing.id },
          data: {
            departmentId: departments[department].id,
            description: `Join Acme Corporation as a ${title}.`,
            openings,
            status: 'OPEN',
          },
        })
      : await prisma.job.create({ data: {
        organizationId, departmentId: departments[department].id, title,
        description: `Join Acme Corporation as a ${title}.`,
        location: 'Hybrid', openings, status: 'OPEN', publishedAt: new Date(),
      } }))
  }

  const candidateRows = [
    ['Maya', 'Brooks', 'maya@example.test', 'APPLIED', 92, 0],
    ['Noah', 'Williams', 'noah@example.test', 'APPLIED', 86, 1],
    ['James', 'Liu', 'james@example.test', 'SCREENING', 96, 0],
    ['Priya', 'Nair', 'priya@example.test', 'SCREENING', 89, 3],
    ['Olivia', 'Smith', 'olivia@example.test', 'INTERVIEW', 94, 2],
    ['Ethan', 'Reed', 'ethan@example.test', 'INTERVIEW', 88, 1],
    ['Liam', 'Carter', 'liam@example.test', 'SELECTED', 98, 0],
    ['Amelia', 'Scott', 'amelia@example.test', 'APPLIED', 84, 3],
    ['Henry', 'Adams', 'henry@example.test', 'SCREENING', 91, 4],
    ['Isabella', 'Baker', 'isabella@example.test', 'INTERVIEW', 90, 1],
    ['Mateo', 'Gomez', 'mateo@example.test', 'APPLIED', 82, 4],
    ['Charlotte', 'Young', 'charlotte@example.test', 'SELECTED', 95, 2],
    ['Daniel', 'Wilson', 'daniel@example.test', 'SCREENING', 87, 3],
    ['Harper', 'Evans', 'harper@example.test', 'APPLIED', 85, 0],
    ['Alexander', 'Moore', 'alexander@example.test', 'INTERVIEW', 93, 4],
    ['Evelyn', 'King', 'evelyn@example.test', 'REJECTED', 64, 1],
    ['Sebastian', 'Hall', 'sebastian@example.test', 'SCREENING', 89, 2],
    ['Camila', 'Allen', 'camila@example.test', 'APPLIED', 88, 3],
    ['Jack', 'Wright', 'jack@example.test', 'INTERVIEW', 92, 0],
    ['Luna', 'Green', 'luna@example.test', 'APPLIED', 81, 1],
    ['Michael', 'Nelson', 'michael@example.test', 'SCREENING', 86, 4],
  ]
  for (const [firstName, lastName, email, stage, aiScore, jobIndex] of candidateRows) {
    await prisma.candidate.upsert({
      where: { organizationId_email_jobId: { organizationId, email, jobId: jobs[jobIndex].id } },
      update: { stage, aiScore, skills: ['Communication', 'Collaboration', 'Problem solving'] },
      create: {
        organizationId, jobId: jobs[jobIndex].id, firstName, lastName, email, stage, aiScore,
        skills: ['Communication', 'Collaboration', 'Problem solving'],
      },
    })
  }

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
    const date = new Date(today)
    date.setUTCDate(date.getUTCDate() - dayOffset)
    if ([0, 6].includes(date.getUTCDay())) continue
    for (let index = 0; index < employees.length; index += 1) {
      const onLeave = index === 4 && dayOffset < 3
      const late = !onLeave && (index + dayOffset) % 7 === 0
      await prisma.attendance.upsert({
        where: { employeeId_date: { employeeId: employees[index].id, date } },
        update: {
          status: onLeave ? 'ON_LEAVE' : late ? 'LATE' : 'PRESENT',
          workMinutes: onLeave ? 0 : late ? 450 : 480,
          overtimeMinutes: !onLeave && (index + dayOffset) % 5 === 0 ? 45 : 0,
        },
        create: {
          organizationId,
          employeeId: employees[index].id,
          date,
          status: onLeave ? 'ON_LEAVE' : late ? 'LATE' : 'PRESENT',
          workMinutes: onLeave ? 0 : late ? 450 : 480,
          overtimeMinutes: !onLeave && (index + dayOffset) % 5 === 0 ? 45 : 0,
        },
      })
    }
  }

  const periodStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
  const periodEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0))
  const payrollRecords = []
  for (const employee of employees) {
    const baseSalary = Number(employee.salary || 0) / 12
    const payroll = await prisma.payroll.upsert({
      where: { employeeId_periodStart_periodEnd: { employeeId: employee.id, periodStart, periodEnd } },
      update: {
        baseSalary,
        bonuses: 500,
        deductions: 175,
        netPay: baseSalary + 325,
        status: 'PAID',
        paidAt: new Date(),
      },
      create: {
        organizationId, employeeId: employee.id, periodStart, periodEnd,
        baseSalary, bonuses: 500, deductions: 175, netPay: baseSalary + 325,
        status: 'PAID', paidAt: new Date(),
      },
    })
    payrollRecords.push(payroll)
    await prisma.payrollItem.deleteMany({ where: { payrollId: payroll.id } })
    await prisma.payrollItem.createMany({
      data: [
        {
          organizationId,
          payrollId: payroll.id,
          employeeId: employee.id,
          type: 'EARNING',
          code: 'PERFORMANCE_BONUS',
          description: 'Monthly performance bonus',
          amount: 500,
          taxable: true,
        },
        {
          organizationId,
          payrollId: payroll.id,
          employeeId: employee.id,
          type: 'DEDUCTION',
          code: 'BENEFITS',
          description: 'Benefits contribution',
          amount: 175,
          taxable: false,
        },
      ],
    })
  }

  const leaveRows = [
    [0, 'CASUAL', -14, -13, 2, 'Family commitment', 'APPROVED'],
    [2, 'EARNED', 8, 10, 3, 'Planned vacation', 'PENDING'],
    [4, 'SICK', -2, 0, 3, 'Medical leave', 'APPROVED'],
    [6, 'CASUAL', 15, 15, 1, 'Personal appointment', 'PENDING'],
    [8, 'EARNED', 22, 23, 2, 'Family event', 'PENDING'],
  ]
  for (const [employeeIndex, type, startOffset, endOffset, days, reason, status] of leaveRows) {
    const startDate = new Date(today)
    startDate.setUTCDate(startDate.getUTCDate() + startOffset)
    const endDate = new Date(today)
    endDate.setUTCDate(endDate.getUTCDate() + endOffset)
    const existing = await prisma.leaveRequest.findFirst({
      where: { employeeId: employees[employeeIndex].id, startDate, endDate, type },
    })
    if (existing) {
      await prisma.leaveRequest.update({ where: { id: existing.id }, data: { days, reason, status } })
    } else {
      await prisma.leaveRequest.create({
        data: {
          organizationId,
          employeeId: employees[employeeIndex].id,
          type,
          startDate,
          endDate,
          days,
          reason,
          status,
          reviewedAt: status === 'APPROVED' ? new Date() : null,
        },
      })
    }
  }

  const defaultShift = await prisma.shift.upsert({
    where: { organizationId_name: { organizationId, name: 'Standard Shift' } },
    update: {},
    create: {
      organizationId,
      name: 'Standard Shift',
      timezone: 'America/New_York',
      startMinutes: 9 * 60,
      endMinutes: 17 * 60,
      breakMinutes: 30,
      graceMinutes: 10,
      overtimeAfterMinutes: 8 * 60,
      workingDays: [1, 2, 3, 4, 5],
    },
  })
  for (const employee of employees) {
    const existingAssignment = await prisma.employeeShift.findFirst({
      where: { organizationId, employeeId: employee.id, shiftId: defaultShift.id },
    })
    if (!existingAssignment) {
      await prisma.employeeShift.create({
        data: {
          organizationId,
          employeeId: employee.id,
          shiftId: defaultShift.id,
          effectiveFrom: new Date(Date.UTC(2026, 0, 1)),
        },
      })
    }
  }

  const policySpecs = [
    ['CASUAL', 'Casual Leave', 12, 1, 5],
    ['SICK', 'Sick Leave', 12, 1, 3],
    ['EARNED', 'Earned Leave', 18, 1.5, 10],
    ['UNPAID', 'Unpaid Leave', 0, 0, 0],
  ]
  for (const [type, name, annualAllowance, accrualPerMonth, maxCarryForward] of policySpecs) {
    const policy = await prisma.leavePolicy.upsert({
      where: { organizationId_type: { organizationId, type } },
      update: {},
      create: {
        organizationId,
        type,
        name,
        annualAllowance,
        accrualPerMonth,
        maxCarryForward,
        maxBalance: annualAllowance ? annualAllowance + maxCarryForward : null,
        approvalLevels: type === 'EARNED' ? 2 : 1,
      },
    })
    for (const employee of employees) {
      await prisma.leaveBalance.upsert({
        where: {
          employeeId_policyId_year: {
            employeeId: employee.id,
            policyId: policy.id,
            year: today.getUTCFullYear(),
          },
        },
        update: {},
        create: {
          organizationId,
          employeeId: employee.id,
          policyId: policy.id,
          year: today.getUTCFullYear(),
          openingBalance: annualAllowance,
        },
      })
    }
  }

  const holidayRows = [
    ['Company Foundation Day', 15, 7, false],
    ['Year-end Holiday', 24, 11, false],
    ['Community Service Day', 18, 8, true],
  ]
  for (const [name, day, month, isOptional] of holidayRows) {
    const date = new Date(Date.UTC(today.getUTCFullYear(), month, day))
    await prisma.holiday.upsert({
      where: { organizationId_date_name: { organizationId, date, name } },
      update: { isOptional, location: 'All offices' },
      create: { organizationId, name, date, isOptional, location: 'All offices' },
    })
  }

  for (let index = 0; index < Math.min(employees.length, 6); index += 1) {
    const period = `${today.getUTCFullYear()} H1`
    const existingReview = await prisma.performanceReview.findFirst({
      where: { organizationId, employeeId: employees[index].id, period },
    })
    const reviewData = {
      reviewerId: employees[2].id,
      rating: 3.8 + (index % 3) * 0.35,
      goalsScore: 78 + index * 3,
      feedback: 'Strong contribution with consistent collaboration and measurable progress.',
      strengths: ['Collaboration', 'Ownership', 'Communication'],
      improvements: ['Delegation', 'Long-term planning'],
      submittedAt: new Date(),
    }
    if (existingReview) {
      await prisma.performanceReview.update({ where: { id: existingReview.id }, data: reviewData })
    } else {
      await prisma.performanceReview.create({
        data: {
          organizationId,
          employeeId: employees[index].id,
          period,
          ...reviewData,
        },
      })
    }
  }

  const demoNotifications = [
    ['WELCOME', 'Welcome to HRFlow AI', 'Your demo workspace is ready for testing.', 'READ'],
    ['LEAVE_APPROVAL', 'Leave request needs review', 'A pending earned leave request is waiting for approval.', 'SENT'],
    ['PAYROLL_COMPLETE', 'Payroll completed', `${payrollRecords.length} demo payslips are ready to review.`, 'SENT'],
    ['RECRUITMENT', 'Candidate pipeline updated', 'New candidates are available for AI ranking.', 'SENT'],
  ]
  for (const [type, title, body, status] of demoNotifications) {
    const existing = await prisma.notification.findFirst({
      where: { organizationId, recipientId: demoUser.id, type, title },
    })
    const notificationData = {
      channel: 'IN_APP',
      body,
      status,
      sentAt: new Date(),
      readAt: status === 'READ' ? new Date() : null,
      data: { demo: true },
    }
    if (existing) {
      await prisma.notification.update({ where: { id: existing.id }, data: notificationData })
    } else {
      await prisma.notification.create({
        data: {
          organizationId,
          recipientId: demoUser.id,
          type,
          title,
          ...notificationData,
        },
      })
    }
  }

  const reminder = await prisma.scheduledReminder.findFirst({
    where: { organizationId, type: 'WEEKLY_DIGEST' },
  })
  const reminderData = {
    schedule: '0 8 * * 1',
    nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    payload: {
      title: 'Weekly HR digest',
      body: 'Review attendance, leave, payroll, and recruitment highlights.',
      roles: ['HR_MANAGER'],
      email: false,
      demo: true,
    },
    isActive: true,
  }
  if (reminder) {
    await prisma.scheduledReminder.update({ where: { id: reminder.id }, data: reminderData })
  } else {
    await prisma.scheduledReminder.create({
      data: { organizationId, type: 'WEEKLY_DIGEST', ...reminderData },
    })
  }
}

main()
  .then(() => console.log('HRFlow seed data created.'))
  .catch((error) => {
    if (error.code === 'SEED_ENV_MISSING') printSeedEnvironmentError(error)
    else console.error('[SEED ERROR]', error.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
