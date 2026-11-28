import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Button, ErrorAlert, Field, Input, SELECT_CLASS } from '../../components/ui'
import { useAddMember, useUpdateMember, type MemberInput } from '../../hooks/members'
import { toFriendlyError } from '../../lib/errors'
import { isValidEmail } from '../../lib/validation'
import type { TripMember } from '../../types'

type MemberFormProps = {
  tripId: string
  open: boolean
  /** Có giá trị = sửa thành viên; không có = thêm mới */
  member: TripMember | null
  onClose: () => void
}

const FORM_ID = 'member-form'

/** MEM-02 (thêm) / MEM-05 (sửa) – chỉ Owner */
export function MemberForm({ tripId, open, member, onClose }: MemberFormProps) {
  const toast = useToast()
  const add = useAddMember(tripId)
  const update = useUpdateMember(tripId)
  const mutation = member ? update : add

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberInput['role']>('editor')
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({})

  // Nạp lại dữ liệu mỗi lần mở form
  useEffect(() => {
    if (!open) return
    setName(member?.display_name ?? '')
    setEmail(member?.email ?? '')
    setRole(member?.role === 'viewer' ? 'viewer' : 'editor')
    setErrors({})
    add.reset()
    update.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi mở form
  }, [open, member])

  // Email chỉ sửa được khi thành viên chưa có tài khoản
  const emailLocked = !!member?.user_id

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const found: { name?: string; email?: string } = {}
    if (!name.trim()) found.name = 'Vui lòng nhập tên hiển thị'
    else if (name.trim().length > 100) found.name = 'Tên tối đa 100 ký tự'
    if (email.trim() && !isValidEmail(email)) found.email = 'Email không hợp lệ'
    setErrors(found)
    if (Object.keys(found).length > 0) return

    const input: MemberInput = { display_name: name, email, role }
    const done = () => {
      toast(member ? 'Đã lưu thành viên' : email.trim() ? 'Đã thêm và tạo lời mời' : 'Đã thêm thành viên')
      onClose()
    }
    if (member) {
      update.mutate({ id: member.id, patch: emailLocked ? { display_name: name, role } : input }, { onSuccess: done })
    } else {
      add.mutate(input, { onSuccess: done })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={member ? 'Sửa thành viên' : 'Thêm thành viên'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Hủy</Button>
          <Button type="submit" form={FORM_ID} loading={mutation.isPending}>Lưu</Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4" noValidate>
        {mutation.error && <ErrorAlert error={toFriendlyError(mutation.error)} />}
        <Field label="Tên hiển thị" htmlFor="member-name" required error={errors.name}>
          <Input id="member-name" maxLength={100} aria-invalid={!!errors.name} placeholder="VD: Minh, Bé Na…"
            value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field
          label="Email"
          htmlFor="member-email"
          error={errors.email}
          hint={emailLocked
            ? 'Thành viên đã có tài khoản – không sửa được email'
            : 'Có email: người này nhận lời mời bằng tài khoản đúng email. Bỏ trống: thành viên không dùng app (trẻ em, ông bà…)'}
        >
          <Input id="member-email" type="email" inputMode="email" autoComplete="off" disabled={emailLocked}
            aria-invalid={!!errors.email} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Vai trò" htmlFor="member-role">
          <select id="member-role" className={SELECT_CLASS} value={role}
            onChange={(e) => setRole(e.target.value === 'viewer' ? 'viewer' : 'editor')}>
            <option value="editor">Được chỉnh sửa</option>
            <option value="viewer">Chỉ xem</option>
          </select>
        </Field>
      </form>
    </Modal>
  )
}
