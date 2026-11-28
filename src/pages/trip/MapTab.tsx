import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import { divIcon, latLngBounds, type LatLngTuple } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ErrorState, Field, SELECT_CLASS, Spinner } from '../../components/ui'
import { useItinerary } from '../../hooks/itinerary'
import { toFriendlyError } from '../../lib/errors'
import { formatDateWithWeekday } from '../../lib/format'
import { compareItems, directionsUrl, formatTimeRange } from '../../lib/itinerary'
import type { ItineraryItem } from '../../types'
import { useTripContext } from './context'

type Located = ItineraryItem & { lat: number; lng: number }

const VIETNAM_CENTER: LatLngTuple = [16.0, 106.0]  // MAP-04

/** Marker đánh số (MAP-01) – dùng divIcon, không cần ảnh marker mặc định của Leaflet */
function numberIcon(n: number) {
  return divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:9999px;background:#0f766e;color:#fff;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font:600 13px system-ui,sans-serif">${n}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  })
}

/** MAP-04: tự fit theo các điểm; không có điểm → Việt Nam */
function FitBounds({ points }: { points: LatLngTuple[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) map.setView(VIETNAM_CENTER, 5)
    else if (points.length === 1) map.setView(points[0], 14)
    else map.fitBounds(latLngBounds(points), { padding: [32, 32] })
  }, [map, points])
  return null
}

/** MAP-01 → MAP-06 */
export default function MapTab() {
  const { trip } = useTripContext()
  const itinerary = useItinerary(trip.id)
  const [day, setDay] = useState('all')

  const sorted = useMemo(() => [...(itinerary.data ?? [])].sort(compareItems), [itinerary.data])
  const located = useMemo(
    () => sorted.filter((i): i is Located => i.lat !== null && i.lng !== null),
    [sorted],
  )
  const missing = sorted.filter((i) => i.lat === null || i.lng === null)
  const dayOptions = [...new Set(located.map((i) => i.day_date))]
  const shown = useMemo(() => (day === 'all' ? located : located.filter((i) => i.day_date === day)), [located, day])
  const points = useMemo(() => shown.map((i): LatLngTuple => [i.lat, i.lng]), [shown])

  if (itinerary.isPending) return <Spinner />
  if (itinerary.isError) return <ErrorState error={toFriendlyError(itinerary.error)} onRetry={() => void itinerary.refetch()} />

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <Field label="Lọc theo ngày" htmlFor="map-day">
          <select id="map-day" className={SELECT_CLASS} value={day} onChange={(e) => setDay(e.target.value)}>
            <option value="all">Tất cả ngày</option>
            {dayOptions.map((d) => <option key={d} value={d}>{formatDateWithWeekday(d)}</option>)}
          </select>
        </Field>
      </div>

      {/* relative z-0: giữ các lớp của Leaflet nằm dưới header và hộp thoại */}
      <div className="relative z-0 h-[60dvh] min-h-80 overflow-hidden rounded-xl border border-slate-200 md:h-[520px]">
        <MapContainer center={VIETNAM_CENTER} zoom={5} scrollWheelZoom className="h-full w-full">
          {/* MAP-06: bản quyền OSM */}
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />
          {shown.map((i, index) => {
            const time = formatTimeRange(i.start_time, i.end_time)
            const url = directionsUrl(i)
            return (
              <Marker key={i.id} position={[i.lat, i.lng]} icon={numberIcon(index + 1)}>
                {/* MAP-03 */}
                <Popup>
                  <strong>{i.title}</strong>
                  <br />
                  {formatDateWithWeekday(i.day_date)}{time ? ` · ${time}` : ''}
                  {url && (
                    <>
                      <br />
                      <a href={url} target="_blank" rel="noopener noreferrer">Chỉ đường</a>
                    </>
                  )}
                </Popup>
              </Marker>
            )
          })}
          {/* MAP-02: lọc 1 ngày → nối các điểm theo thứ tự thời gian */}
          {day !== 'all' && points.length > 1 && (
            <Polyline positions={points} pathOptions={{ color: '#0f766e', weight: 3, opacity: 0.8 }} />
          )}
          <FitBounds points={points} />
        </MapContainer>
      </div>

      {located.length === 0 && (
        <p className="text-sm text-slate-500">Chưa có hoạt động nào có tọa độ. Thêm tọa độ trong Lịch trình bằng nút "Tìm tọa độ".</p>
      )}

      {/* MAP-05 */}
      {missing.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 font-semibold text-slate-800">Hoạt động chưa có tọa độ ({missing.length})</h3>
          <ul className="space-y-1 text-sm text-slate-600">
            {missing.map((i) => (
              <li key={i.id}>{formatDateWithWeekday(i.day_date)} · {i.title}</li>
            ))}
          </ul>
          <Link to="../itinerary" relative="path" className="mt-2 inline-block text-sm font-medium text-brand-700 hover:underline">
            Bổ sung trong Lịch trình
          </Link>
        </div>
      )}
    </div>
  )
}
