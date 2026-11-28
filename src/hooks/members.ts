import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { queryKeys } from './queries'
import type { TripCurrency, TripMember, TripRole } from '../types'

const MEMBER_COLUMNS = 'id, trip_id, user_id, display_name, email, role, status, created_at'
const ROLE_ORDER: Record<TripRole, number> = { owner: 0, editor: 1, viewer: 2 }

/** MEM-01: Owner trước, rồi Editor, Viewer; cùng vai trò theo thời gian thêm */
export function useTripMembers(tripId: string) {
  return useQuery({
    queryKey: queryKeys.tripMembers(tripId),
    queryFn: async (): Promise<TripMember[]> => {
      const { data, error } = await supabase
        .from('trip_members').select(MEMBER_COLUMNS).eq('trip_id', tripId).order('created_at')
      if (error) throw error
      return (data as unknown as TripMember[]).sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role])
    },
  })
}

export type MemberInput = { display_name: string; email: string; role: Exclude<TripRole, 'owner'> }

/** MEM-02: có email → đang mời; không email → thành viên offline (trigger tự suy ra trạng thái) */
export function useAddMember(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: MemberInput) => {
      const { error } = await supabase.from('trip_members').insert({
        trip_id: tripId,
        display_name: input.display_name.trim(),
        email: input.email.trim().toLowerCase() || null,
        role: input.role,
      })
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.trip(tripId) }),
  })
}

/** MEM-05: đổi vai trò, sửa tên/email (email chỉ với thành viên chưa có tài khoản) */
export function useUpdateMember(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<MemberInput> }) => {
      const row: Record<string, unknown> = {}
      if (patch.display_name !== undefined) row.display_name = patch.display_name.trim()
      if (patch.email !== undefined) row.email = patch.email.trim().toLowerCase() || null
      if (patch.role !== undefined) row.role = patch.role
      const { data, error } = await supabase.from('trip_members').update(row).eq('id', id).select('id')
      if (error) throw error
      if (!data || data.length === 0) throw new Error('Bạn không có quyền sửa thành viên này')
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.trip(tripId) }),
  })
}

/** MEM-05 (xóa) / MEM-06 (tự rời). BR-09 được trigger kiểm tra và báo lỗi tiếng Việt */
export function useDeleteMember(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { data, error } = await supabase.from('trip_members').delete().eq('id', memberId).select('id')
      if (error) throw error
      if (!data || data.length === 0) throw new Error('Bạn không có quyền xóa thành viên này')
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.trip(tripId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.trips })
    },
  })
}

// ---------- SET-02: tỷ giá ----------

export function useTripCurrencies(tripId: string) {
  return useQuery({
    queryKey: queryKeys.tripCurrencies(tripId),
    queryFn: async (): Promise<TripCurrency[]> => {
      const { data, error } = await supabase
        .from('trip_currencies').select('trip_id, currency, rate_to_base').eq('trip_id', tripId).order('currency')
      if (error) throw error
      return (data as unknown as TripCurrency[]).map((c) => ({ ...c, rate_to_base: Number(c.rate_to_base) }))
    },
  })
}

export function useSaveCurrency(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ currency, rate }: { currency: string; rate: number }) => {
      const { error } = await supabase
        .from('trip_currencies')
        .upsert({ trip_id: tripId, currency, rate_to_base: rate }, { onConflict: 'trip_id,currency' })
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.tripCurrencies(tripId) }),
  })
}

export function useDeleteCurrency(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (currency: string) => {
      const { error } = await supabase.from('trip_currencies').delete().eq('trip_id', tripId).eq('currency', currency)
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.tripCurrencies(tripId) }),
  })
}
