import { describe, expect, it } from 'vitest'
import { directionsUrl, enumerateDays, formatTimeRange, groupItineraryByDay, parseCoordinate } from './itinerary'
import type { ItineraryItem } from '../types'

let seq = 0
function item(day: string, start: string | null, extra: Partial<ItineraryItem> = {}): ItineraryItem {
  seq += 1
  return {
    id: `i${seq}`, trip_id: 't', day_date: day, start_time: start, end_time: null, title: `Hoạt động ${seq}`,
    category: 'khac', location_name: null, address: null, lat: null, lng: null, cost_estimate: null,
    note: null, sort_order: 0, created_at: `2026-01-01T00:00:${String(seq).padStart(2, '0')}Z`, ...extra,
  }
}

describe('enumerateDays', () => {
  it('liệt kê ngày, qua tháng và năm', () => {
    expect(enumerateDays('2026-12-30', '2027-01-02')).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02'])
    expect(enumerateDays('2026-12-19', '2026-12-19')).toEqual(['2026-12-19'])
    expect(enumerateDays('2026-12-20', '2026-12-19')).toEqual([])
  })
})

describe('groupItineraryByDay (ITI-01, ITI-05, TRIP-03)', () => {
  it('nhóm theo ngày, có giờ trước, không giờ xếp cuối', () => {
    const a = item('2026-12-19', null, { cost_estimate: 100000 })
    const b = item('2026-12-19', '14:00:00', { cost_estimate: 50000 })
    const c = item('2026-12-19', '08:00:00')
    const d = item('2026-12-21', '09:00:00', { cost_estimate: 20000.5 })
    const out = item('2026-12-25', '10:00:00', { cost_estimate: 1000 })
    const g = groupItineraryByDay([a, b, c, d, out], '2026-12-19', '2026-12-21')

    expect(g.days.map((x) => x.dayNumber)).toEqual([1, 2, 3])
    expect(g.days[0].items.map((x) => x.id)).toEqual([c.id, b.id, a.id])
    expect(g.days[0].totalCost).toBe(150000)
    expect(g.days[1].items).toEqual([])
    expect(g.outside.map((x) => x.id)).toEqual([out.id])
    expect(g.totalCost).toBe(171000.5)
  })

  it('cùng giờ thì theo sort_order', () => {
    const x = item('2026-12-19', '08:00:00', { sort_order: 2 })
    const y = item('2026-12-19', '08:00:00', { sort_order: 1 })
    const g = groupItineraryByDay([x, y], '2026-12-19', '2026-12-19')
    expect(g.days[0].items.map((i) => i.id)).toEqual([y.id, x.id])
  })
})

describe('directionsUrl (ITI-04)', () => {
  it('ưu tiên tọa độ, sau đó tên + địa chỉ', () => {
    expect(directionsUrl({ lat: 11.94, lng: 108.45, location_name: 'Chợ Đà Lạt', address: null }))
      .toBe('https://www.google.com/maps/dir/?api=1&destination=11.94,108.45')
    expect(directionsUrl({ lat: null, lng: null, location_name: 'Chợ Đà Lạt', address: 'Đà Lạt' }))
      .toBe(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent('Chợ Đà Lạt, Đà Lạt')}`)
    expect(directionsUrl({ lat: null, lng: null, location_name: ' ', address: null })).toBeNull()
  })
})

describe('khác', () => {
  it('formatTimeRange', () => {
    expect(formatTimeRange('08:00:00', '10:30:00')).toBe('08:00 – 10:30')
    expect(formatTimeRange('08:00:00', null)).toBe('08:00')
    expect(formatTimeRange(null, '10:00:00')).toBe('')
  })

  it('parseCoordinate không hiểu nhầm dấu chấm là phân cách nghìn', () => {
    expect(parseCoordinate('10.762')).toBe(10.762)
    expect(parseCoordinate('106,66')).toBe(106.66)
    expect(parseCoordinate('-33.5')).toBe(-33.5)
    expect(parseCoordinate('')).toBeNull()
    expect(parseCoordinate('abc')).toBeNaN()
  })
})
