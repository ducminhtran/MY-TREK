import { Link, NavLink, Outlet, useParams } from 'react-router'
import {
  CalendarDays, ChevronLeft, LayoutDashboard, ListChecks, Map as MapIcon, MapPin, Paperclip,
  Scale, SearchX, Settings, Users, Wallet, type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { Badge, buttonClass, EmptyState, ErrorState, Spinner } from '../components/ui'
import { useTripInfo } from '../hooks/trips'
import { ROLE_LABELS } from '../lib/constants'
import { toFriendlyError } from '../lib/errors'
import { countDaysInclusive } from '../lib/format'
import { formatDateRange } from '../lib/trips'
import type { TripContextValue } from './trip/context'

type Tab = { to: string; label: string; icon: LucideIcon; end?: boolean }

// TRIP-06: thứ tự tab
const TABS: Tab[] = [
  { to: '.', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: 'itinerary', label: 'Lịch trình', icon: CalendarDays },
  { to: 'expenses', label: 'Chi tiêu', icon: Wallet },
  { to: 'balances', label: 'Chia tiền', icon: Scale },
  { to: 'checklist', label: 'Checklist', icon: ListChecks },
  { to: 'map', label: 'Bản đồ', icon: MapIcon },
  { to: 'files', label: 'Tệp', icon: Paperclip },
  { to: 'members', label: 'Thành viên', icon: Users },
  { to: 'settings', label: 'Cài đặt', icon: Settings },
]

export function TripDetailPage() {
  const { tripId } = useParams()
  const { user } = useAuth()
  const info = useTripInfo(tripId, user?.id)

  if (info.isPending) return <Spinner />
  if (info.isError) return <ErrorState error={toFriendlyError(info.error)} onRetry={() => void info.refetch()} />
  if (!info.data) {
    return (
      <EmptyState
        icon={<SearchX className="size-10" aria-hidden />}
        title="Không tìm thấy chuyến đi"
        description="Chuyến đi không tồn tại, đã bị xóa hoặc bạn không có quyền xem."
        action={<Link to="/" className={buttonClass('secondary')}>Về danh sách chuyến đi</Link>}
      />
    )
  }

  const { trip, role, myMemberId } = info.data
  const context: TripContextValue = {
    trip,
    role,
    myMemberId,
    canEdit: role === 'owner' || role === 'editor',
    isOwner: role === 'owner',
  }

  return (
    <div>
      <Link to="/" className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-slate-600 hover:text-brand-700">
        <ChevronLeft className="size-4" aria-hidden />
        Chuyến đi
      </Link>

      <header className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl">{trip.name}</h1>
          <Badge tone={role === 'owner' ? 'brand' : 'slate'}>{ROLE_LABELS[role]}</Badge>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
          {trip.destination && (
            <span className="flex items-center gap-1">
              <MapPin className="size-4" aria-hidden />
              {trip.destination}
            </span>
          )}
          <span className="flex items-center gap-1">
            <CalendarDays className="size-4" aria-hidden />
            {formatDateRange(trip.start_date, trip.end_date)} · {countDaysInclusive(trip.start_date, trip.end_date)} ngày
          </span>
        </div>
      </header>

      {/* Mobile: thanh tab cuộn ngang */}
      <nav className="-mx-4 mb-4 overflow-x-auto border-b border-slate-200 px-4 [scrollbar-width:none]" aria-label="Các mục của chuyến đi">
        <ul className="flex min-w-max gap-1">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-1.5 border-b-2 px-3 text-sm font-medium whitespace-nowrap ${
                    isActive ? 'border-brand-700 text-brand-800' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`
                }
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <Outlet context={context} />
    </div>
  )
}
