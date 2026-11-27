export const APP_NAME = 'My Trek'
export const APP_SHORT_NAME = 'My Trek'
export const BRAND_COLOR = '#0f766e'

export const DEFAULT_CURRENCY = 'VND'
export const MAX_FILE_SIZE_MB = 10
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
export const MAX_TRIP_DAYS = 365

/** Q-07: tiền tệ hay dùng ngoài VND */
export const COMMON_CURRENCIES = [
  'VND', 'USD', 'EUR', 'JPY', 'KRW', 'CNY', 'THB', 'SGD',
  'MYR', 'IDR', 'TWD', 'HKD', 'AUD', 'GBP', 'LAK', 'KHR',
] as const
