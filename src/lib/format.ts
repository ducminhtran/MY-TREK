/**
 * Định dạng ngày, giờ, tiền, tên file (mục 9.3).
 * Ngày dạng chuỗi 'YYYY-MM-DD' luôn parse theo giờ địa phương,
 * không dùng new Date('YYYY-MM-DD') vì sẽ bị hiểu là UTC → lệch ngày.
 */

const pad2 = (n: number) => String(n).padStart(2, '0')

/** 'YYYY-MM-DD' → Date (00:00 giờ địa phương). Sai định dạng → null */
export function parseLocalDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(y, mo - 1, d)
  // Chặn ngày không tồn tại như 2026-02-30
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null
  return date
}

/** Date → 'YYYY-MM-DD' theo giờ địa phương */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** Định dạng hiển thị ngày: 'YYYY-MM-DD' (DB) → 'dd-MM-yyyy' */
export function formatDate(value: string): string {
  const d = parseLocalDate(value)
  if (!d) return value
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`
}

/** Chuỗi 'YYYY-MM-DD' hợp lệ (đúng định dạng lưu DB, ngày có thật) */
export function isValidIsoDate(value: string): boolean {
  return parseLocalDate(value) !== null
}

/** Người dùng gõ 'dd-MM-yyyy' → 'YYYY-MM-DD' để lưu DB. Sai / ngày không tồn tại → null */
export function parseDisplayDate(text: string): string | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(text.trim())
  if (!m) return null
  const iso = `${m[3]}-${m[2]}-${m[1]}`
  return isValidIsoDate(iso) ? iso : null
}

/** Tự chèn dấu '-' khi gõ ngày: '19122026' → '19-12-2026' (chỉ giữ chữ số, tối đa 8 số) */
export function maskDateInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`
}

/** Giờ 24h 'HH:mm' hợp lệ (00:00 → 23:59) */
export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

/** Tự chèn dấu ':' khi gõ giờ: '0830' → '08:30' (tối đa 4 số) */
export function maskTimeInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 4)
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`
}

/** Thứ viết tắt tiếng Việt: CN, T2 … T7 */
export function weekdayShort(date: Date): string {
  const day = date.getDay()
  return day === 0 ? 'CN' : `T${day + 1}`
}

/** 'YYYY-MM-DD' → 'T7, 19-12-2026' */
export function formatDateWithWeekday(value: string): string {
  const d = parseLocalDate(value)
  if (!d) return value
  return `${weekdayShort(d)}, ${formatDate(value)}`
}

/** Giờ 24h: DB trả 'HH:mm:ss' (kiểu time) → 'HH:mm' */
export function formatTime(value: string | null | undefined): string {
  if (!value) return ''
  return value.slice(0, 5)
}

/** Thời điểm (timestamptz ISO từ DB) → 'dd-MM-yyyy HH:mm' theo giờ máy người dùng */
export function formatDateTime(isoTimestamp: string): string {
  const d = new Date(isoTimestamp)
  if (Number.isNaN(d.getTime())) return isoTimestamp
  return `${formatDate(toISODate(d))} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** Số ngày của chuyến đi, tính cả ngày đầu và ngày cuối */
export function countDaysInclusive(start: string, end: string): number {
  const a = parseLocalDate(start)
  const b = parseLocalDate(end)
  if (!a || !b) return 0
  // Dùng UTC để không bị ảnh hưởng giờ mùa hè
  const ms =
    Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
    Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  return Math.round(ms / 86_400_000) + 1
}

/** KT-13: số chữ số thập phân của tiền tệ, tối đa 2 (khớp numeric(18,2)) */
export function currencyDecimals(currency: string): number {
  try {
    const digits = new Intl.NumberFormat('vi-VN', { style: 'currency', currency })
      .resolvedOptions().maximumFractionDigits
    return Math.min(digits ?? 2, 2)
  } catch {
    return 2
  }
}

/** Định dạng tiền: 1.250.000 ₫, 10,50 US$ */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency,
      maximumFractionDigits: currencyDecimals(currency),
    }).format(amount)
  } catch {
    return `${amount.toLocaleString('vi-VN')} ${currency}`
  }
}

/** Định dạng số kiểu Việt Nam, không ký hiệu tiền: 25400 → '25.400', 0.5 → '0,5' */
export function formatNumber(value: number, maxDecimals = 6): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: maxDecimals }).format(value)
}

/**
 * Đọc số người dùng gõ theo kiểu Việt Nam hoặc kiểu máy:
 * '25.400' → 25400; '25.400,5' → 25400.5; '1,5' → 1.5; '1.5' → 1.5; '' → null; sai → NaN
 */
export function parseNumberInput(raw: string): number | null {
  const s = raw.replace(/\s/g, '')
  if (!s) return null
  let normalized: string
  if (s.includes(',')) {
    normalized = s.replace(/\./g, '').replace(',', '.') // có dấu phẩy → dấu chấm là phân cách nghìn
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    normalized = s.replace(/\./g, '') // '25.400', '1.250.000'
  } else {
    normalized = s
  }
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return Number.NaN
  return Number(normalized)
}

/** Bỏ dấu tiếng Việt, chuyển về chữ thường không dấu, chỉ còn a-z 0-9 và '-' */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** KT-11: tên file an toàn cho Storage. 'Hóa đơn (1).PDF' → 'hoa-don-1.pdf' */
export function toSafeFileName(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  const hasExt = dot > 0 && dot < fileName.length - 1
  const base = slugify(hasExt ? fileName.slice(0, dot) : fileName).slice(0, 80) || 'file'
  const ext = hasExt ? slugify(fileName.slice(dot + 1)).replace(/-/g, '').slice(0, 10) : ''
  return ext ? `${base}.${ext}` : base
}
