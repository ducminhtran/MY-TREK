/**
 * KT-13: mọi phép tính tiền làm trên ĐƠN VỊ NHỎ NHẤT (số nguyên) để không sai số làm tròn.
 * VND: 1 đồng; USD: 1 cent (0,01).
 */
import { currencyDecimals } from './format'

export type Share = { member_id: string; share_amount: number }

export function minorFactor(currency: string): number {
  return 10 ** currencyDecimals(currency)
}

/** 10,5 USD → 1050 */
export function toMinor(amount: number, currency: string): number {
  return Math.round(amount * minorFactor(currency))
}

/** 1050 → 10,5 USD */
export function fromMinor(minor: number, currency: string): number {
  return minor / minorFactor(currency)
}

/**
 * BR-05: chia đều theo đơn vị nhỏ nhất, phần dư cộng lần lượt cho người đầu danh sách.
 * 100.000 VND / 3 = 33.334 + 33.333 + 33.333; 10 USD / 3 = 3,34 + 3,33 + 3,33
 */
export function splitEqual(amount: number, currency: string, memberIds: string[]): Share[] {
  if (memberIds.length === 0) return []
  const total = toMinor(amount, currency)
  const n = memberIds.length
  const base = Math.floor(total / n)
  let remainder = total - base * n
  return memberIds.map((member_id) => {
    const extra = remainder > 0 ? 1 : 0
    remainder -= extra
    return { member_id, share_amount: fromMinor(base + extra, currency) }
  })
}

/**
 * EXP-04 / BR-06: chênh lệch (đơn vị nhỏ nhất) giữa số tiền và tổng phần chia.
 * > 0: còn thiếu; < 0: thừa; = 0: khớp
 */
export function splitDifferenceMinor(amount: number, currency: string, shares: number[]): number {
  return toMinor(amount, currency) - shares.reduce((sum, s) => sum + toMinor(s, currency), 0)
}
