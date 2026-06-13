import { PrismaClient } from '@prisma/client'
import nextEnv from '@next/env'

nextEnv.loadEnvConfig(process.cwd())

const prisma = new PrismaClient()
const organizationId = process.env.HRFLOW_VALIDATION_ORGANIZATION_ID
  || '11111111-1111-4111-8111-111111111111'

const minimums = {
  employees: 10,
  recruiters: 5,
  departments: 5,
  candidates: 20,
  activeJobs: 5,
  attendance: 10,
  leaveRequests: 5,
  payroll: 10,
}

async function main() {
  const [
    employees,
    recruiters,
    departments,
    candidates,
    activeJobs,
    attendance,
    leaveRequests,
    payroll,
    crossTenantEmployeeDepartments,
    policies,
  ] = await Promise.all([
    prisma.employee.count({ where: { organizationId } }),
    prisma.user.count({ where: { organizationId, role: 'RECRUITER' } }),
    prisma.department.count({ where: { organizationId } }),
    prisma.candidate.count({ where: { organizationId } }),
    prisma.job.count({ where: { organizationId, status: 'OPEN' } }),
    prisma.attendance.count({ where: { organizationId } }),
    prisma.leaveRequest.count({ where: { organizationId } }),
    prisma.payroll.count({ where: { organizationId } }),
    prisma.employee.count({
      where: {
        organizationId,
        departmentId: { not: null },
        department: { organizationId: { not: organizationId } },
      },
    }),
    prisma.$queryRaw`
      SELECT tablename, policyname
      FROM pg_policies
      WHERE schemaname = 'public'
    `,
  ])

  const counts = {
    employees,
    recruiters,
    departments,
    candidates,
    activeJobs,
    attendance,
    leaveRequests,
    payroll,
  }
  const failures = Object.entries(minimums)
    .filter(([name, minimum]) => counts[name] < minimum)
    .map(([name, minimum]) => `${name}: expected at least ${minimum}, found ${counts[name]}`)

  const requiredPolicyTables = [
    'organizations',
    'users',
    'employees',
    'jobs',
    'candidates',
    'attendance',
    'leave_requests',
    'payroll',
    'documents',
    'organization_invites',
  ]
  const policyTables = new Set(policies.map((policy) => policy.tablename))
  for (const table of requiredPolicyTables) {
    if (!policyTables.has(table)) failures.push(`RLS policy missing for ${table}`)
  }
  if (crossTenantEmployeeDepartments) {
    failures.push(`${crossTenantEmployeeDepartments} employees have cross-organization department relationships`)
  }

  if (failures.length) {
    console.error(`Production data validation failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`)
    process.exitCode = 1
    return
  }

  console.log(JSON.stringify({
    status: 'ok',
    organizationId,
    counts,
    rlsPolicyCount: policies.length,
    integrity: { crossTenantEmployeeDepartments },
  }, null, 2))
}

main()
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
