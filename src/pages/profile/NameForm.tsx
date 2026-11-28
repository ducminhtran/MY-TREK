import { useEffect, useState, type FormEvent } from 'react'
import { displayNameOf, useAuth } from '../../auth/AuthProvider'
import { Button, ErrorAlert, Field, Input } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { useProfile, useUpdateFullName } from '../../hooks/queries'
import { toFriendlyError } from '../../lib/errors'

/** AUTH-04: sửa họ tên */
export function NameForm() {
  const { user } = useAuth()
  const toast = useToast()
  const profile = useProfile(user?.id)
  const update = useUpdateFullName(user?.id)

  const savedName = profile.data?.full_name ?? displayNameOf(user)
  const [fullName, setFullName] = useState(savedName)
  const [fieldError, setFieldError] = useState<string>()

  // Đồng bộ ô nhập khi dữ liệu profile tải xong
  useEffect(() => {
    if (profile.data) setFullName(profile.data.full_name)
  }, [profile.data])

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const value = fullName.trim()
    if (!value) return setFieldError('Vui lòng nhập họ tên')
    if (value.length > 200) return setFieldError('Họ tên tối đa 200 ký tự')
    setFieldError(undefined)
    update.mutate(value, { onSuccess: () => toast('Đã lưu họ tên') })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      {update.error && <ErrorAlert error={toFriendlyError(update.error)} />}
      <Field label="Họ tên" htmlFor="profile-name" required error={fieldError}>
        <Input id="profile-name" autoComplete="name" maxLength={200} aria-invalid={!!fieldError}
          value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </Field>
      <Button type="submit" loading={update.isPending} disabled={fullName.trim() === savedName}>
        Lưu họ tên
      </Button>
    </form>
  )
}
