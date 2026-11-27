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

/** 'YYYY-MM-DD' → 'dd/MM/yyyy' */
export function formatDate(value: string): string {
  const d = parseLocalDate(value)
  if (!d) return value
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`
}

/** Thứ viết tắt tiếng Việt: CN, T2 … T7 */
export function weekdayShort(date: Date): string {
  const day = date.getDay()
  return day === 0 ? 'CN' : `T${day + 1}`
}

/** 'YYYY-MM-DD' → 'T7, 19/12/2026' */
export function formatDateWithWeekday(value: string): string {
  const d = parseLocalDate(value)
  if (!d) return value
  return `${weekdayShort(d)}, ${formatDate(value)}`
}

/** 'HH:mm' hoặc 'HH:mm:ss' → 'HH:mm' */
export function formatTime(value: string | null | undefined): string {
  if (!value) return ''
  return value.slice(0, 5)
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
