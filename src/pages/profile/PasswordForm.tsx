import { useState, type FormEvent } from 'react'
import { Button, ErrorAlert, Field, PasswordInput } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { toFriendlyError, type FriendlyError } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import { MIN_PASSWORD_LENGTH, validateNewPassword } from '../../lib/validation'

/** AUTH-04: đổi mật khẩu khi đang đăng nhập */
export function PasswordForm() {
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({})
  const [error, setError] = useState<FriendlyError | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
      setPassword('')
      setConfirm('')
      toast('Đã đổi mật khẩu')
    } catch (err) {
      setError(toFriendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      {error && <ErrorAlert error={error} />}
      <Field label="Mật khẩu mới" htmlFor="new-password" required error={fieldErrors.password}
        hint={`Ít nhất ${MIN_PASSWORD_LENGTH} ký tự`}>
        <PasswordInput id="new-password" autoComplete="new-password" aria-invalid={!!fieldErrors.password}
          value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Field label="Nhập lại mật khẩu mới" htmlFor="new-password-confirm" required error={fieldErrors.confirm}>
        <PasswordInput id="new-password-confirm" autoComplete="new-password" aria-invalid={!!fieldErrors.confirm}
          value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      <Button type="submit" loading={submitting} disabled={!password}>Đổi mật khẩu</Button>
    </form>
  )
}
