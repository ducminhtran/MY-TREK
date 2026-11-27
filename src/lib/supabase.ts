import { createClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

/** KT-05: chỉ coi là đã cấu hình khi có đủ URL hợp lệ + anon key */
export const isSupabaseConfigured = /^https?:\/\//.test(url) && anonKey.length > 0

/**
 * Client Supabase dùng chung (KT-03).
 * Khi chưa cấu hình, tạo client với giá trị giả để giữ kiểu không-null;
 * App sẽ hiện màn hình ConfigMissing nên client này không bao giờ được gọi.
 */
export const supabase = createClient(
  isSupabaseConfigured ? url : 'http://localhost:54321',
  isSupabaseConfigured ? anonKey : 'chua-cau-hinh',
  {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: isSupabaseConfigured,
      persistSession: true,
      autoRefreshToken: true,
    },
  },
)
