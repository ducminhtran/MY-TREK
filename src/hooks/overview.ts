import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toISODate } from '../lib/format'
import { summarizeSpending, upcomingDues, type SpendingSummary } from '../lib/payments'
import { queryKeys } from './queries'

export type UpcomingActivity = {
  id: string
  title: string
  day_date: string
  start_time: string | null
  location_name: string | null
}

export type DueOverview = { id: string; title: string; due_date: string | null; remainingBase: number; overdue: boolean }

export type TripOverview = {
  spending: SpendingSummary
  expenseCount: number
  /** Tổng chi phí theo hạng mục, giảm dần */
  byCategory: { category: string; amount: number }[]
  /** 3 khoản còn phải trả gần hạn nhất */
  dues: DueOverview[]
  dueCount: number
  /** Quyết định 5a: tổng chi phí dự kiến trong lịch trình – chỉ để tham khảo, không cộng vào chi tiêu */
  plannedFromItinerary: number
  checklistDone: number
  checklistTotal: number
  upcoming: UpcomingActivity[]
}

type ExpenseRow = {
  id: string
  title: string
  amount: number | string
  currency: string
  exchange_rate: number | string
  amount_base: number | string
  category: string
  due_date: string | null
  expense_payments: { amount: number | string }[]
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** TRIP-05: số liệu cho tab Tổng quan */
export function useTripOverview(tripId: string, baseCurrency: string) {
  return useQuery({
    queryKey: queryKeys.tripOverview(tripId),
    queryFn: async (): Promise<TripOverview> => {
      const today = toISODate(new Date())
      const [expRes, chkRes, itiRes, costRes] = await Promise.all([
        supabase.from('expenses')
          .select('id, title, amount, currency, exchange_rate, amount_base, category, due_date, expense_payments (amount)')
          .eq('trip_id', tripId),
        supabase.from('checklist_items').select('is_done').eq('trip_id', tripId),
        supabase
          .from('itinerary_items')
          .select('id, title, day_date, start_time, location_name')
          .eq('trip_id', tripId)
          .gte('day_date', today)
          .order('day_date')
          .order('start_time', { nullsFirst: false })
          .order('sort_order')
          .limit(3),
        supabase.from('itinerary_items').select('cost_estimate').eq('trip_id', tripId).not('cost_estimate', 'is', null),
      ])
      if (expRes.error) throw expRes.error
      if (chkRes.error) throw chkRes.error
      if (itiRes.error) throw itiRes.error
      if (costRes.error) throw costRes.error

      const expenses = (expRes.data as unknown as ExpenseRow[]).map((e) => ({
        id: e.id,
        title: e.title,
        category: e.category,
        amount: Number(e.amount),
        currency: e.currency,
        exchange_rate: Number(e.exchange_rate),
        amount_base: Number(e.amount_base),
        due_date: e.due_date,
        payments: e.expense_payments.map((p) => ({ amount: Number(p.amount) })),
      }))

      const sums = new Map<string, number>()
      for (const e of expenses) sums.set(e.category, (sums.get(e.category) ?? 0) + e.amount_base)
      const dues = upcomingDues(expenses, baseCurrency, today)
      const checklist = chkRes.data as unknown as { is_done: boolean }[]
      const costs = costRes.data as unknown as { cost_estimate: number | string }[]

      return {
        spending: summarizeSpending(expenses, baseCurrency),
        expenseCount: expenses.length,
        byCategory: [...sums.entries()]
          .map(([category, amount]) => ({ category, amount: round2(amount) }))
          .sort((a, b) => b.amount - a.amount),
        dues: dues.slice(0, 3).map((d) => ({
          id: d.expense.id, title: d.expense.title, due_date: d.expense.due_date, remainingBase: d.remainingBase, overdue: d.overdue,
        })),
        dueCount: dues.length,
        plannedFromItinerary: round2(costs.reduce((s, c) => s + Number(c.cost_estimate), 0)),
        checklistDone: checklist.filter((c) => c.is_done).length,
        checklistTotal: checklist.length,
        upcoming: itiRes.data as unknown as UpcomingActivity[],
      }
    },
  })
}
