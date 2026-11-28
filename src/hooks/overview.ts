import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toISODate } from '../lib/format'
import { queryKeys } from './queries'

export type UpcomingActivity = {
  id: string
  title: string
  day_date: string
  start_time: string | null
  location_name: string | null
}

export type TripOverview = {
  totalSpent: number
  expenseCount: number
  /** Tổng chi theo hạng mục, giảm dần */
  byCategory: { category: string; amount: number }[]
  checklistDone: number
  checklistTotal: number
  upcoming: UpcomingActivity[]
}

/** TRIP-05: số liệu cho tab Tổng quan */
export function useTripOverview(tripId: string) {
  return useQuery({
    queryKey: queryKeys.tripOverview(tripId),
    queryFn: async (): Promise<TripOverview> => {
      const today = toISODate(new Date())
      const [expRes, chkRes, itiRes] = await Promise.all([
        supabase.from('expenses').select('amount_base, category').eq('trip_id', tripId),
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
      ])
      if (expRes.error) throw expRes.error
      if (chkRes.error) throw chkRes.error
      if (itiRes.error) throw itiRes.error

      const expenses = expRes.data as unknown as { amount_base: number | string; category: string }[]
      const sums = new Map<string, number>()
      let total = 0
      for (const e of expenses) {
        const amount = Number(e.amount_base)
        total += amount
        sums.set(e.category, (sums.get(e.category) ?? 0) + amount)
      }
      const checklist = chkRes.data as unknown as { is_done: boolean }[]

      return {
        totalSpent: Math.round(total * 100) / 100,
        expenseCount: expenses.length,
        byCategory: [...sums.entries()]
          .map(([category, amount]) => ({ category, amount: Math.round(amount * 100) / 100 }))
          .sort((a, b) => b.amount - a.amount),
        checklistDone: checklist.filter((c) => c.is_done).length,
        checklistTotal: checklist.length,
        upcoming: itiRes.data as unknown as UpcomingActivity[],
      }
    },
  })
}
