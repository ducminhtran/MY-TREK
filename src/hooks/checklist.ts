import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { queryKeys } from './queries'
import type { ChecklistInput, ChecklistItem } from '../types'

const COLUMNS = 'id, trip_id, title, category, assignee_id, is_done, due_date, sort_order, created_at'

export function useChecklist(tripId: string) {
  return useQuery({
    queryKey: queryKeys.tripChecklist(tripId),
    queryFn: async (): Promise<ChecklistItem[]> => {
      const { data, error } = await supabase
        .from('checklist_items').select(COLUMNS).eq('trip_id', tripId).order('sort_order').order('created_at')
      if (error) throw error
      return data as unknown as ChecklistItem[]
    },
  })
}

/** Checklist ảnh hưởng tab Tổng quan → làm mới cả chuyến đi */
function useInvalidateTrip(tripId: string) {
  const queryClient = useQueryClient()
  return () => void queryClient.invalidateQueries({ queryKey: queryKeys.trip(tripId) })
}

/** CHK-02 (1 mục) và CHK-04 (nhiều mục mẫu) */
export function useAddChecklistItems(tripId: string) {
  const invalidate = useInvalidateTrip(tripId)
  return useMutation({
    // startOrder: thêm vào cuối danh sách hiện có, giữ đúng thứ tự khi thêm nhiều mục cùng lúc
    mutationFn: async ({ items, startOrder }: { items: ChecklistInput[]; startOrder: number }) => {
      const rows = items.map((i, index) => ({ ...i, trip_id: tripId, sort_order: startOrder + index }))
      const { error } = await supabase.from('checklist_items').insert(rows)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

/** CHK-03: sửa nội dung (Owner/Editor) */
export function useUpdateChecklistItem(tripId: string) {
  const invalidate = useInvalidateTrip(tripId)
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ChecklistInput }) => {
      const { error } = await supabase.from('checklist_items').update(input).eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

/** CHK-03 / Q-05: đánh dấu xong qua RPC – Viewer chỉ được mục giao cho mình */
export function useSetChecklistDone(tripId: string) {
  const invalidate = useInvalidateTrip(tripId)
  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase.rpc('set_checklist_done', { p_item_id: id, p_done: done })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useDeleteChecklistItem(tripId: string) {
  const invalidate = useInvalidateTrip(tripId)
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('checklist_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}
