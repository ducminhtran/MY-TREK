import { Clock, MapPin, Navigation, Pencil, Trash2 } from 'lucide-react'
import { Badge, Button, buttonClass } from '../../components/ui'
import { CATEGORY_LABELS } from '../../lib/constants'
import { formatMoney } from '../../lib/format'
import { directionsUrl, formatTimeRange } from '../../lib/itinerary'
import type { ItineraryItem } from '../../types'

type Props = {
  item: ItineraryItem
  currency: string
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
}

/** 1 hoạt động trong lịch trình */
export function ItineraryItemCard({ item, currency, canEdit, onEdit, onDelete }: Props) {
  const time = formatTimeRange(item.start_time, item.end_time)
  const directions = directionsUrl(item)

  return (
    <div className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="w-14 shrink-0 text-sm font-semibold text-brand-800">
        {time ? (
          <span className="flex items-center gap-1"><Clock className="size-3.5 shrink-0" aria-hidden />{time.split(' – ')[0]}</span>
        ) : (
          <span className="text-xs font-normal text-slate-400">Chưa đặt giờ</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-slate-900">{item.title}</p>
          <Badge>{CATEGORY_LABELS[item.category] ?? item.category}</Badge>
        </div>
        {time.includes('–') && <p className="text-xs text-slate-500">{time}</p>}
        {(item.location_name || item.address) && (
          <p className="mt-1 flex items-start gap-1 text-sm text-slate-600">
            <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>{[item.location_name, item.address].filter(Boolean).join(' · ')}</span>
          </p>
        )}
        {item.cost_estimate !== null && item.cost_estimate > 0 && (
          <p className="mt-1 text-sm text-slate-700">Dự kiến: {formatMoney(item.cost_estimate, currency)}</p>
        )}
        {item.note && <p className="mt-1 whitespace-pre-line text-sm text-slate-500">{item.note}</p>}

        <div className="mt-2 flex flex-wrap gap-1">
          {directions && (
            <a href={directions} target="_blank" rel="noopener noreferrer" className={buttonClass('secondary')}>
              <Navigation className="size-4" aria-hidden />
              Chỉ đường
            </a>
          )}
          {canEdit && (
            <>
              <Button variant="ghost" onClick={onEdit} aria-label={`Sửa ${item.title}`}>
                <Pencil className="size-4" aria-hidden />
              </Button>
              <Button variant="ghost" className="text-red-600" onClick={onDelete} aria-label={`Xóa ${item.title}`}>
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
