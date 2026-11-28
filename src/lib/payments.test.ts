import { describe, expect, it } from 'vitest'
import { paidAmount, paymentStatus, remainingAmount, summarizeSpending, upcomingDues } from './payments'

const exp = (amount: number, payments: number[], extra: Partial<{ currency: string; exchange_rate: number; amount_base: number; due_date: string | null }> = {}) => ({
  amount,
  currency: extra.currency ?? 'VND',
  exchange_rate: extra.exchange_rate ?? 1,
  amount_base: extra.amount_base ?? amount * (extra.exchange_rate ?? 1),
  due_date: extra.due_date ?? null,
  payments: payments.map((p) => ({ amount: p })),
})

describe('trạng thái thanh toán', () => {
  it('chưa trả / đã cọc / đã trả đủ', () => {
    expect(paymentStatus(exp(5000000, []))).toBe('unpaid')
    expect(paymentStatus(exp(5000000, [1000000]))).toBe('partial')
    expect(paymentStatus(exp(5000000, [1000000, 4000000]))).toBe('paid')
  })

  it('số đã trả / còn lại, USD theo cent', () => {
    const e = exp(10.5, [3.33, 3.34], { currency: 'USD', exchange_rate: 25400, amount_base: 266700 })
    expect(paidAmount(e)).toBe(6.67)
    expect(remainingAmount(e)).toBe(3.83)
  })
})

describe('summarizeSpending (4a)', () => {
  it('tổng = đã chi + còn phải trả', () => {
    const s = summarizeSpending([
      exp(5000000, [1000000]),
      exp(300000, [300000]),
      exp(600000, []),
    ], 'VND')
    expect(s).toEqual({ committed: 5900000, paid: 1300000, remaining: 4600000 })
  })

  it('ngoại tệ quy đổi theo tỷ giá của khoản chi', () => {
    const s = summarizeSpending([exp(100, [40], { currency: 'USD', exchange_rate: 25400, amount_base: 2540000 })], 'VND')
    expect(s).toEqual({ committed: 2540000, paid: 1016000, remaining: 1524000 })
  })
})

describe('upcomingDues', () => {
  it('chỉ khoản còn nợ; quá hạn lên đầu; không hạn xếp cuối', () => {
    const a = exp(100, [], { due_date: null })
    const b = exp(200, [50], { due_date: '2026-12-25' })
    const c = exp(300, [300], { due_date: '2026-12-01' })
    const d = exp(400, [100], { due_date: '2026-12-10' })
    const list = upcomingDues([a, b, c, d], 'VND', '2026-12-15')
    expect(list.map((x) => x.expense)).toEqual([d, b, a])
    expect(list[0]).toMatchObject({ remaining: 300, overdue: true })
    expect(list[1].overdue).toBe(false)
  })
})
