import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const organizationId = '11111111-1111-4111-8111-111111111111'

async function main() {
  await prisma.organization.upsert({
    where: { id: organizationId },
    update: {},
    create: { id: organizationId, name: 'Acme Corporation', slug: 'acme-corporation' },
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
  ]
  const employees = []
  for (let index = 0; index < rows.length; index += 1) {
    const [employeeNumber, firstName, lastName, email, jobTitle, department, status, salary] = rows[index]
    employees.push(await prisma.employee.upsert({
      where: { organizationId_employeeNumber: { organizationId, employeeNumber } },
      update: {},
      create: {
        organizationId, employeeNumber, firstName, lastName, email, jobTitle, status, salary,
        departmentId: departments[department].id,
        location: index === 2 ? 'Remote' : 'New York',
        joiningDate: new Date(Date.UTC(2022 + (index % 3), index + 1, 10 + index)),
      },
    }))
  }

  const jobSpecs = [
    ['Product Designer', 'Design', 2],
    ['Frontend Engineer', 'Engineering', 4],
    ['People Partner', 'People', 1],
    ['Data Analyst', 'Product', 2],
  ]
  const jobs = []
  for (const [title, department, openings] of jobSpecs) {
    const existing = await prisma.job.findFirst({ where: { organizationId, title } })
    jobs.push(existing || await prisma.job.create({
      data: {
        organizationId, departmentId: departments[department].id, title,
        description: `Join Acme Corporation as a ${title}.`,
        location: 'Hybrid', openings, status: 'OPEN', publishedAt: new Date(),
      },
    }))
  }

  const candidateRows = [
    ['Maya', 'Brooks', 'maya@example.test', 'APPLIED', 92, 0],
    ['Noah', 'Williams', 'noah@example.test', 'APPLIED', 86, 1],
    ['James', 'Liu', 'james@example.test', 'SCREENING', 96, 0],
    ['Priya', 'Nair', 'priya@example.test', 'SCREENING', 89, 3],
    ['Olivia', 'Smith', 'olivia@example.test', 'INTERVIEW', 94, 2],
    ['Ethan', 'Reed', 'ethan@example.test', 'INTERVIEW', 88, 1],
    ['Liam', 'Carter', 'liam@example.test', 'SELECTED', 98, 0],
  ]
  for (const [firstName, lastName, email, stage, aiScore, jobIndex] of candidateRows) {
    await prisma.candidate.upsert({
      where: { organizationId_email_jobId: { organizationId, email, jobId: jobs[jobIndex].id } },
      update: {},
      create: {
        organizationId, jobId: jobs[jobIndex].id, firstName, lastName, email, stage, aiScore,
        skills: ['Communication', 'Collaboration', 'Problem solving'],
      },
    })
  }

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  for (let index = 0; index < employees.length; index += 1) {
    await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: employees[index].id, date: today } },
      update: {},
      create: {
        organizationId, employeeId: employees[index].id, date: today,
        status: index === 4 ? 'ON_LEAVE' : index === 3 ? 'LATE' : 'PRESENT',
        workMinutes: index === 4 ? 0 : 480,
      },
    })
  }

  const periodStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
  const periodEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0))
  for (const employee of employees) {
    const baseSalary = Number(employee.salary || 0) / 12
    await prisma.payroll.upsert({
      where: { employeeId_periodStart_periodEnd: { employeeId: employee.id, periodStart, periodEnd } },
      update: {},
      create: {
        organizationId, employeeId: employee.id, periodStart, periodEnd,
        baseSalary, netPay: baseSalary, status: 'PAID', paidAt: new Date(),
      },
    })
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
            year: 2026,
          },
        },
        update: {},
        create: {
          organizationId,
          employeeId: employee.id,
          policyId: policy.id,
          year: 2026,
          openingBalance: annualAllowance,
        },
      })
    }
  }
}

main()
  .then(() => console.log('HRFlow seed data created.'))
  .finally(() => prisma.$disconnect())
