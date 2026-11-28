import type { ReactNode } from 'react'
import { Logo } from './Logo'

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
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-5">{children}</div>
        </div>
        {footer && <div className="mt-4 text-center text-sm text-slate-600">{footer}</div>}
      </div>
    </div>
  )
}
