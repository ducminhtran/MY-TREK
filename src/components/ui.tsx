import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { CircleAlert, CircleCheck, Eye, EyeOff, Info, LoaderCircle } from 'lucide-react'
import type { FriendlyError } from '../lib/errors'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 disabled:bg-brand-700/50',
  secondary: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:text-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/50',
  ghost: 'text-slate-700 hover:bg-slate-100 disabled:text-slate-400',
}

/** Class dùng chung cho Button và Link trông như nút (vùng chạm ≥ 44px) */
export function buttonClass(variant: ButtonVariant = 'primary', extra = ''): string {
  return [
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium',
    'transition-colors disabled:cursor-not-allowed',
    VARIANT_CLASS[variant],
    extra,
  ].join(' ')
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  loading?: boolean
}

export function Button({ variant = 'primary', loading = false, className = '', disabled, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, className)} disabled={disabled || loading} {...rest}>
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>
}

export function Spinner({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-slate-500" role="status">
      <LoaderCircle className="size-5 animate-spin" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  )
}

type EmptyStateProps = {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      {icon && <div className="text-brand-700">{icon}</div>}
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      {description && <p className="max-w-sm text-sm text-slate-500">{description}</p>}
      {action}
    </div>
  )
}

// ---------- Form ----------

// text-base (16px) để iOS không tự phóng to khi focus
const INPUT_CLASS =
  'block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 ' +
  'placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 ' +
  'disabled:bg-slate-100 disabled:text-slate-500 aria-[invalid=true]:border-red-500'

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${INPUT_CLASS} ${className}`} {...rest} />
}

export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className="pr-12" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500"
        aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
      >
        {visible ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
      </button>
    </div>
  )
}

type FieldProps = {
  label: string
  htmlFor: string
  required?: boolean
  error?: string
  hint?: string
  children: ReactNode
}

export function Field({ label, htmlFor, required, error, hint, children }: FieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      ) : (
        hint && <p className="text-xs text-slate-500">{hint}</p>
      )}
    </div>
  )
}

// ---------- Thông báo ----------

type Tone = 'error' | 'success' | 'info'

const TONE: Record<Tone, { box: string; icon: ReactNode }> = {
  error: { box: 'bg-red-50 text-red-800', icon: <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden /> },
  success: { box: 'bg-green-50 text-green-800', icon: <CircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden /> },
  info: { box: 'bg-sky-50 text-sky-800', icon: <Info className="mt-0.5 size-5 shrink-0" aria-hidden /> },
}

export function Alert({ tone = 'error', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${TONE[tone].box}`} role={tone === 'error' ? 'alert' : 'status'}>
      {TONE[tone].icon}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

/** Lỗi thân thiện + chi tiết kỹ thuật thu gọn (mục 9.4) */
export function ErrorAlert({ error }: { error: FriendlyError }) {
  return (
    <Alert tone="error">
      <p>{error.message}</p>
      {error.detail && (
        <details className="mt-1 text-xs opacity-80">
          <summary className="cursor-pointer">Chi tiết</summary>
          <p className="mt-1 break-words">{error.detail}</p>
        </details>
      )}
    </Alert>
  )
}
