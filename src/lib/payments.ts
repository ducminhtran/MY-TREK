/**
 * Đặt cọc / thanh toán nhiều đợt (quyết định 1a 3a 4a – 28/11/2026).
 * Tính theo đơn vị nhỏ nhất (KT-13). 1 tỷ giá chung cho cả khoản chi.
 */
import { fromMinor, minorFactor, toMinor } from './split'

export type PaymentStatus = 'unpaid' | 'partial' | 'paid'

type PayLike = { amount: number }
type ExpenseLike = {
  amount: number
  currency: string
  exchange_rate: number
  amount_base: number
  due_date: string | null
  payments: PayLike[]
}

/** Số đã trả (nguyên tệ) */
export function paidAmount(e: { currency: string; payments: PayLike[] }): number {
  return fromMinor(e.payments.reduce((s, p) => s + toMinor(p.amount, e.currency), 0), e.currency)
}

/** Số còn phải trả (nguyên tệ), không âm */
export function remainingAmount(e: { amount: number; currency: string; payments: PayLike[] }): number {
  const rest = toMinor(e.amount, e.currency) - toMinor(paidAmount(e), e.currency)
  return fromMinor(Math.max(0, rest), e.currency)
}

export function paymentStatus(e: { amount: number; currency: string; payments: PayLike[] }): PaymentStatus {
  const paid = toMinor(paidAmount(e), e.currency)
  if (paid <= 0) return 'unpaid'
  return paid >= toMinor(e.amount, e.currency) ? 'paid' : 'partial'
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Chưa trả',
  partial: 'Đã cọc',
  paid: 'Đã trả đủ',
}

/** Còn phải trả của 1 khoản, quy về đơn vị nhỏ nhất của tiền tệ gốc (không vượt tổng) */
function remainingBaseMinor(e: ExpenseLike, baseCurrency: string): number {
  const committed = Math.round(e.amount_base * minorFactor(baseCurrency))
  if (paymentStatus(e) === 'paid') return 0
  const rest = Math.round(remainingAmount(e) * e.exchange_rate * minorFactor(baseCurrency))
  return Math.min(rest, committed)
}

export type SpendingSummary = {
  /** Tổng chi phí cam kết (tiền tệ gốc) */
  committed: number
  /** Đã thực chi */
  paid: number
  /** Còn phải trả */
  remaining: number
}

/** EXP-06 mở rộng: Tổng chi phí = Đã thực chi + Còn phải trả (luôn khớp, tính bằng số nguyên) */
export function summarizeSpending(expenses: ExpenseLike[], baseCurrency: string): SpendingSummary {
  const f = minorFactor(baseCurrency)
  let committed = 0
  let remaining = 0
  for (const e of expenses) {
    committed += Math.round(e.amount_base * f)
    remaining += remainingBaseMinor(e, baseCurrency)
  }
  return { committed: committed / f, paid: (committed - remaining) / f, remaining: remaining / f }
}

export type DueItem<T> = { expense: T; remaining: number; remainingBase: number; overdue: boolean }

/** "Sắp phải trả": khoản còn nợ, có hạn sắp trước (quá hạn lên đầu), không hạn xếp cuối */
export function upcomingDues<T extends ExpenseLike>(expenses: T[], baseCurrency: string, today: string): DueItem<T>[] {
  return expenses
    .filter((e) => paymentStatus(e) !== 'paid')
    .map((e) => ({
      expense: e,
      remaining: remainingAmount(e),
      remainingBase: remainingBaseMinor(e, baseCurrency) / minorFactor(baseCurrency),
      overdue: e.due_date !== null && e.due_date < today,
    }))
    .sort((a, b) => {
      const da = a.expense.due_date
      const db = b.expense.due_date
      if (da === db) return 0
      if (da === null) return 1
      if (db === null) return -1
      return da.localeCompare(db)
    })
}
