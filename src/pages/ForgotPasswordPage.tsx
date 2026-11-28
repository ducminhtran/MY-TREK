import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { AuthLayout } from '../components/AuthLayout'
import { Alert, Button, ErrorAlert, Field, Input } from '../components/ui'
import { toFriendlyError, type FriendlyError } from '../lib/errors'
import { appUrl, supabase } from '../lib/supabase'
import { isValidEmail } from '../lib/validation'

/** AUTH-03 (bước 1): nhập email để nhận link đặt lại mật khẩu */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string>()
  const [error, setError] = useState<FriendlyError | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!isValidEmail(email)) {
      setEmailError('Email không hợp lệ')
      return
    }
    setEmailError(undefined)
    setSubmitting(true)
    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: appUrl('reset-password'),
      })
      if (authError) setError(toFriendlyError(authError))
      else setSent(true)
    } catch (err) {
      setError(toFriendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Quên mật khẩu"
      subtitle="Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu."
      footer={<Link to="/login" className="font-medium text-brand-700 hover:underline">Về trang đăng nhập</Link>}
    >
      {sent ? (
        <Alert tone="success">
          Nếu email này đã đăng ký, bạn sẽ nhận được liên kết đặt lại mật khẩu trong vài phút.
          Hãy mở liên kết <strong>trên chính trình duyệt này</strong>. Không thấy email? Kiểm tra mục Spam.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && <ErrorAlert error={error} />}
          <Field label="Email" htmlFor="forgot-email" required error={emailError}>
            <Input id="forgot-email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!emailError}
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full" loading={submitting}>Gửi liên kết</Button>
        </form>
      )}
    </AuthLayout>
  )
}
