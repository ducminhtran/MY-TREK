import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

/**
 * Khóa cache react-query. Mọi dữ liệu của 1 chuyến đi nằm dưới tiền tố ['trip', id]
 * → invalidate ['trip', id] là làm mới toàn bộ chuyến đi.
 */
export const queryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  trips: ['trips'] as const,
  invitations: ['invitations'] as const,
  trip: (tripId: string) => ['trip', tripId] as const,
  tripInfo: (tripId: string) => ['trip', tripId, 'info'] as const,
  tripMembers: (tripId: string) => ['trip', tripId, 'members'] as const,
  tripCurrencies: (tripId: string) => ['trip', tripId, 'currencies'] as const,
  tripOverview: (tripId: string) => ['trip', tripId, 'overview'] as const,
  tripExpenseCount: (tripId: string) => ['trip', tripId, 'expense-count'] as const,
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profile(userId ?? ''),
    enabled: !!userId,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', userId ?? '')
        .single()
      if (error) throw error
      return data as unknown as Profile
    },
  })
}

/** AUTH-04: cập nhật họ tên ở cả profiles và user_metadata */
export function useUpdateFullName(userId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (fullName: string) => {
      if (!userId) throw new Error('Chưa đăng nhập')
      const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', userId)
      if (error) throw error
      const { error: authError } = await supabase.auth.updateUser({ data: { full_name: fullName } })
      if (authError) throw authError
    },
    onSuccess: () => {
      if (userId) void queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) })
    },
  })
}
