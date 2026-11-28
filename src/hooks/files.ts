import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { buildStoragePath } from '../lib/files'
import { supabase } from '../lib/supabase'
import { queryKeys } from './queries'
import type { Attachment } from '../types'

const BUCKET = 'trip-files'

type AttachmentRow = Omit<Attachment, 'expense_title' | 'itinerary_title'> & {
  expenses: { title: string } | null
  itinerary_items: { title: string } | null
}

/** FILE-02 */
export function useAttachments(tripId: string) {
  return useQuery({
    queryKey: queryKeys.tripFiles(tripId),
    queryFn: async (): Promise<Attachment[]> => {
      const { data, error } = await supabase
        .from('attachments')
        .select('id, trip_id, storage_path, file_name, mime_type, size_bytes, expense_id, itinerary_item_id, created_at, expenses (title), itinerary_items (title)')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as unknown as AttachmentRow[]).map(({ expenses, itinerary_items, ...a }) => ({
        ...a,
        size_bytes: Number(a.size_bytes),
        expense_title: expenses?.title ?? null,
        itinerary_title: itinerary_items?.title ?? null,
      }))
    },
  })
}

export type UploadInput = { file: File; expenseId: string | null; itineraryItemId: string | null }

/** FILE-01: tải lên Storage rồi ghi bảng attachments; ghi bảng lỗi thì xóa object vừa tải */
export function useUploadFile(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, expenseId, itineraryItemId }: UploadInput) => {
      const path = buildStoragePath(tripId, file.name)
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type || undefined, upsert: false })
      if (uploadError) throw uploadError

      const { error } = await supabase.from('attachments').insert({
        trip_id: tripId,
        storage_path: path,
        file_name: file.name.slice(0, 255) || 'tep',
        mime_type: file.type || null,
        size_bytes: file.size,
        expense_id: expenseId,
        itinerary_item_id: itineraryItemId,
      })
      if (error) {
        await supabase.storage.from(BUCKET).remove([path])
        throw error
      }
    },
    // Ảnh hưởng icon kẹp giấy ở Chi tiêu → làm mới cả chuyến đi
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.trip(tripId) }),
  })
}

/** FILE-04: xóa object trên Storage rồi xóa dòng attachments */
export function useDeleteFile(tripId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (a: Attachment) => {
      const { error: storageError } = await supabase.storage.from(BUCKET).remove([a.storage_path])
      if (storageError) throw storageError
      const { error } = await supabase.from('attachments').delete().eq('id', a.id)
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.trip(tripId) }),
  })
}

/** FILE-03: signed URL hết hạn sau 5 phút */
export async function createSignedFileUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300)
  if (error) throw error
  return data.signedUrl
}
