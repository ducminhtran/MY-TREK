import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { AuthLayout } from '../components/AuthLayout'
import { Alert, Button, ErrorAlert, Field, Input, PasswordInput } from '../components/ui'
import { toFriendlyError, type FriendlyError } from '../lib/errors'
import { appUrl, supabase } from '../lib/supabase'

/** AUTH-02: đăng nhập bằng email + mật khẩu */
export function LoginPage() {
  const { session, notice, clearNotice } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<FriendlyError | null>(null)
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')

  if (session) return <Navigate to={from} replace />

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setUnconfirmed(false)
    clearNotice()
    setSubmitting(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (authError) {
        setError(toFriendlyError(authError))
        setUnconfirmed(authError.code === 'email_not_confirmed' || /not confirmed/i.test(authError.message))
        return
      }
      navigate(from, { replace: true })
    } catch (err) {
      setError(toFriendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  // Gửi lại email xác nhận khi tài khoản chưa xác nhận
  async function handleResend() {
    setResendState('sending')
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: appUrl() },
    })
    if (resendError) {
      setError(toFriendlyError(resendError))
      setResendState('idle')
    } else {
      setResendState('sent')
    }
  }

  return (
    <AuthLayout
      title="Đăng nhập"
      footer={
        <>
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-medium text-brand-700 hover:underline">Đăng ký</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
        {error && <ErrorAlert error={error} />}
        {unconfirmed && (
          <div className="text-sm">
            {resendState === 'sent' ? (
              <Alert tone="success">Đã gửi lại email xác nhận. Vui lòng kiểm tra hộp thư (cả mục Spam).</Alert>
            ) : (
              <Button variant="secondary" className="w-full" loading={resendState === 'sending'} onClick={handleResend}>
                Gửi lại email xác nhận
              </Button>
            )}
          </div>
        )}

        <Field label="Email" htmlFor="login-email" required>
          <Input id="login-email" type="email" autoComplete="email" inputMode="email" required
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Mật khẩu" htmlFor="login-password" required>
          <PasswordInput id="login-password" autoComplete="current-password" required
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>

        <div className="text-right text-sm">
          <Link to="/forgot-password" className="text-brand-700 hover:underline">Quên mật khẩu?</Link>
        </div>

        <Button type="submit" className="w-full" loading={submitting} disabled={!email.trim() || !password}>
          Đăng nhập
        </Button>
      </form>
    </AuthLayout>
  )
}
