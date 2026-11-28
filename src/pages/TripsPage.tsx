import { Link } from 'react-router'
import { CalendarDays, Luggage, MapPin, Plus } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { Badge, buttonClass, EmptyState, ErrorState, Spinner } from '../components/ui'
import { useMyTrips } from '../hooks/trips'
import { ROLE_LABELS } from '../lib/constants'
import { toFriendlyError } from '../lib/errors'
import { countDaysInclusive } from '../lib/format'
import { formatDateRange, groupTripsByPhase, type TripPhase } from '../lib/trips'
import type { MyTrip } from '../types'
import { InvitationList } from './home/InvitationList'

const GROUPS: { phase: TripPhase; title: string }[] = [
  { phase: 'ongoing', title: 'Đang diễn ra' },
  { phase: 'upcoming', title: 'Sắp tới' },
  { phase: 'past', title: 'Đã qua' },
]

/** TRIP-01 + MEM-03: chuyến đi của tôi và lời mời */
export function TripsPage() {
  const { user } = useAuth()
  const trips = useMyTrips(user?.id)

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Chuyến đi của tôi</h1>
        <Link to="/trips/new" className={buttonClass('primary', 'hidden md:inline-flex')}>
          <Plus className="size-4" aria-hidden />
          Tạo chuyến đi
        </Link>
      </div>

      <InvitationList />

      {trips.isPending ? (
        <Spinner />
      ) : trips.isError ? (
        <ErrorState error={toFriendlyError(trips.error)} onRetry={() => void trips.refetch()} />
      ) : trips.data.length === 0 ? (
        <EmptyState
          icon={<Luggage className="size-10" aria-hidden />}
          title="Chưa có chuyến đi nào"
          description="Tạo chuyến đi đầu tiên để lên lịch trình, ghi chi tiêu và chia tiền cùng bạn bè."
          action={
            <Link to="/trips/new" className={buttonClass('primary')}>
              <Plus className="size-4" aria-hidden />
              Tạo chuyến đi
            </Link>
          }
        />
      ) : (
        <TripGroups trips={trips.data} />
      )}
    </section>
  )
}

function TripGroups({ trips }: { trips: MyTrip[] }) {
  const groups = groupTripsByPhase(trips)
  return (
    <>
      {GROUPS.filter((g) => groups[g.phase].length > 0).map((g) => (
        <div key={g.phase}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            {g.title} ({groups[g.phase].length})
          </h2>
          <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {groups[g.phase].map((t) => (
              <li key={t.id}>
                <TripCard trip={t} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  )
}

function TripCard({ trip }: { trip: MyTrip }) {
  const days = countDaysInclusive(trip.start_date, trip.end_date)
  return (
    <Link
      to={`/trips/${trip.id}`}
      className="block h-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-200 hover:shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{trip.name}</h3>
        <Badge tone={trip.my_role === 'owner' ? 'brand' : 'slate'}>{ROLE_LABELS[trip.my_role]}</Badge>
      </div>
      {trip.destination && (
        <p className="mt-1 flex items-center gap-1 text-sm text-slate-600">
          <MapPin className="size-4 shrink-0" aria-hidden />
          {trip.destination}
        </p>
      )}
      <p className="mt-1 flex items-center gap-1 text-sm text-slate-600">
        <CalendarDays className="size-4 shrink-0" aria-hidden />
        {formatDateRange(trip.start_date, trip.end_date)} · {days} ngày
      </p>
    </Link>
  )
}
