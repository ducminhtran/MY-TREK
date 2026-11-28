import { formatTime, parseLocalDate, toISODate } from './format'
import type { ItineraryItem } from '../types'

export type DayGroup = {
  date: string
  /** Ngày thứ mấy của chuyến đi, bắt đầu từ 1 */
  dayNumber: number
  items: ItineraryItem[]
  totalCost: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Danh sách ngày 'YYYY-MM-DD' từ start tới end (gồm cả 2 đầu) */
export function enumerateDays(start: string, end: string): string[] {
  const s = parseLocalDate(start)
  const e = parseLocalDate(end)
  if (!s || !e || e < s) return []
  const days: string[] = []
  for (const d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) days.push(toISODate(d))
  return days
}

/** ITI-01: trong ngày sắp theo giờ bắt đầu (không có giờ xếp cuối), rồi sort_order, rồi thời điểm tạo */
export function compareItems(a: ItineraryItem, b: ItineraryItem): number {
  if (a.day_date !== b.day_date) return a.day_date.localeCompare(b.day_date)
  if (a.start_time !== b.start_time) {
    if (a.start_time === null) return 1
    if (b.start_time === null) return -1
    return a.start_time.localeCompare(b.start_time)
  }
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
  return a.created_at.localeCompare(b.created_at)
}

const costOf = (items: ItineraryItem[]) => round2(items.reduce((sum, i) => sum + (i.cost_estimate ?? 0), 0))

/**
 * ITI-01 + ITI-05: nhóm theo từng ngày của chuyến đi.
 * TRIP-03: hoạt động có ngày nằm ngoài khoảng (do đổi ngày chuyến đi) vào nhóm `outside`, không bị xóa.
 */
export function groupItineraryByDay(items: ItineraryItem[], start: string, end: string) {
  const sorted = [...items].sort(compareItems)
  const days: DayGroup[] = enumerateDays(start, end).map((date, index) => {
    const dayItems = sorted.filter((i) => i.day_date === date)
    return { date, dayNumber: index + 1, items: dayItems, totalCost: costOf(dayItems) }
  })
  const outside = sorted.filter((i) => i.day_date < start || i.day_date > end)
  return { days, outside, totalCost: costOf(sorted) }
}

/** '08:00 – 10:30', '08:00', hoặc '' */
export function formatTimeRange(start: string | null, end: string | null): string {
  if (!start) return ''
  return end ? `${formatTime(start)} – ${formatTime(end)}` : formatTime(start)
}

/** ITI-04: link Google Maps chỉ đường – ưu tiên tọa độ, sau đó tên + địa chỉ */
export function directionsUrl(item: Pick<ItineraryItem, 'lat' | 'lng' | 'location_name' | 'address'>): string | null {
  const base = 'https://www.google.com/maps/dir/?api=1&destination='
  if (item.lat !== null && item.lng !== null) return `${base}${item.lat},${item.lng}`
  const text = [item.location_name, item.address].filter((s) => s && s.trim()).join(', ')
  return text ? base + encodeURIComponent(text) : null
}

/** Đọc tọa độ: chấp nhận dấu phẩy hoặc dấu chấm thập phân. '' → null, sai → NaN */
export function parseCoordinate(raw: string): number | null {
  const s = raw.trim().replace(',', '.')
  if (!s) return null
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : Number.NaN
}
