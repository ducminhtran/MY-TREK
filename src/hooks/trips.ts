import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { queryKeys } from './queries'
import type { Invitation, MyTrip, Trip, TripInput, TripRole } from '../types'

const TRIP_COLUMNS = 'id, name, destination, description, start_date, end_date, base_currency, budget, owner_id, created_at'

/** Chuyển dữ liệu form sang dòng ghi vào bảng trips */
function toTripRow(input: TripInput) {
  return {
    name: input.name.trim(),
    destination: input.destination.trim() || null,
    description: input.description.trim() || null,
    start_date: input.start_date,
    end_date: input.end_date,
    base_currency: input.base_currency,
    budget: input.budget,
  }
}

/** TRIP-01: các chuyến đi tôi đã tham gia, kèm vai trò của tôi */
export function useMyTrips(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.trips,
    enabled: !!userId,
    queryFn: async (): Promise<MyTrip[]> => {
      const { data, error } = await supabase
        .from('trip_members')
        .select(`role, trips (${TRIP_COLUMNS})`)
        .eq('user_id', userId ?? '')
        .eq('status', 'active')
      if (error) throw error
      const rows = data as unknown as { role: TripRole; trips: Trip | null }[]
      return rows.filter((r) => r.trips).map((r) => ({ ...(r.trips as Trip), my_role: r.role }))
    },
  })
}

/** Thông tin 1 chuyến đi + vai trò của tôi. null = không tồn tại hoặc không có quyền xem */
export function useTripInfo(tripId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tripInfo(tripId ?? ''),
    enabled: !!tripId && !!userId,
    queryFn: async (): Promise<{ trip: Trip; role: TripRole; myMemberId: string } | null> => {
      // id sai định dạng uuid → coi như không tìm thấy
      if (!/^[0-9a-f-]{36}$/i.test(tripId ?? '')) return null
      const [tripRes, memberRes] = await Promise.all([
        supabase.from('trips').select(TRIP_COLUMNS).eq('id', tripId ?? '').maybeSingle(),
        supabase.from('trip_members').select('id, role').eq('trip_id', tripId ?? '').eq('user_id', userId ?? '').maybeSingle(),
      ])
      if (tripRes.error) throw tripRes.error
      if (memberRes.error) throw memberRes.error
      if (!tripRes.data || !memberRes.data) return null
      const member = memberRes.data as unknown as { id: string; role: TripRole }
      return { trip: tripRes.data as unknown as Trip, role: member.role, myMemberId: member.id }
    },
  })
}

/** TRIP-02 */
export function useCreateTrip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: TripInput): Promise<Trip> => {
      // KT-06: insert().select() chạy được nhờ policy SELECT có owner_id = auth.uid()
      const { data, error } = await supabase.from('trips').insert(toTripRow(input)).select(TRIP_COLUMNS).single()
      if (error) throw error
      return data as unknown as Trip
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.trips }),
  })
}

/** TRIP-03 / SET-01 */
export function useUpdateTrip(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: TripInput) => {
      const { error } = await supabase.from('trips').update(toTripRow(input)).eq('id', tripId)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.trip(tripId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.trips })
    },
  })
}

/** TRIP-04: xóa file trên Storage trước, sau đó xóa trips (cascade) */
export function useDeleteTrip(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data: files, error: listError } = await supabase
        .from('attachments').select('storage_path').eq('trip_id', tripId)
      if (listError) throw listError
      const paths = (files as unknown as { storage_path: string }[]).map((f) => f.storage_path)
      for (let i = 0; i < paths.length; i += 100) {
        const { error } = await supabase.storage.from('trip-files').remove(paths.slice(i, i + 100))
        if (error) throw error
      }
      const { error } = await supabase.from('trips').delete().eq('id', tripId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.trip(tripId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.trips })
    },
  })
}

/** BR-10: số khoản chi của chuyến đi (khóa đổi tiền tệ gốc khi > 0) */
export function useExpenseCount(tripId: string) {
  return useQuery({
    queryKey: queryKeys.tripExpenseCount(tripId),
    queryFn: async () => {
      const { count, error } = await supabase
        .from('expenses').select('id', { count: 'exact', head: true }).eq('trip_id', tripId)
      if (error) throw error
      return count ?? 0
    },
  })
}

/** MEM-03: lời mời đang chờ của tôi */
export function useMyInvitations(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.invitations,
    enabled: !!userId,
    queryFn: async (): Promise<Invitation[]> => {
      const { data, error } = await supabase.rpc('my_invitations')
      if (error) throw error
      return (data ?? []) as unknown as Invitation[]
    },
  })
}

export function useRespondInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ memberId, accept }: { memberId: string; accept: boolean }) => {
      const { error } = await supabase.rpc(accept ? 'accept_invitation' : 'decline_invitation', { p_member_id: memberId })
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.invitations })
      void queryClient.invalidateQueries({ queryKey: queryKeys.trips })
    },
  })
}
