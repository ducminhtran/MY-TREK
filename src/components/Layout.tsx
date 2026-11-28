import { Link, NavLink, Outlet } from 'react-router'
import { Luggage, Plus, User, WifiOff, type LucideIcon } from 'lucide-react'
import { Logo } from './Logo'
import { displayNameOf, useAuth } from '../auth/AuthProvider'
import { useOnline } from '../hooks/useOnline'

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean }

// Điều hướng chính (mục 9.2): Chuyến đi · Tạo mới · Tài khoản
const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Chuyến đi', icon: Luggage, end: true },
  { to: '/trips/new', label: 'Tạo mới', icon: Plus },
  { to: '/profile', label: 'Tài khoản', icon: User },
]

export function Layout() {
  const online = useOnline()
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="pt-safe sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/" aria-label="Về trang chủ">
            <Logo />
          </Link>
          <DesktopNav />
        </div>
        {/* PWA-03 */}
        {!online && (
          <div className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-sm text-amber-900" role="status">
            <WifiOff className="size-4 shrink-0" aria-hidden />
            Bạn đang offline – dữ liệu có thể chưa mới nhất
          </div>
        )}
      </header>

      {/* pb-24 chừa chỗ cho thanh điều hướng dưới trên mobile */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-24 md:pb-8">
        <Outlet />
      </main>

      <MobileNav />
    </div>
  )
}

function DesktopNav() {
  const { user } = useAuth()
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Điều hướng chính">
      <span className="mr-2 max-w-48 truncate text-sm text-slate-500" title={user?.email}>
        {displayNameOf(user)}
      </span>
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium ${
              isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100'
            }`
          }
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

function MobileNav() {
  return (
    <nav
      className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white md:hidden"
      aria-label="Điều hướng chính"
    >
      <ul className="grid grid-cols-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                  isActive ? 'text-brand-700' : 'text-slate-500'
                }`
              }
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
