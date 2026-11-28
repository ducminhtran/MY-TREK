import { describe, expect, it } from 'vitest'
import { splitDifferenceMinor, splitEqual, toMinor } from './split'
import { balanceTotalMinor, buildBalanceText, computeBalances, suggestTransfers } from './settle'

const amounts = (shares: { share_amount: number }[]) => shares.map((s) => s.share_amount)

describe('splitEqual (BR-05)', () => {
  it('VND: phần dư cho người đầu danh sách', () => {
    expect(amounts(splitEqual(100000, 'VND', ['a', 'b', 'c']))).toEqual([33334, 33333, 33333])
    expect(amounts(splitEqual(100001, 'VND', ['a', 'b', 'c']))).toEqual([33334, 33334, 33333])
  })

  it('USD: theo cent', () => {
    expect(amounts(splitEqual(10, 'USD', ['a', 'b', 'c']))).toEqual([3.34, 3.33, 3.33])
    expect(amounts(splitEqual(0.05, 'USD', ['a', 'b']))).toEqual([0.03, 0.02])
  })

  it('tổng luôn bằng số tiền', () => {
    for (const [amount, cur, n] of [[99999, 'VND', 7], [123.45, 'USD', 4], [1000, 'JPY', 6]] as const) {
      const ids = Array.from({ length: n }, (_, i) => `m${i}`)
      const shares = splitEqual(amount, cur, ids)
      expect(splitDifferenceMinor(amount, cur, amounts(shares))).toBe(0)
    }
  })

  it('không có người chia', () => {
    expect(splitEqual(100, 'VND', [])).toEqual([])
  })
})

describe('splitDifferenceMinor (EXP-04)', () => {
  it('còn thiếu / thừa / khớp', () => {
    expect(splitDifferenceMinor(100000, 'VND', [50000, 40000])).toBe(10000)
    expect(splitDifferenceMinor(10.5, 'USD', [5.25, 5.3])).toBe(-5)
    expect(splitDifferenceMinor(10.5, 'USD', [5.25, 5.25])).toBe(0)
  })
})

describe('computeBalances (BR-07, BAL-06)', () => {
  const members = ['a', 'b', 'c']

  it('chia đều VND, tổng số dư = 0', () => {
    const balances = computeBalances(members, [
      { amount_base: 300000, exchange_rate: 1, paid_by: 'a', splits: [
        { member_id: 'a', share_amount: 100000 }, { member_id: 'b', share_amount: 100000 }, { member_id: 'c', share_amount: 100000 },
      ] },
    ], [], 'VND')
    const byId = Object.fromEntries(balances.map((b) => [b.member_id, b]))
    expect(byId.a.balance).toBe(200000)
    expect(byId.b.balance).toBe(-100000)
    expect(byId.c.balance).toBe(-100000)
    expect(balanceTotalMinor(balances, 'VND')).toBe(0)
  })

  it('ngoại tệ: chênh lệch làm tròn dồn vào phần chia cuối, tổng vẫn = 0', () => {
    // 10 USD × 25.400,5 = 254.005 VND; chia 3,34 / 3,33 / 3,33
    const balances = computeBalances(members, [
      { amount_base: 254005, exchange_rate: 25400.5, paid_by: 'b', splits: [
        { member_id: 'a', share_amount: 3.34 }, { member_id: 'b', share_amount: 3.33 }, { member_id: 'c', share_amount: 3.33 },
      ] },
    ], [], 'VND')
    expect(balanceTotalMinor(balances, 'VND')).toBe(0)
    const owedTotal = balances.reduce((s, b) => s + toMinor(b.owed, 'VND'), 0)
    expect(owedTotal).toBe(254005)
  })

  it('thanh toán đưa số dư về 0', () => {
    const balances = computeBalances(['a', 'b'], [
      { amount_base: 100000, exchange_rate: 1, paid_by: 'a', splits: [
        { member_id: 'a', share_amount: 50000 }, { member_id: 'b', share_amount: 50000 },
      ] },
    ], [{ from_member: 'b', to_member: 'a', amount: 50000 }], 'VND')
    expect(balances.every((b) => b.balance === 0)).toBe(true)
    const b = balances.find((x) => x.member_id === 'b')
    expect(b?.transferred).toBe(50000)
    expect(balances.find((x) => x.member_id === 'a')?.received).toBe(50000)
  })

  it('thành viên chưa có giao dịch vẫn có dòng, số dư 0', () => {
    const balances = computeBalances(['a', 'b', 'z'], [], [], 'VND')
    expect(balances).toHaveLength(3)
    expect(balances.every((b) => b.balance === 0)).toBe(true)
  })
})

describe('suggestTransfers (BR-08)', () => {
  it('ghép người nợ nhiều nhất với người nhận nhiều nhất', () => {
    const t = suggestTransfers([
      { member_id: 'a', paid: 0, owed: 0, transferred: 0, received: 0, balance: 150000 },
      { member_id: 'b', paid: 0, owed: 0, transferred: 0, received: 0, balance: 50000 },
      { member_id: 'c', paid: 0, owed: 0, transferred: 0, received: 0, balance: -120000 },
      { member_id: 'd', paid: 0, owed: 0, transferred: 0, received: 0, balance: -80000 },
    ], 'VND')
    // Vòng 1: c (nợ 120k) → a (nhận 150k). Vòng 2: d (80k) → b (50k, lúc này lớn hơn a còn 30k). Vòng 3: d → a
    expect(t).toEqual([
      { from: 'c', to: 'a', amount: 120000 },
      { from: 'd', to: 'b', amount: 50000 },
      { from: 'd', to: 'a', amount: 30000 },
    ])
  })

  it('USD theo cent', () => {
    const t = suggestTransfers([
      { member_id: 'a', paid: 0, owed: 0, transferred: 0, received: 0, balance: 6.67 },
      { member_id: 'b', paid: 0, owed: 0, transferred: 0, received: 0, balance: -3.34 },
      { member_id: 'c', paid: 0, owed: 0, transferred: 0, received: 0, balance: -3.33 },
    ], 'USD')
    expect(t).toEqual([
      { from: 'b', to: 'a', amount: 3.34 },
      { from: 'c', to: 'a', amount: 3.33 },
    ])
  })

  it('không ai nợ → rỗng', () => {
    expect(suggestTransfers([], 'VND')).toEqual([])
  })
})

describe('buildBalanceText (BAL-05)', () => {
  it('có số dư và chuyển khoản', () => {
    const names: Record<string, string> = { a: 'An', b: 'Bình' }
    const text = buildBalanceText('Đà Lạt', 'VND', [
      { member_id: 'a', paid: 0, owed: 0, transferred: 0, received: 0, balance: 50000 },
      { member_id: 'b', paid: 0, owed: 0, transferred: 0, received: 0, balance: -50000 },
    ], [{ from: 'b', to: 'a', amount: 50000 }], (id) => names[id] ?? id)
    expect(text).toContain('"Đà Lạt"')
    expect(text).toContain('An: được nhận')
    expect(text).toContain('Bình: phải trả')
    expect(text).toContain('Bình → An')
  })
})
