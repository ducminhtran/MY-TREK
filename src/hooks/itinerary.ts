import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { queryKeys } from './queries'
import type { ItineraryInput, ItineraryItem } from '../types'

const ITEM_COLUMNS =
  'id, trip_id, day_date, start_time, end_time, title, category, location_name, address, lat, lng, cost_estimate, note, sort_order, created_at'

const numOrNull = (v: unknown) => (v === null || v === undefined ? null : Number(v))

export function useItinerary(tripId: string) {
  return useQuery({
    queryKey: queryKeys.tripItinerary(tripId),
    queryFn: async (): Promise<ItineraryItem[]> => {
      const { data, error } = await supabase.from('itinerary_items').select(ITEM_COLUMNS).eq('trip_id', tripId)
      if (error) throw error
      return (data as unknown as ItineraryItem[]).map((i) => ({
        ...i,
        lat: numOrNull(i.lat),
        lng: numOrNull(i.lng),
        cost_estimate: numOrNull(i.cost_estimate),
      }))
    },
  })
}

/** ITI-02: thêm (không có id) hoặc sửa (có id). BR-14 do trigger kiểm tra */
export function useSaveItineraryItem(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: ItineraryInput }) => {
      const { error } = id
        ? await supabase.from('itinerary_items').update(input).eq('id', id)
        : await supabase.from('itinerary_items').insert({ ...input, trip_id: tripId })
      if (error) throw error
    },
    // Lịch trình ảnh hưởng Tổng quan + Bản đồ → làm mới cả chuyến đi
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.trip(tripId) }),
  })
}

export function useDeleteItineraryItem(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('itinerary_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.trip(tripId) }),
  })
}
