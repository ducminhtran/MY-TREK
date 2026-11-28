import { MAX_TRIP_DAYS, ROLE_LABELS } from './constants'
import { countDaysInclusive, formatDate, parseLocalDate, toISODate } from './format'
import type { TripInput, TripMember, TripRole } from '../types'

export type TripPhase = 'ongoing' | 'upcoming' | 'past'

/** TRIP-01: so sánh chuỗi 'YYYY-MM-DD' là đủ chính xác */
export function tripPhase(start: string, end: string, today: string = toISODate(new Date())): TripPhase {
  if (today < start) return 'upcoming'
  if (today > end) return 'past'
  return 'ongoing'
}

type Dated = { start_date: string; end_date: string }

export function groupTripsByPhase<T extends Dated>(trips: T[], today: string = toISODate(new Date())) {
  const groups: Record<TripPhase, T[]> = { ongoing: [], upcoming: [], past: [] }
  for (const t of trips) groups[tripPhase(t.start_date, t.end_date, today)].push(t)
  const asc = (a: T, b: T) => a.start_date.localeCompare(b.start_date)
  groups.ongoing.sort(asc)
  groups.upcoming.sort(asc)
  groups.past.sort((a, b) => b.start_date.localeCompare(a.start_date))
  return groups
}

/** '19/12 – 21/12/2026'; khác năm thì ghi đủ cả hai */
export function formatDateRange(start: string, end: string): string {
  const s = parseLocalDate(start)
  const e = parseLocalDate(end)
  if (!s || !e) return `${start} – ${end}`
  if (start === end) return formatDate(start)
  if (s.getFullYear() !== e.getFullYear()) return `${formatDate(start)} – ${formatDate(end)}`
  return `${formatDate(start).slice(0, 5)} – ${formatDate(end)}`
}

export type MemberState = 'joined' | 'invited' | 'offline'

/** MEM-01: Đã tham gia / Đang chờ / Không dùng app */
export function memberState(m: Pick<TripMember, 'user_id' | 'status'>): MemberState {
  if (m.user_id) return 'joined'
  return m.status === 'invited' ? 'invited' : 'offline'
}

export const MEMBER_STATE_LABELS: Record<MemberState, string> = {
  joined: 'Đã tham gia',
  invited: 'Đang chờ',
  offline: 'Không dùng app',
}

/** MEM-04: đoạn text mời để gửi qua Zalo/Messenger */
export function buildInvitationText(p: {
  tripName: string
  start: string
  end: string
  email: string
  role: TripRole
  appLink: string
}): string {
  return [
    `Mời bạn tham gia chuyến đi "${p.tripName}" (${formatDateRange(p.start, p.end)}) trên My Trek – vai trò: ${ROLE_LABELS[p.role]}.`,
    '',
    `1. Mở: ${p.appLink}`,
    `2. Đăng ký hoặc đăng nhập bằng ĐÚNG email: ${p.email}`,
    '3. Ở trang chủ, mục "Lời mời", bấm "Chấp nhận".',
  ].join('\n')
}

export type TripInputErrors = Partial<Record<keyof TripInput, string>>

/** TRIP-02 / BR-01 */
export function validateTripInput(input: TripInput): TripInputErrors {
  const errors: TripInputErrors = {}
  const name = input.name.trim()
  if (!name) errors.name = 'Vui lòng nhập tên chuyến đi'
  else if (name.length > 200) errors.name = 'Tên tối đa 200 ký tự'
  if (input.destination.trim().length > 200) errors.destination = 'Điểm đến tối đa 200 ký tự'
  if (!parseLocalDate(input.start_date)) errors.start_date = 'Vui lòng chọn ngày bắt đầu'
  if (!parseLocalDate(input.end_date)) errors.end_date = 'Vui lòng chọn ngày kết thúc'
  if (!errors.start_date && !errors.end_date) {
    if (input.end_date < input.start_date) errors.end_date = 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu'
    else if (countDaysInclusive(input.start_date, input.end_date) > MAX_TRIP_DAYS)
      errors.end_date = `Chuyến đi tối đa ${MAX_TRIP_DAYS} ngày`
  }
  if (!/^[A-Z]{3}$/.test(input.base_currency)) errors.base_currency = 'Tiền tệ không hợp lệ'
  if (input.budget !== null && (!Number.isFinite(input.budget) || input.budget < 0))
    errors.budget = 'Ngân sách phải là số ≥ 0'
  if (input.description.length > 2000) errors.description = 'Mô tả tối đa 2000 ký tự'
  return errors
}
