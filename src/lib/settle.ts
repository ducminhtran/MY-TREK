/** BAL-01 → BAL-06: bảng cân đối và gợi ý chuyển tiền (tiền tệ gốc của chuyến đi) */
import { formatMoney } from './format'
import { fromMinor, minorFactor, toMinor, type Share } from './split'

export type SettleExpense = {
  /** Tổng chi phí (nguyên tệ) */
  amount: number
  exchange_rate: number
  splits: Share[]  // share_amount theo nguyên tệ của khoản chi, tổng = amount
  /** Các đợt ĐÃ trả (nguyên tệ) */
  payments: { paid_by: string; amount: number }[]
}

export type SettleSettlement = { from_member: string; to_member: string; amount: number }

export type MemberBalance = {
  member_id: string
  /** Đã trả cho các khoản chi */
  paid: number
  /** Phải chịu (tổng phần chia) */
  owed: number
  /** Đã chuyển cho người khác */
  transferred: number
  /** Đã nhận từ người khác */
  received: number
  /** Còn lại: + được nhận, − phải trả */
  balance: number
}

export type Transfer = { from: string; to: string; amount: number }

type Acc = { paid: number; owed: number; transferred: number; received: number }

/**
 * BR-07: Số dư = Đã trả − Phải chịu + Đã chuyển − Đã nhận, tính theo đơn vị nhỏ nhất của tiền tệ gốc.
 * Quyết định 2a (28/11/2026): chỉ tính phần ĐÃ THỰC TRẢ. "Phải chịu" của mỗi người = số đã trả của khoản chi
 * × tỷ lệ phần chia của họ (VD mới cọc 20% thì mỗi người chịu 20% phần của mình).
 * Phần chênh do làm tròn dồn vào phần chia cuối của khoản chi → tổng số dư luôn = 0 (BAL-06).
 */
export function computeBalances(
  memberIds: string[],
  expenses: SettleExpense[],
  settlements: SettleSettlement[],
  baseCurrency: string,
): MemberBalance[] {
  const f = minorFactor(baseCurrency)
  const acc = new Map<string, Acc>()
  const get = (id: string) => {
    let a = acc.get(id)
    if (!a) {
      a = { paid: 0, owed: 0, transferred: 0, received: 0 }
      acc.set(id, a)
    }
    return a
  }
  memberIds.forEach(get)

  for (const e of expenses) {
    // Đã trả: từng đợt quy đổi theo tỷ giá chung của khoản chi
    let paidMinor = 0
    for (const p of e.payments) {
      const m = Math.round(p.amount * e.exchange_rate * f)
      get(p.paid_by).paid += m
      paidMinor += m
    }
    const shareTotal = e.splits.reduce((s, x) => s + x.share_amount, 0)
    if (paidMinor === 0 || e.splits.length === 0 || shareTotal <= 0) continue

    // Phải chịu: chia số đã trả theo tỷ lệ phần chia. Thứ tự cố định để "phần chia cuối" luôn là cùng một người
    const splits = [...e.splits].sort((a, b) => a.member_id.localeCompare(b.member_id))
    const minors = splits.map((s) => Math.round((paidMinor * s.share_amount) / shareTotal))
    const diff = paidMinor - minors.reduce((sum, m) => sum + m, 0)
    minors[minors.length - 1] += diff
    splits.forEach((s, i) => {
      get(s.member_id).owed += minors[i]
    })
  }

  for (const s of settlements) {
    const m = Math.round(s.amount * f)
    get(s.from_member).transferred += m
    get(s.to_member).received += m
  }

  return [...acc.entries()].map(([member_id, a]) => ({
    member_id,
    paid: a.paid / f,
    owed: a.owed / f,
    transferred: a.transferred / f,
    received: a.received / f,
    balance: (a.paid - a.owed + a.transferred - a.received) / f,
  }))
}

/** BR-08: ghép người nợ nhiều nhất với người được nhận nhiều nhất, lặp tới khi hết */
export function suggestTransfers(balances: MemberBalance[], baseCurrency: string): Transfer[] {
  const debtors = balances.filter((b) => b.balance < 0).map((b) => ({ id: b.member_id, amt: -toMinor(b.balance, baseCurrency) }))
  const creditors = balances.filter((b) => b.balance > 0).map((b) => ({ id: b.member_id, amt: toMinor(b.balance, baseCurrency) }))
  const byAmount = (a: { id: string; amt: number }, b: { id: string; amt: number }) => b.amt - a.amt || a.id.localeCompare(b.id)
  const result: Transfer[] = []

  while (debtors.length > 0 && creditors.length > 0) {
    debtors.sort(byAmount)
    creditors.sort(byAmount)
    const d = debtors[0]
    const c = creditors[0]
    const x = Math.min(d.amt, c.amt)
    if (x > 0) result.push({ from: d.id, to: c.id, amount: fromMinor(x, baseCurrency) })
    d.amt -= x
    c.amt -= x
    if (d.amt === 0) debtors.shift()
    if (c.amt === 0) creditors.shift()
  }
  return result
}

/** BAL-06: tổng cột Còn lại (đơn vị nhỏ nhất) – phải = 0 */
export function balanceTotalMinor(balances: MemberBalance[], baseCurrency: string): number {
  return balances.reduce((sum, b) => sum + toMinor(b.balance, baseCurrency), 0)
}

/** BAL-05: text để gửi Zalo */
export function buildBalanceText(
  tripName: string,
  baseCurrency: string,
  balances: MemberBalance[],
  transfers: Transfer[],
  nameOf: (memberId: string) => string,
): string {
  const money = (n: number) => formatMoney(Math.abs(n), baseCurrency)
  const lines = [`Chia tiền chuyến đi "${tripName}" (${baseCurrency})`, '', 'Số dư:']
  for (const b of balances) {
    const state = b.balance > 0 ? `được nhận ${money(b.balance)}` : b.balance < 0 ? `phải trả ${money(b.balance)}` : 'đã xong'
    lines.push(`- ${nameOf(b.member_id)}: ${state}`)
  }
  lines.push('', transfers.length > 0 ? 'Cần chuyển:' : 'Không còn ai nợ ai.')
  for (const t of transfers) lines.push(`- ${nameOf(t.from)} → ${nameOf(t.to)}: ${money(t.amount)}`)
  return lines.join('\n')
}
