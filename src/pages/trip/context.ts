import { useOutletContext } from 'react-router'
import type { Trip, TripRole } from '../../types'

/** Dữ liệu chuyến đi dùng chung cho mọi tab */
export type TripContextValue = {
  trip: Trip
  role: TripRole
  myMemberId: string
  /** Owner/Editor VÀ đang online: được ghi dữ liệu (mục 5.2, PWA-03) – UI chỉ ẩn/khóa nút, quyền thật do RLS */
  canEdit: boolean
  /** Vai trò Owner (không phụ thuộc mạng) */
  isOwner: boolean
  /** PWA-03: offline thì khóa mọi nút ghi dữ liệu */
  online: boolean
}

export function useTripContext(): TripContextValue {
  return useOutletContext<TripContextValue>()
}
