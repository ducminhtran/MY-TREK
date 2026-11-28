import { APP_NAME } from '../lib/constants'
import { asset } from '../lib/assets'

/** Biểu tượng app (cùng ảnh với icon PWA) */
export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return <img src={asset('pwa-192.png')} alt="" className={className} draggable={false} />
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="text-lg font-bold text-brand-800">{APP_NAME}</span>
    </span>
  )
}
