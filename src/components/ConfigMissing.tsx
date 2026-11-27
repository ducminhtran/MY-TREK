import { TriangleAlert } from 'lucide-react'
import { Logo } from './Logo'

/** KT-05: màn hình khi thiếu VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY */
export function ConfigMissing() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Logo />
        <div className="mt-6 flex items-start gap-3 rounded-lg bg-amber-50 p-4 text-amber-900">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <h1 className="font-semibold">Chưa cấu hình Supabase</h1>
            <p className="mt-1 text-sm">
              Ứng dụng cần địa chỉ và khóa công khai (anon key) của Supabase để hoạt động.
            </p>
          </div>
        </div>

        <h2 className="mt-6 text-sm font-semibold text-slate-800">Trên bản deploy (GitHub Pages)</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
          <li>Vào repo GitHub → Settings → Secrets and variables → Actions.</li>
          <li>
            Thêm 2 secret: <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_URL</code> và{' '}
            <code className="rounded bg-slate-100 px-1">VITE_SUPABASE_ANON_KEY</code>.
          </li>
          <li>Vào tab Actions → chạy lại workflow deploy.</li>
        </ol>

        <h2 className="mt-6 text-sm font-semibold text-slate-800">Khi chạy trên máy</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
          <li>
            Sao chép <code className="rounded bg-slate-100 px-1">.env.example</code> thành{' '}
            <code className="rounded bg-slate-100 px-1">.env.local</code>.
          </li>
          <li>Điền URL và anon key lấy ở Supabase → Project Settings → API.</li>
          <li>Chạy lại <code className="rounded bg-slate-100 px-1">npm run dev</code>.</li>
        </ol>

        <p className="mt-6 text-xs text-slate-500">
          Chỉ dùng anon/publishable key. Không bao giờ dùng service_role key ở đây.
        </p>
      </div>
    </div>
  )
}
