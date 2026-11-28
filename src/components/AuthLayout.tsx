import type { ReactNode } from 'react'
import { Logo } from './Logo'
import { asset, ILLUSTRATIONS } from '../lib/assets'

type AuthLayoutProps = {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

/** Khung chung cho các trang đăng nhập / đăng ký / quên mật khẩu */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="pt-safe pb-safe flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex justify-center">
          <Logo />
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <img
            src={asset(ILLUSTRATIONS.authHero)}
            alt=""
            className="h-32 w-full select-none object-cover object-[center_35%] sm:h-40"
            draggable={false}
          />
          <div className="p-6">
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-5">{children}</div>
          </div>
        </div>
        {footer && <div className="mt-4 text-center text-sm text-slate-600">{footer}</div>}
      </div>
    </div>
  )
}
