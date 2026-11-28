import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { CalendarDays, ListChecks, Users, Wallet } from 'lucide-react'
import { Card, ErrorState, Spinner } from '../../components/ui'
import { useTripMembers } from '../../hooks/members'
import { useTripOverview } from '../../hooks/overview'
import { CATEGORY_LABELS } from '../../lib/constants'
import { toFriendlyError } from '../../lib/errors'
import { countDaysInclusive, formatDateWithWeekday, formatMoney, formatTime } from '../../lib/format'
import { useTripContext } from './context'

/** TRIP-05: Tổng quan chuyến đi */
export function OverviewTab() {
  const { trip } = useTripContext()
  const overview = useTripOverview(trip.id)
  const members = useTripMembers(trip.id)

  if (overview.isPending) return <Spinner />
  if (overview.isError) return <ErrorState error={toFriendlyError(overview.error)} onRetry={() => void overview.refetch()} />

  const o = overview.data
  const budget = trip.budget === null ? null : Number(trip.budget)
  const over = budget !== null && o.totalSpent > budget
  const percent = budget ? Math.min(100, Math.round((o.totalSpent / budget) * 100)) : 0
  const maxCategory = o.byCategory[0]?.amount ?? 0
  const money = (n: number) => formatMoney(n, trip.base_currency)

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="grid grid-cols-3 gap-3 md:col-span-2">
        <Stat icon={<CalendarDays className="size-5" aria-hidden />} label="Số ngày" value={String(countDaysInclusive(trip.start_date, trip.end_date))} />
        <Stat icon={<Users className="size-5" aria-hidden />} label="Thành viên" value={members.data ? String(members.data.length) : '…'} />
        <Stat icon={<ListChecks className="size-5" aria-hidden />} label="Checklist" value={`${o.checklistDone}/${o.checklistTotal}`} />
      </div>

      <Card>
        <h2 className="mb-2 flex items-center gap-2 font-semibold text-slate-800">
          <Wallet className="size-5 text-brand-700" aria-hidden />
          Chi tiêu
        </h2>
        <p className={`text-2xl font-bold ${over ? 'text-red-600' : 'text-slate-900'}`}>{money(o.totalSpent)}</p>
        <p className="text-sm text-slate-500">{o.expenseCount} khoản chi</p>
        {budget !== null && budget > 0 && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-slate-600">
              <span>Ngân sách {money(budget)}</span>
              <span className={over ? 'font-semibold text-red-600' : ''}>
                {over ? `Vượt ${money(o.totalSpent - budget)}` : `${percent}%`}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
              <div className={`h-full rounded-full ${over ? 'bg-red-500' : 'bg-brand-600'}`} style={{ width: `${over ? 100 : percent}%` }} />
            </div>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-800">Chi theo hạng mục</h2>
        {o.byCategory.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có khoản chi nào.</p>
        ) : (
          <ul className="space-y-2">
            {o.byCategory.map((c) => (
              <li key={c.category}>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">{CATEGORY_LABELS[c.category] ?? c.category}</span>
                  <span className="font-medium text-slate-900">{money(c.amount)}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${maxCategory ? (c.amount / maxCategory) * 100 : 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold text-slate-800">Tiến độ checklist</h2>
        <div className="h-2.5 rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand-600"
            style={{ width: `${o.checklistTotal ? (o.checklistDone / o.checklistTotal) * 100 : 0}%` }} />
        </div>
        <p className="mt-2 text-sm text-slate-600">Đã xong {o.checklistDone} / {o.checklistTotal} việc</p>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold text-slate-800">Hoạt động sắp tới</h2>
        {o.upcoming.length === 0 ? (
          <p className="text-sm text-slate-500">Không có hoạt động sắp tới.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {o.upcoming.map((a) => (
              <li key={a.id} className="py-2">
                <p className="font-medium text-slate-900">{a.title}</p>
                <p className="text-sm text-slate-500">
                  {formatDateWithWeekday(a.day_date)}
                  {a.start_time ? ` · ${formatTime(a.start_time)}` : ''}
                  {a.location_name ? ` · ${a.location_name}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
        <Link to="itinerary" className="mt-2 inline-block text-sm font-medium text-brand-700 hover:underline">Xem lịch trình</Link>
      </Card>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
      <div className="flex justify-center text-brand-700">{icon}</div>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}
