import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import { Button, ErrorAlert, Field, Input, SELECT_CLASS } from '../../components/ui'
import { useUpdateChecklistItem } from '../../hooks/checklist'
import { toFriendlyError } from '../../lib/errors'
import type { ChecklistCategory, ChecklistItem, TripMember } from '../../types'
import { CHECKLIST_GROUPS } from './ChecklistRow'
import { DateInput, dateFieldError } from '../../components/DateTimeInputs'

type Props = {
  tripId: string
  members: TripMember[]
  /** null = đóng */
  item: ChecklistItem | null
  onClose: () => void
}

const FORM_ID = 'checklist-form'

/** CHK-03: sửa 1 mục checklist */
export function ChecklistItemForm({ tripId, members, item, onClose }: Props) {
  const update = useUpdateChecklistItem(tripId)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<ChecklistCategory>('hanh_ly')
  const [assignee, setAssignee] = useState('')
  const [due, setDue] = useState('')
  const [titleError, setTitleError] = useState<string>()
  const [dueError, setDueError] = useState<string>()

  useEffect(() => {
    if (!item) return
    setTitle(item.title)
    setCategory(item.category)
    setAssignee(item.assignee_id ?? '')
    setDue(item.due_date ?? '')
    setTitleError(undefined)
    setDueError(undefined)
    update.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ nạp lại khi đổi mục
  }, [item])

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!item) return
    const dueProblem = dateFieldError(due)
    setDueError(dueProblem)
    if (!title.trim()) {
      setTitleError('Vui lòng nhập tên việc')
      return
    }
    if (dueProblem) return
    update.mutate(
      { id: item.id, input: { title: title.trim(), category, assignee_id: assignee || null, due_date: due || null } },
      { onSuccess: onClose },
    )
  }

  return (
    <Modal
      open={item !== null}
      onClose={onClose}
      title="Sửa việc"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Hủy</Button>
          <Button type="submit" form={FORM_ID} loading={update.isPending}>Lưu</Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4" noValidate>
        {update.error && <ErrorAlert error={toFriendlyError(update.error)} />}
        <Field label="Tên việc" htmlFor="chk-title" required error={titleError}>
          <Input id="chk-title" maxLength={200} aria-invalid={!!titleError} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Nhóm" htmlFor="chk-group">
          <select id="chk-group" className={SELECT_CLASS} value={category} onChange={(e) => setCategory(e.target.value as ChecklistCategory)}>
            {CHECKLIST_GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </Field>
        <Field label="Người phụ trách" htmlFor="chk-assignee">
          <select id="chk-assignee" className={SELECT_CLASS} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Chưa giao</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
          </select>
        </Field>
        <Field label="Hạn" htmlFor="chk-due" error={dueError}>
          <DateInput id="chk-due" invalid={!!dueError} value={due} onChange={setDue} />
        </Field>
      </form>
    </Modal>
  )
}
