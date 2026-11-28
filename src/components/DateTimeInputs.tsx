import { useEffect, useRef, useState } from 'react'
import { CalendarDays, Clock } from 'lucide-react'
import { Input } from './ui'
import { formatDate, isValidIsoDate, isValidTime, maskDateInput, maskTimeInput, parseDisplayDate } from '../lib/format'

/**
 * Ô ngày/giờ có sẵn của trình duyệt (type="date"/"time") hiển thị theo ngôn ngữ của máy
 * (VD 12/19/2026, 2:30 PM) nên không ép được định dạng. Hai ô dưới đây:
 * - luôn HIỂN THỊ 'dd-MM-yyyy' và giờ 24h 'HH:mm', tự chèn dấu khi gõ;
 * - TRẢ RA đúng định dạng lưu DB: ngày 'YYYY-MM-DD', giờ 'HH:mm';
 * - gõ chưa xong / sai → trả ra nguyên chuỗi đã gõ để form báo lỗi (không âm thầm bỏ qua);
 * - nút lịch/đồng hồ mở bộ chọn của hệ điều hành (giá trị luôn chuẩn ISO / 24h).
 */

type BaseProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  className?: string
  'aria-label'?: string
}

type PickerInput = HTMLInputElement & { showPicker?: () => void }

function openPicker(input: PickerInput | null) {
  if (!input) return
  try {
    if (input.showPicker) input.showPicker()
    else input.focus()
  } catch {
    input.focus()
  }
}

/** Đồng bộ chữ hiển thị khi giá trị bị đổi từ bên ngoài (mở form, reset form) */
function useDisplayText(value: string, toText: (v: string) => string) {
  const [text, setText] = useState(() => toText(value))
  const lastEmitted = useRef(value)
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value
      setText(toText(value))
    }
  }, [value, toText])
  return { text, setText, lastEmitted }
}

const dateToText = (v: string) => (isValidIsoDate(v) ? formatDate(v) : v)

/** Ô ngày: hiển thị dd-MM-yyyy, trả ra 'YYYY-MM-DD' */
export function DateInput({ id, value, onChange, invalid, className = '', 'aria-label': ariaLabel }: BaseProps) {
  const { text, setText, lastEmitted } = useDisplayText(value, dateToText)
  const picker = useRef<HTMLInputElement>(null)

  function emit(next: string) {
    lastEmitted.current = next
    onChange(next)
  }

  function handleType(raw: string) {
    const masked = maskDateInput(raw)
    setText(masked)
    emit(masked === '' ? '' : parseDisplayDate(masked) ?? masked)
  }

  return (
    <div className={`relative ${className}`}>
      <Input id={id} aria-label={ariaLabel} inputMode="numeric" placeholder="dd-mm-yyyy" autoComplete="off"
        aria-invalid={invalid} className="pr-12" value={text} onChange={(e) => handleType(e.target.value)} />
      <div className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-brand-700">
        <CalendarDays className="size-5" aria-hidden />
        {/* Ô chọn ngày của hệ điều hành nằm chồng, trong suốt – chạm vào mở lịch (iOS/Android/PC) */}
        <input ref={picker} type="date" tabIndex={-1} aria-label="Chọn ngày trên lịch"
          className="absolute inset-0 cursor-pointer opacity-0"
          value={isValidIsoDate(value) ? value : ''}
          onClick={(e) => openPicker(e.currentTarget)}
          onChange={(e) => {
            const iso = e.target.value
            setText(dateToText(iso))
            emit(iso)
          }} />
      </div>
    </div>
  )
}

const timeToText = (v: string) => (v.length >= 5 && isValidTime(v.slice(0, 5)) ? v.slice(0, 5) : v)

/** Ô giờ 24h: hiển thị và trả ra 'HH:mm' */
export function TimeInput({ id, value, onChange, invalid, className = '', 'aria-label': ariaLabel }: BaseProps) {
  const { text, setText, lastEmitted } = useDisplayText(value, timeToText)
  const picker = useRef<HTMLInputElement>(null)

  function emit(next: string) {
    lastEmitted.current = next
    onChange(next)
  }

  function handleType(raw: string) {
    const masked = maskTimeInput(raw)
    setText(masked)
    emit(masked)
  }

  return (
    <div className={`relative ${className}`}>
      <Input id={id} aria-label={ariaLabel} inputMode="numeric" placeholder="hh:mm" autoComplete="off"
        aria-invalid={invalid} className="pr-12" value={text} onChange={(e) => handleType(e.target.value)} />
      <div className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-brand-700">
        <Clock className="size-5" aria-hidden />
        <input ref={picker} type="time" tabIndex={-1} aria-label="Chọn giờ"
          className="absolute inset-0 cursor-pointer opacity-0"
          value={isValidTime(value) ? value : ''}
          onClick={(e) => openPicker(e.currentTarget)}
          onChange={(e) => {
            // Giá trị của ô time luôn là 24h 'HH:mm' (có thể kèm giây) dù máy hiển thị AM/PM
            const v = e.target.value.slice(0, 5)
            setText(v)
            emit(v)
          }} />
      </div>
    </div>
  )
}

/** Kiểm tra ô ngày cho form. Trả về lỗi hoặc undefined */
export function dateFieldError(value: string, required = false): string | undefined {
  if (!value) return required ? 'Vui lòng nhập ngày' : undefined
  return isValidIsoDate(value) ? undefined : 'Ngày không hợp lệ (dd-mm-yyyy)'
}

/** Kiểm tra ô giờ cho form. Trả về lỗi hoặc undefined */
export function timeFieldError(value: string): string | undefined {
  if (!value) return undefined
  return isValidTime(value) ? undefined : 'Giờ không hợp lệ (hh:mm, 24 giờ)'
}
