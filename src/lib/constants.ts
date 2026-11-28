import type { TripRole } from '../types'

export const APP_NAME = 'My Trek'
export const APP_SHORT_NAME = 'My Trek'
export const BRAND_COLOR = '#0f766e'

export const DEFAULT_CURRENCY = 'VND'
export const MAX_FILE_SIZE_MB = 10
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
export const MAX_TRIP_DAYS = 365

/** Q-07: tiền tệ hay dùng */
export const COMMON_CURRENCIES = [
  'VND', 'USD', 'EUR', 'JPY', 'KRW', 'CNY', 'THB', 'SGD',
  'MYR', 'IDR', 'TWD', 'HKD', 'AUD', 'GBP', 'LAK', 'KHR',
] as const

export const ROLE_LABELS: Record<TripRole, string> = {
  owner: 'Chủ chuyến đi',
  editor: 'Được chỉnh sửa',
  viewer: 'Chỉ xem',
}

/** Hạng mục dùng chung cho lịch trình và chi tiêu */
export const CATEGORY_LABELS: Record<string, string> = {
  di_chuyen: 'Di chuyển',
  luu_tru: 'Lưu trú',
  an_uong: 'Ăn uống',
  tham_quan: 'Tham quan',
  mua_sam: 'Mua sắm',
  khac: 'Khác',
}
