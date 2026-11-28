import { useState } from 'react'
import { CalendarPlus, Plus, TriangleAlert } from 'lucide-react'
import { ConfirmDialog } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Button, ErrorAlert, ErrorState, Spinner } from '../../components/ui'
import { useDeleteItineraryItem, useItinerary } from '../../hooks/itinerary'
import { toFriendlyError } from '../../lib/errors'
import { formatDateWithWeekday, formatMoney, toISODate } from '../../lib/format'
import { groupItineraryByDay } from '../../lib/itinerary'
import type { ItineraryItem } from '../../types'
import { useTripContext } from './context'
import { ItineraryForm } from './ItineraryForm'
import { ItineraryItemCard } from './ItineraryItemCard'

/** ITI-01 → ITI-05 */
export function ItineraryTab() {
  const { trip, canEdit } = useTripContext()
  const toast = useToast()
  const itinerary = useItinerary(trip.id)
  const remove = useDeleteItineraryItem(trip.id)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ItineraryItem | null>(null)
  const [defaultDay, setDefaultDay] = useState(trip.start_date)
  const [deleting, setDeleting] = useState<ItineraryItem | null>(null)

  if (itinerary.isPending) return <Spinner />
  if (itinerary.isError) return <ErrorState error={toFriendlyError(itinerary.error)} onRetry={() => void itinerary.refetch()} />

  const { days, outside, totalCost } = groupItineraryByDay(itinerary.data, trip.start_date, trip.end_date)
  const money = (n: number) => formatMoney(n, trip.base_currency)

  function openAdd(day?: string) {
    const today = toISODate(new Date())
    const inTrip = today >= trip.start_date && today <= trip.end_date
    setEditing(null)
    setDefaultDay(day ?? (inTrip ? today : trip.start_date))
    setFormOpen(true)
  }

  function openEdit(item: ItineraryItem) {
    setEditing(item)
    setFormOpen(true)
  }

  const renderItems = (items: ItineraryItem[]) => (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.id}>
          <ItineraryItemCard item={i} currency={trip.base_currency} canEdit={canEdit}
            onEdit={() => openEdit(i)} onDelete={() => { remove.reset(); setDeleting(i) }} />
        </li>
      ))}
    </ul>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-slate-800">Lịch trình</h2>
          {/* ITI-05: tổng chi phí dự kiến toàn chuyến */}
          <p className="text-sm text-slate-500">Tổng chi phí dự kiến: <strong className="text-slate-800">{money(totalCost)}</strong></p>
        </div>
        {canEdit && (
          <Button onClick={() => openAdd()}>
            <Plus className="size-4" aria-hidden />
            Thêm hoạt động
          </Button>
        )}
      </div>

      {outside.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <h3 className="mb-1 flex items-center gap-2 font-semibold text-amber-900">
            <TriangleAlert className="size-5" aria-hidden />
            Ngoài thời gian chuyến đi ({outside.length})
          </h3>
          <p className="mb-3 text-sm text-amber-800">
            Các hoạt động này có ngày nằm ngoài thời gian chuyến đi (do đã đổi ngày). Hãy sửa ngày hoặc xóa.
          </p>
          {renderItems(outside)}
        </div>
      )}

      {days.map((d) => (
        <section key={d.date} aria-labelledby={`day-${d.date}`}>
          <div className="mb-2 flex items-end justify-between gap-2 border-b border-slate-200 pb-1">
            <h3 id={`day-${d.date}`} className="font-semibold text-slate-900">
              Ngày {d.dayNumber} · {formatDateWithWeekday(d.date)}
            </h3>
            {d.totalCost > 0 && <span className="text-sm text-slate-500">{money(d.totalCost)}</span>}
          </div>
          {d.items.length > 0 ? (
            renderItems(d.items)
          ) : (
            <p className="py-2 text-sm text-slate-400">Chưa có hoạt động.</p>
          )}
          {canEdit && (
            <button type="button" onClick={() => openAdd(d.date)}
              className="mt-1 flex min-h-11 items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
              <CalendarPlus className="size-4" aria-hidden />
              Thêm vào ngày {d.dayNumber}
            </button>
          )}
        </section>
      ))}

      <ItineraryForm trip={trip} open={formOpen} item={editing} defaultDay={defaultDay} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        open={deleting !== null}
        title="Xóa hoạt động"
        message={
          <>
            <p>Xóa hoạt động <strong>{deleting?.title}</strong>?</p>
            {remove.error && <div className="mt-3"><ErrorAlert error={toFriendlyError(remove.error)} /></div>}
          </>
        }
        confirmLabel="Xóa"
        danger
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id, {
          onSuccess: () => {
            toast('Đã xóa hoạt động')
            setDeleting(null)
          },
        })}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}
