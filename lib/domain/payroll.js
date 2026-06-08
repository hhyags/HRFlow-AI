import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export function prorateMonthlySalary(monthlySalary, payableDays, totalWorkingDays) {
  if (totalWorkingDays <= 0) return 0
  return Number(monthlySalary || 0) * Math.max(0, payableDays) / totalWorkingDays
}

export function calculatePayroll({
  monthlySalary,
  payableDays,
  totalWorkingDays,
  overtimeMinutes = 0,
  overtimeHourlyRate = 0,
  bonuses = [],
  deductions = [],
}) {
  const baseSalary = prorateMonthlySalary(monthlySalary, payableDays, totalWorkingDays)
  const overtimePay = (Math.max(0, overtimeMinutes) / 60) * Math.max(0, overtimeHourlyRate)
  const bonusTotal = bonuses.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const deductionTotal = deductions.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const grossPay = baseSalary + overtimePay + bonusTotal
  const netPay = Math.max(0, grossPay - deductionTotal)
  return { baseSalary, overtimePay, bonusTotal, deductionTotal, grossPay, netPay }
}

export function countWorkingDays(startDate, endDate, holidays = []) {
  const holidaySet = new Set(holidays.map((date) => new Date(date).toISOString().slice(0, 10)))
  let total = 0
  for (let cursor = new Date(startDate); cursor <= new Date(endDate); cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const day = cursor.getUTCDay()
    if (day !== 0 && day !== 6 && !holidaySet.has(cursor.toISOString().slice(0, 10))) total += 1
  }
  return total
}

function currency(value, code = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(Number(value || 0))
}

export async function createPayslipPdf({ organization, payroll, employee, items, currencyCode = 'USD' }) {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([612, 792])
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const indigo = rgb(79 / 255, 70 / 255, 229 / 255)
  const slate = rgb(15 / 255, 23 / 255, 42 / 255)
  const muted = rgb(100 / 255, 116 / 255, 139 / 255)

  page.drawRectangle({ x: 0, y: 712, width: 612, height: 80, color: indigo })
  page.drawText('HRFlow AI', { x: 42, y: 752, size: 22, font: bold, color: rgb(1, 1, 1) })
  page.drawText('PAYSLIP', { x: 475, y: 752, size: 15, font: bold, color: rgb(1, 1, 1) })
  page.drawText(organization.name, { x: 42, y: 726, size: 10, font: regular, color: rgb(1, 1, 1) })

  const fullName = `${employee.firstName} ${employee.lastName}`
  page.drawText(fullName, { x: 42, y: 672, size: 17, font: bold, color: slate })
  page.drawText(`${employee.employeeNumber} | ${employee.jobTitle}`, { x: 42, y: 651, size: 10, font: regular, color: muted })
  page.drawText(`Pay period: ${payroll.periodStart.toISOString().slice(0, 10)} to ${payroll.periodEnd.toISOString().slice(0, 10)}`, { x: 42, y: 620, size: 10, font: regular, color: slate })

  page.drawText('Earnings', { x: 42, y: 574, size: 13, font: bold, color: slate })
  page.drawText('Deductions', { x: 330, y: 574, size: 13, font: bold, color: slate })
  let earningY = 548
  let deductionY = 548
  const rows = [
    { type: 'EARNING', description: 'Base salary', amount: payroll.baseSalary },
    ...items,
  ]
  for (const item of rows) {
    const isEarning = item.type === 'EARNING'
    const x = isEarning ? 42 : 330
    const y = isEarning ? earningY : deductionY
    page.drawText(item.description, { x, y, size: 9, font: regular, color: slate })
    page.drawText(currency(item.amount, currencyCode), { x: x + 160, y, size: 9, font: regular, color: slate })
    if (isEarning) earningY -= 22
    else deductionY -= 22
  }

  page.drawRectangle({ x: 42, y: 185, width: 528, height: 84, color: rgb(245 / 255, 247 / 255, 255 / 255) })
  page.drawText('NET PAY', { x: 62, y: 233, size: 11, font: bold, color: muted })
  page.drawText(currency(payroll.netPay, currencyCode), { x: 62, y: 204, size: 24, font: bold, color: indigo })
  page.drawText('This is a system-generated payslip.', { x: 42, y: 72, size: 8, font: regular, color: muted })
  return Buffer.from(await pdf.save())
}

export function payrollToCsv(rows) {
  const headers = ['employee_number', 'employee_name', 'period_start', 'period_end', 'base_salary', 'bonus', 'deductions', 'net_pay', 'status']
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  return [
    headers.join(','),
    ...rows.map((row) => [
      row.employee.employeeNumber,
      `${row.employee.firstName} ${row.employee.lastName}`,
      row.periodStart.toISOString().slice(0, 10),
      row.periodEnd.toISOString().slice(0, 10),
      row.baseSalary,
      row.bonus,
      row.deductions,
      row.netPay,
      row.status,
    ].map(escape).join(',')),
  ].join('\n')
}
