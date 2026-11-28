import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from './AuthProvider'
import { Spinner } from '../components/ui'

/** AUTH-07: chưa đăng nhập → chuyển /login, đăng nhập xong quay lại trang cũ */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner />
      </div>
    )
  }
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <>{children}</>
}
