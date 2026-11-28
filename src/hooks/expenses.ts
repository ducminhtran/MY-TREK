import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Share } from '../lib/split'
import { queryKeys } from './queries'
import type { Expense, ExpenseInput, PaymentInput, Settlement } from '../types'

const EXPENSE_SELECT =
  'id, trip_id, title, category, amount, currency, exchange_rate, amount_base, paid_by, expense_date, due_date, split_type, note, created_at, ' +
  'expense_splits (member_id, share_amount), expense_payments (id, paid_by, amount, paid_on, note, created_at), attachments (count)'

type ExpenseRow = Omit<Expense, 'splits' | 'payments' | 'attachment_count'> & {
  expense_splits: { member_id: string; share_amount: number | string }[]
  expense_payments: { id: string; paid_by: string; amount: number | string; paid_on: string; note: string | null; created_at: string }[]
  attachments: { count: number }[]
}

/** EXP-01: khoản chi kèm phần chia + số tệp đính kèm; mới nhất trước */
export function useExpenses(tripId: string) {
  return useQuery({
    queryKey: queryKeys.tripExpenses(tripId),
    queryFn: async (): Promise<Expense[]> => {
      const { data, error } = await supabase
        .from('expenses')
        .select(EXPENSE_SELECT)
        .eq('trip_id', tripId)
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as unknown as ExpenseRow[]).map(({ expense_splits, expense_payments, attachments, ...e }) => ({
        ...e,
        amount: Number(e.amount),
        exchange_rate: Number(e.exchange_rate),
        amount_base: Number(e.amount_base),
        splits: expense_splits.map((s) => ({ member_id: s.member_id, share_amount: Number(s.share_amount) })),
        // Đợt cũ trước (theo ngày trả, rồi thời điểm ghi nhận)
        payments: [...expense_payments]
          .sort((x, y) => x.paid_on.localeCompare(y.paid_on) || x.created_at.localeCompare(y.created_at))
          .map((p) => ({ id: p.id, paid_by: p.paid_by, amount: Number(p.amount), paid_on: p.paid_on, note: p.note })),
        attachment_count: attachments[0]?.count ?? 0,
      }))
    },
  })
}

/** EXP-05: lưu qua RPC save_expense – khoản chi + phần chia + các đợt thanh toán trong 1 transaction */
export function useSaveExpense(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ expense, splits, payments }: { expense: ExpenseInput; splits: Share[]; payments: PaymentInput[] }) => {
      const { data, error } = await supabase.rpc('save_expense', {
        p_expense: { ...expense, trip_id: tripId },
        p_splits: splits,
        p_payments: payments,
      })
      if (error) throw error
      return data as unknown as string
    },
    // Chi tiêu ảnh hưởng cân đối, tổng quan, khóa tiền tệ gốc → làm mới cả chuyến đi
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.trip(tripId) }),
  })
}

export function useDeleteExpense(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.trip(tripId) }),
  })
}

/** Ghi nhận thêm 1 đợt trả cho khoản chi (trigger chặn nếu vượt phần còn lại) */
export function useAddExpensePayment(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ expenseId, payment }: { expenseId: string; payment: PaymentInput }) => {
      const { error } = await supabase.from('expense_payments').insert({ ...payment, expense_id: expenseId, trip_id: tripId })
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.trip(tripId) }),
  })
}

// ---------- Thanh toán giữa thành viên (BAL-03, BAL-04) ----------

export function useSettlements(tripId: string) {
  return useQuery({
    queryKey: queryKeys.tripSettlements(tripId),
    queryFn: async (): Promise<Settlement[]> => {
      const { data, error } = await supabase
        .from('settlements')
        .select('id, trip_id, from_member, to_member, amount, settled_on, note, created_at')
        .eq('trip_id', tripId)
        .order('settled_on', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as unknown as Settlement[]).map((s) => ({ ...s, amount: Number(s.amount) }))
    },
  })
}

export type SettlementInput = {
  from_member: string
  to_member: string
  amount: number
  settled_on: string
  note: string | null
}

export function useAddSettlement(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SettlementInput) => {
      const { error } = await supabase.from('settlements').insert({ ...input, trip_id: tripId })
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.trip(tripId) }),
  })
}

export function useDeleteSettlement(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('settlements').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.trip(tripId) }),
  })
}
