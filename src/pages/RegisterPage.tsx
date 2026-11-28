import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { asset, ILLUSTRATIONS } from '../lib/assets'
import { useAuth } from '../auth/AuthProvider'
import { AuthLayout } from '../components/AuthLayout'
import { Button, ErrorAlert, Field, Input, PasswordInput } from '../components/ui'
import { toFriendlyError, type FriendlyError } from '../lib/errors'
import { appUrl, supabase } from '../lib/supabase'
import { isValidEmail, MIN_PASSWORD_LENGTH, validateNewPassword } from '../lib/validation'

type FieldErrors = { fullName?: string; email?: string; password?: string; confirm?: string }

/** AUTH-01: đăng ký */
export function RegisterPage() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<FriendlyError | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  if (session && !sentTo) return <Navigate to="/" replace />

  function validate(): FieldErrors {
    const errors: FieldErrors = { ...validateNewPassword(password, confirm) }
    if (!fullName.trim()) errors.fullName = 'Vui lòng nhập họ tên'
    else if (fullName.trim().length > 200) errors.fullName = 'Họ tên tối đa 200 ký tự'
    if (!isValidEmail(email)) errors.email = 'Email không hợp lệ'
    return errors
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      const cleanEmail = email.trim().toLowerCase()
      const { data, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { full_name: fullName.trim() }, emailRedirectTo: appUrl() },
      })
      if (authError) {
        setError(toFriendlyError(authError))
        return
      }
      // Bật xác nhận email: Supabase không báo lỗi khi email đã tồn tại mà trả user không có identity
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError({ message: 'Email này đã được đăng ký' })
        return
      }
      if (data.session) {
        navigate('/', { replace: true })  // tắt xác nhận email → vào thẳng app
      } else {
        setSentTo(cleanEmail)
      }
    } catch (err) {
      setError(toFriendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (sentTo) {
    return (
      <AuthLayout title="Kiểm tra email" footer={<Link to="/login" className="font-medium text-brand-700 hover:underline">Về trang đăng nhập</Link>}>
        <div className="flex flex-col items-center gap-3 text-center">
          <img src={asset(ILLUSTRATIONS.emailSent)} alt="" className="h-32 w-auto" draggable={false} />
          <p className="text-sm text-slate-700">
            Chúng tôi đã gửi liên kết xác nhận tới <strong className="break-all">{sentTo}</strong>.
          </p>
          <p className="text-sm text-slate-500">
            Mở email và bấm liên kết, <strong>nên mở trên chính trình duyệt này</strong> để tự đăng nhập.
            Không thấy email? Kiểm tra mục Spam/Quảng cáo.
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Đăng ký"
      subtitle="Tạo tài khoản để quản lý chuyến đi"
      footer={
        <>
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-medium text-brand-700 hover:underline">Đăng nhập</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <ErrorAlert error={error} />}
        <Field label="Họ tên" htmlFor="reg-name" required error={fieldErrors.fullName}>
          <Input id="reg-name" autoComplete="name" maxLength={200} aria-invalid={!!fieldErrors.fullName}
            value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="Email" htmlFor="reg-email" required error={fieldErrors.email}>
          <Input id="reg-email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!fieldErrors.email}
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Mật khẩu" htmlFor="reg-password" required error={fieldErrors.password}
          hint={`Ít nhất ${MIN_PASSWORD_LENGTH} ký tự`}>
          <PasswordInput id="reg-password" autoComplete="new-password" aria-invalid={!!fieldErrors.password}
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Nhập lại mật khẩu" htmlFor="reg-confirm" required error={fieldErrors.confirm}>
          <PasswordInput id="reg-confirm" autoComplete="new-password" aria-invalid={!!fieldErrors.confirm}
            value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <Button type="submit" className="w-full" loading={submitting}>Đăng ký</Button>
      </form>
    </AuthLayout>
  )
}
