import { describe, expect, it, vi } from 'vitest'
import {
  calculateAttendance,
  closeAttendance,
  getEmployeeShift,
  localDateTimeToUtc,
  minutesBetween,
} from '@/lib/domain/attendance'

describe('attendance engine', () => {
  it('calculates elapsed minutes safely', () => {
    expect(minutesBetween('2026-01-01T09:00:00Z', '2026-01-01T17:00:00Z')).toBe(480)
    expect(minutesBetween(null, new Date())).toBe(0)
    expect(minutesBetween('2026-01-01T17:00:00Z', '2026-01-01T09:00:00Z')).toBe(0)
  })

  it('calculates work, overtime, and on-time status', () => {
    expect(calculateAttendance({
      checkIn: '2026-01-01T09:05:00Z',
      checkOut: '2026-01-01T18:05:00Z',
      scheduledStart: '2026-01-01T09:00:00Z',
      breakMinutes: 30,
      graceMinutes: 10,
      overtimeAfterMinutes: 480,
    })).toEqual({ workMinutes: 510, overtimeMinutes: 30, status: 'PRESENT' })
  })

  it('marks late arrivals and normalizes negative inputs', () => {
    expect(calculateAttendance({
      checkIn: '2026-01-01T09:11:00Z',
      checkOut: '2026-01-01T09:05:00Z',
      scheduledStart: '2026-01-01T09:00:00Z',
      breakMinutes: -5,
      graceMinutes: 10,
      overtimeAfterMinutes: -1,
    })).toEqual({ workMinutes: 0, overtimeMinutes: 0, status: 'LATE' })
  })

  it('converts local shift time to UTC', () => {
    const utc = localDateTimeToUtc(new Date('2026-01-15T00:00:00Z'), 9 * 60, 'America/New_York')
    expect(utc.toISOString()).toBe('2026-01-15T14:00:00.000Z')
  })

  it('queries the effective shift assignment', async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: 'assignment' })
    await expect(getEmployeeShift({ employeeShift: { findFirst } }, 'org', 'emp', new Date())).resolves.toEqual({ id: 'assignment' })
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: 'org', employeeId: 'emp' }),
    }))
  })

  it('closes attendance using an assigned shift', async () => {
    const prisma = {
      attendance: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'att', date: new Date('2026-01-15T00:00:00Z'), checkIn: new Date('2026-01-15T14:00:00Z'),
        }),
        update: vi.fn().mockImplementation(({ data }) => ({ id: 'att', ...data })),
      },
      employeeShift: {
        findFirst: vi.fn().mockResolvedValue({
          shift: { startMinutes: 540, timezone: 'America/New_York', breakMinutes: 30, graceMinutes: 10, overtimeAfterMinutes: 480 },
        }),
      },
    }
    const result = await closeAttendance({
      organizationId: 'org',
      employeeId: 'emp',
      attendanceId: 'att',
      checkOut: new Date('2026-01-15T23:00:00Z'),
      prisma,
    })
    expect(result.workMinutes).toBe(510)
    expect(result.overtimeMinutes).toBe(30)
  })

  it('uses default shift and rejects missing check-in', async () => {
    const prisma = {
      attendance: {
        findFirst: vi.fn()
          .mockResolvedValueOnce({ id: 'att', date: new Date('2026-01-15T00:00:00Z'), checkIn: new Date('2026-01-15T09:00:00Z') })
          .mockResolvedValueOnce(null),
        update: vi.fn().mockImplementation(({ data }) => data),
      },
      employeeShift: { findFirst: vi.fn().mockResolvedValue(null) },
    }
    await expect(closeAttendance({
      organizationId: 'org', employeeId: 'emp', attendanceId: 'att',
      checkOut: new Date('2026-01-15T17:00:00Z'), prisma,
    })).resolves.toMatchObject({ workMinutes: 480 })
    await expect(closeAttendance({
      organizationId: 'org', employeeId: 'emp', attendanceId: 'missing',
      checkOut: new Date(), prisma,
    })).rejects.toThrow('Open attendance')
  })
})
