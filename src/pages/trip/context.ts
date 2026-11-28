import { useOutletContext } from 'react-router'
import type { Trip, TripRole } from '../../types'

/** Dữ liệu chuyến đi dùng chung cho mọi tab */
export type TripContextValue = {
  trip: Trip
  role: TripRole
  myMemberId: string
  /** Owner/Editor: được ghi dữ liệu (mục 5.2) – UI chỉ ẩn/khóa nút, quyền thật do RLS */
  canEdit: boolean
  isOwner: boolean
}

export function useTripContext(): TripContextValue {
  return useOutletContext<TripContextValue>()
}
