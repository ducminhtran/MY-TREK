import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { AuthLayout } from '../components/AuthLayout'
import { Alert, Button, ErrorAlert, Field, PasswordInput, Spinner, buttonClass } from '../components/ui'
import { useToast } from '../components/Toast'
import { toFriendlyError, type FriendlyError } from '../lib/errors'
import { supabase } from '../lib/supabase'
import { MIN_PASSWORD_LENGTH, validateNewPassword } from '../lib/validation'

/** AUTH-03 (bước 2): link trong email mở trang này → đặt mật khẩu mới */
export function ResetPasswordPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({})
  const [error, setError] = useState<FriendlyError | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <AuthLayout title="Đặt lại mật khẩu">
        <Spinner />
      </AuthLayout>
    )
  }

  // Không có phiên: link hết hạn, đã dùng, hoặc mở trên trình duyệt khác (PKCE – KT-03)
  if (!session) {
    return (
      <AuthLayout title="Đặt lại mật khẩu">
        <div className="space-y-4">
          <Alert tone="error">
            Liên kết đặt lại mật khẩu đã hết hạn hoặc không hợp lệ. Lưu ý: cần mở liên kết trên{' '}
            <strong>cùng trình duyệt</strong> đã dùng để yêu cầu.
          </Alert>
          <Link to="/forgot-password" className={buttonClass('primary', 'w-full')}>Gửi lại liên kết</Link>
        </div>
      </AuthLayout>
    )
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const errors = validateNewPassword(password, confirm)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      const { error: authError } = await supabase.auth.updateUser({ password })
      if (authError) {
        setError(toFriendlyError(authError))
        return
      }
      toast('Đã đặt mật khẩu mới')
      navigate('/', { replace: true })
    } catch (err) {
      setError(toFriendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Đặt mật khẩu mới" subtitle={session.user.email}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <ErrorAlert error={error} />}
        <Field label="Mật khẩu mới" htmlFor="reset-password" required error={fieldErrors.password}
          hint={`Ít nhất ${MIN_PASSWORD_LENGTH} ký tự`}>
          <PasswordInput id="reset-password" autoComplete="new-password" aria-invalid={!!fieldErrors.password}
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Nhập lại mật khẩu mới" htmlFor="reset-confirm" required error={fieldErrors.confirm}>
          <PasswordInput id="reset-confirm" autoComplete="new-password" aria-invalid={!!fieldErrors.confirm}
            value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <Button type="submit" className="w-full" loading={submitting}>Lưu mật khẩu</Button>
      </form>
    </AuthLayout>
  )
}
