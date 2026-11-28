import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { initialAuthParams, supabase } from '../lib/supabase'

export type AuthNotice = { tone: 'info' | 'error'; text: string }

type AuthContextValue = {
  session: Session | null
  user: User | null
  loading: boolean
  /** Thông báo sau khi bấm link email (KT-03), hiện ở trang đăng nhập */
  notice: AuthNotice | null
  clearNotice: () => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Thông báo dựa trên tham số link email lúc mở trang */
function noticeFromLink(hasSession: boolean): AuthNotice | null {
  const { hasCode, errorCode, errorDescription } = initialAuthParams
  if (errorCode) {
    return {
      tone: 'error',
      text:
        errorCode === 'otp_expired' || errorCode === 'access_denied'
          ? 'Liên kết đã hết hạn hoặc đã được sử dụng. Vui lòng thử lại hoặc yêu cầu gửi lại email.'
          : errorDescription || 'Liên kết không hợp lệ.',
    }
  }
  // PKCE: mở link trên trình duyệt/thiết bị khác thì không tự đăng nhập được, nhưng email đã xác nhận
  if (hasCode && !hasSession) {
    return { tone: 'info', text: 'Email đã được xác nhận. Vui lòng đăng nhập để tiếp tục.' }
  }
  return null
}

/** Xóa ?code / ?error_… khỏi thanh địa chỉ để F5 không xử lý lại link cũ */
function cleanAuthParamsFromUrl() {
  const current = new URL(window.location.href)
  const keys = ['code', 'error', 'error_code', 'error_description']
  if (!keys.some((k) => current.searchParams.has(k)) && !current.hash.includes('error')) return
  keys.forEach((k) => current.searchParams.delete(k))
  current.hash = ''
  window.history.replaceState(window.history.state, '', current.pathname + current.search)
}

/** KT-14: xóa dữ liệu đã cache trên máy (react-query + cache Service Worker) */
async function clearCachedApiData() {
  if ('caches' in window) {
    try {
      await caches.delete('supabase-api')
    } catch {
      // bỏ qua: trình duyệt không cho truy cập Cache Storage
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<AuthNotice | null>(null)

  useEffect(() => {
    let active = true

    // getSession() chờ supabase-js xử lý xong ?code trong URL (nếu có)
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setNotice(noticeFromLink(data.session !== null))
      cleanAuthParamsFromUrl()
      setLoading(false)
    })

    // Không gọi hàm supabase khác bên trong callback này (tránh treo khóa phiên)
    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      if (event === 'SIGNED_OUT') {
        queryClient.clear()
        void clearCachedApiData()
      }
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [queryClient])

  const clearNotice = useCallback(() => setNotice(null), [])

  // AUTH-05: đăng xuất trên máy này + xóa cache
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } finally {
      queryClient.clear()
      await clearCachedApiData()
      setSession(null)
    }
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({ session, user: session?.user ?? null, loading, notice, clearNotice, signOut }),
    [session, loading, notice, clearNotice, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth phải được dùng bên trong AuthProvider')
  return ctx
}

/** Tên hiển thị của người dùng: họ tên trong metadata, không có thì dùng email */
export function displayNameOf(user: User | null): string {
  const fullName = user?.user_metadata?.full_name
  return typeof fullName === 'string' && fullName.trim() ? fullName.trim() : user?.email ?? ''
}
