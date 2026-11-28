import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

export const queryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
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
      return data as Profile
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
