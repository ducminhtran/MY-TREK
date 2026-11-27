import { describe, expect, it } from 'vitest'
import {
  countDaysInclusive,
  currencyDecimals,
  formatDate,
  formatDateWithWeekday,
  formatMoney,
  formatTime,
  parseLocalDate,
  toISODate,
  toSafeFileName,
} from './format'

// Intl dùng khoảng trắng không ngắt (U+00A0 / U+202F) → chuẩn hóa trước khi so sánh
const norm = (s: string) => s.replace(/[  ]/g, ' ')

describe('ngày', () => {
  it('parse YYYY-MM-DD theo giờ địa phương, không lệch ngày', () => {
    const d = parseLocalDate('2026-12-19')
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getMonth()).toBe(11)
    expect(d?.getDate()).toBe(19)
    expect(toISODate(d as Date)).toBe('2026-12-19')
  })

  it('từ chối ngày sai', () => {
    expect(parseLocalDate('2026-02-30')).toBeNull()
    expect(parseLocalDate('19/12/2026')).toBeNull()
  })

  it('định dạng dd/MM/yyyy và có thứ', () => {
    expect(formatDate('2026-12-05')).toBe('05/12/2026')
    expect(formatDateWithWeekday('2026-12-19')).toBe('T7, 19/12/2026')
    expect(formatDateWithWeekday('2026-12-20')).toBe('CN, 20/12/2026')
    expect(formatDateWithWeekday('2026-12-21')).toBe('T2, 21/12/2026')
  })

  it('đếm số ngày gồm cả 2 đầu', () => {
    expect(countDaysInclusive('2026-12-19', '2026-12-19')).toBe(1)
    expect(countDaysInclusive('2026-12-19', '2026-12-21')).toBe(3)
    expect(countDaysInclusive('2026-03-28', '2026-04-02')).toBe(6)
  })

  it('giờ HH:mm', () => {
    expect(formatTime('08:30:00')).toBe('08:30')
    expect(formatTime(null)).toBe('')
  })
})

describe('tiền', () => {
  it('số lẻ theo tiền tệ (KT-13)', () => {
    expect(currencyDecimals('VND')).toBe(0)
    expect(currencyDecimals('USD')).toBe(2)
    expect(currencyDecimals('JPY')).toBe(0)
  })

  it('định dạng kiểu Việt Nam', () => {
    const vnd = norm(formatMoney(1250000, 'VND'))
    expect(vnd).toContain('1.250.000')
    expect(vnd).toContain('₫')
    expect(norm(formatMoney(10.5, 'USD'))).toContain('10,50')
  })
})

describe('tên file (KT-11)', () => {
  it('bỏ dấu, chữ thường, giữ đuôi', () => {
    expect(toSafeFileName('Hóa đơn Khách sạn (1).PDF')).toBe('hoa-don-khach-san-1.pdf')
    expect(toSafeFileName('Đà Lạt.jpg')).toBe('da-lat.jpg')
  })

  it('tên rỗng hoặc không có đuôi', () => {
    expect(toSafeFileName('???.png')).toBe('file.png')
    expect(toSafeFileName('ghi chú')).toBe('ghi-chu')
  })
})
