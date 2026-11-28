import { useState } from 'react'
import { useNavigate } from 'react-router'
import { LogOut } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { Button, Card } from '../components/ui'
import { useToast } from '../components/Toast'
import { NameForm } from './profile/NameForm'
import { PasswordForm } from './profile/PasswordForm'
import { InstallCard } from './profile/InstallCard'

/** AUTH-04: trang Tài khoản */
export function ProfilePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut()
    } catch {
      // Phiên trên máy đã được xóa dù gọi máy chủ lỗi (VD: offline)
    }
    toast('Đã đăng xuất', 'info')
    navigate('/login', { replace: true })
  }

  return (
    <section className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Tài khoản</h1>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-800">Thông tin cá nhân</h2>
        <p className="mb-3 text-sm text-slate-500">
          Email: <span className="break-all font-medium text-slate-700">{user?.email}</span>
        </p>
        <NameForm />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-800">Đổi mật khẩu</h2>
        <PasswordForm />
      </Card>

      <InstallCard />

      <Card>
        <Button variant="secondary" className="w-full text-red-700" loading={signingOut} onClick={handleSignOut}>
          <LogOut className="size-4" aria-hidden />
          Đăng xuất
        </Button>
      </Card>
    </section>
  )
}
