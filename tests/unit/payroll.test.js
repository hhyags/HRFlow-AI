import { describe, expect, it } from 'vitest'
import {
  calculatePayroll,
  countWorkingDays,
  createPayslipPdf,
  payrollToCsv,
  prorateMonthlySalary,
} from '@/lib/domain/payroll'

describe('payroll engine', () => {
  it('prorates salary and handles zero working days', () => {
    expect(prorateMonthlySalary(3000, 10, 20)).toBe(1500)
    expect(prorateMonthlySalary(3000, 10, 0)).toBe(0)
  })

  it('calculates earnings, overtime, deductions, and net pay', () => {
    expect(calculatePayroll({
      monthlySalary: 3000,
      payableDays: 20,
      totalWorkingDays: 20,
      overtimeMinutes: 120,
      overtimeHourlyRate: 20,
      bonuses: [{ amount: 100 }],
      deductions: [{ amount: 250 }],
    })).toEqual({
      baseSalary: 3000,
      overtimePay: 40,
      bonusTotal: 100,
      deductionTotal: 250,
      grossPay: 3140,
      netPay: 2890,
    })
  })

  it('never produces a negative net payment', () => {
    expect(calculatePayroll({
      monthlySalary: 100, payableDays: 1, totalWorkingDays: 1, deductions: [{ amount: 500 }],
    }).netPay).toBe(0)
    expect(calculatePayroll({ monthlySalary: null, payableDays: -1, totalWorkingDays: 1 })).toEqual({
      baseSalary: 0,
      overtimePay: 0,
      bonusTotal: 0,
      deductionTotal: 0,
      grossPay: 0,
      netPay: 0,
    })
  })

  it('counts working days excluding weekends and holidays', () => {
    expect(countWorkingDays('2026-06-01', '2026-06-07', ['2026-06-03'])).toBe(4)
  })

  it('creates a valid payslip PDF', async () => {
    const pdf = await createPayslipPdf({
      organization: { name: 'Acme' },
      employee: { firstName: 'A', lastName: 'B', employeeNumber: 'E1', jobTitle: 'Engineer' },
      payroll: {
        periodStart: new Date('2026-06-01'), periodEnd: new Date('2026-06-30'),
        baseSalary: 1000, netPay: 1100,
      },
      items: [
        { type: 'EARNING', description: 'Bonus', amount: 200 },
        { type: 'DEDUCTION', description: 'Tax', amount: 100 },
      ],
    })
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF')
    expect(pdf.length).toBeGreaterThan(500)
  })

  it('exports escaped payroll CSV', () => {
    const csv = payrollToCsv([{
      employee: { employeeNumber: 'E1', firstName: 'A', lastName: 'B, Jr.' },
      periodStart: new Date('2026-06-01'), periodEnd: new Date('2026-06-30'),
      baseSalary: 1000, bonus: 100, deductions: 50, netPay: 1050, status: 'PAID',
    }])
    expect(csv).toContain('"A B, Jr."')
    expect(csv.split('\n')).toHaveLength(2)
    expect(payrollToCsv([])).toBe('employee_number,employee_name,period_start,period_end,base_salary,bonus,deductions,net_pay,status')
  })
})
