import { APP_NAME } from '../lib/constants'

/** Biểu tượng núi + mặt trời, cùng thiết kế với favicon.svg */
export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden>
      <rect width="512" height="512" rx="112" fill="#0f766e" />
      <circle cx="352" cy="168" r="44" fill="#fde68a" />
      <path d="M80 392 L208 200 L272 296 L320 232 L432 392 Z" fill="#ffffff" />
      <path d="M208 200 L240 248 L218 240 L196 262 L176 248 Z" fill="#99f6e4" />
    </svg>
  )
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="text-lg font-bold text-brand-800">{APP_NAME}</span>
    </span>
  )
}
