import { createClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

/** KT-05: chỉ coi là đã cấu hình khi có đủ URL hợp lệ + anon key */
export const isSupabaseConfigured = /^https?:\/\//.test(url) && anonKey.length > 0

export type InitialAuthParams = {
  hasCode: boolean
  errorCode: string | null
  errorDescription: string | null
}

/**
 * KT-03: đọc tham số từ link email (?code=… hoặc ?error_code=…) NGAY khi tải trang,
 * trước khi supabase-js xử lý, để biết người dùng vừa bấm link xác nhận / đặt lại mật khẩu.
 */
function readInitialAuthParams(): InitialAuthParams {
  if (typeof window === 'undefined') return { hasCode: false, errorCode: null, errorDescription: null }
  const search = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const get = (key: string) => search.get(key) ?? hash.get(key)
  return {
    hasCode: search.has('code'),
    errorCode: get('error_code') ?? get('error'),
    errorDescription: get('error_description'),
  }
}

export const initialAuthParams = readInitialAuthParams()

/** Địa chỉ tuyệt đối của app, dùng làm redirect cho email. VD: https://…/MY-TREK/reset-password */
export function appUrl(path = ''): string {
  return window.location.origin + import.meta.env.BASE_URL + path.replace(/^\//, '')
}

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
