import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from './constants'
import { toSafeFileName } from './format'

/** KT-11 / BR-12: '<trip_id>/<uuid>-<ten-khong-dau>.<ext>' – tên gốc lưu ở bảng attachments */
export function buildStoragePath(tripId: string, fileName: string, uuid: string = crypto.randomUUID()): string {
  return `${tripId}/${uuid}-${toSafeFileName(fileName)}`
}

/** 1536 → '1,5 KB' */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i += 1
  }
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value)} ${units[i]}`
}

export type FileKind = 'image' | 'pdf' | 'other'

export function fileKind(mime: string | null, name: string): FileKind {
  if (mime?.startsWith('image/') || /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(name)) return 'image'
  if (mime === 'application/pdf' || /\.pdf$/i.test(name)) return 'pdf'
  return 'other'
}

/** FILE-01: kiểm tra trước khi tải lên. Trả về lỗi hoặc null */
export function validateUpload(file: { size: number }): string | null {
  if (file.size === 0) return 'Tệp rỗng, vui lòng chọn tệp khác'
  if (file.size > MAX_FILE_SIZE_BYTES) return `Tệp vượt quá ${MAX_FILE_SIZE_MB} MB`
  return null
}
