import { describe, expect, it } from 'vitest'
import { parseNumberInput } from './format'
import {
  buildInvitationText,
  formatDateRange,
  groupTripsByPhase,
  memberState,
  tripPhase,
  validateTripInput,
} from './trips'
import type { TripInput } from '../types'

describe('tripPhase / groupTripsByPhase (TRIP-01)', () => {
  it('phân loại theo ngày hôm nay', () => {
    expect(tripPhase('2026-12-19', '2026-12-21', '2026-12-18')).toBe('upcoming')
    expect(tripPhase('2026-12-19', '2026-12-21', '2026-12-19')).toBe('ongoing')
    expect(tripPhase('2026-12-19', '2026-12-21', '2026-12-21')).toBe('ongoing')
    expect(tripPhase('2026-12-19', '2026-12-21', '2026-12-22')).toBe('past')
  })

  it('nhóm và sắp xếp', () => {
    const trips = [
      { id: 'a', start_date: '2026-01-01', end_date: '2026-01-03' },
      { id: 'b', start_date: '2026-05-01', end_date: '2026-05-03' },
      { id: 'c', start_date: '2026-12-01', end_date: '2026-12-30' },
      { id: 'd', start_date: '2027-03-01', end_date: '2027-03-02' },
      { id: 'e', start_date: '2027-01-01', end_date: '2027-01-02' },
    ]
    const g = groupTripsByPhase(trips, '2026-12-10')
    expect(g.ongoing.map((t) => t.id)).toEqual(['c'])
    expect(g.upcoming.map((t) => t.id)).toEqual(['e', 'd'])
    expect(g.past.map((t) => t.id)).toEqual(['b', 'a'])
  })
})

describe('formatDateRange', () => {
  it('cùng năm / khác năm / 1 ngày', () => {
    expect(formatDateRange('2026-12-19', '2026-12-21')).toBe('19-12 → 21-12-2026')
    expect(formatDateRange('2026-12-30', '2027-01-02')).toBe('30-12-2026 → 02-01-2027')
    expect(formatDateRange('2026-12-19', '2026-12-19')).toBe('19-12-2026')
  })
})

describe('memberState (MEM-01)', () => {
  it('đã tham gia / đang chờ / không dùng app', () => {
    expect(memberState({ user_id: 'u', status: 'active' })).toBe('joined')
    expect(memberState({ user_id: null, status: 'invited' })).toBe('invited')
    expect(memberState({ user_id: null, status: 'active' })).toBe('offline')
  })
})

describe('buildInvitationText (MEM-04)', () => {
  it('có link, email, vai trò', () => {
    const text = buildInvitationText({
      tripName: 'Đà Lạt', start: '2026-12-19', end: '2026-12-21',
      email: 'b@example.com', role: 'editor', appLink: 'https://x.github.io/MY-TREK/',
    })
    expect(text).toContain('"Đà Lạt"')
    expect(text).toContain('https://x.github.io/MY-TREK/')
    expect(text).toContain('b@example.com')
    expect(text).toContain('Được chỉnh sửa')
  })
})

describe('validateTripInput (TRIP-02, BR-01)', () => {
  const base: TripInput = {
    name: 'Đà Lạt', destination: '', start_date: '2026-12-19', end_date: '2026-12-21',
    base_currency: 'VND', budget: null, description: '',
  }

  it('hợp lệ', () => {
    expect(validateTripInput(base)).toEqual({})
  })

  it('bắt lỗi', () => {
    expect(validateTripInput({ ...base, name: '  ' }).name).toBeDefined()
    expect(validateTripInput({ ...base, end_date: '2026-12-18' }).end_date).toBeDefined()
    expect(validateTripInput({ ...base, end_date: '2027-12-19' }).end_date).toContain('365')
    expect(validateTripInput({ ...base, end_date: '2027-12-18' }).end_date).toBeUndefined()
    expect(validateTripInput({ ...base, budget: -1 }).budget).toBeDefined()
    expect(validateTripInput({ ...base, budget: Number.NaN }).budget).toBeDefined()
    expect(validateTripInput({ ...base, start_date: '' }).start_date).toContain('Vui lòng')
    expect(validateTripInput({ ...base, start_date: '31-02-2026' }).start_date).toContain('không hợp lệ')
  })
})

describe('parseNumberInput', () => {
  it('kiểu Việt Nam và kiểu máy', () => {
    expect(parseNumberInput('25.400')).toBe(25400)
    expect(parseNumberInput('1.250.000')).toBe(1250000)
    expect(parseNumberInput('25.400,5')).toBe(25400.5)
    expect(parseNumberInput('1,5')).toBe(1.5)
    expect(parseNumberInput('1.5')).toBe(1.5)
    expect(parseNumberInput('25400')).toBe(25400)
    expect(parseNumberInput(' ')).toBeNull()
    expect(parseNumberInput('abc')).toBeNaN()
  })
})
