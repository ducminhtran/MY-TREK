import { CalendarClock, Pencil, Trash2, User } from 'lucide-react'
import { useToast } from '../../components/Toast'
import { Button } from '../../components/ui'
import { useSetChecklistDone } from '../../hooks/checklist'
import { toFriendlyError } from '../../lib/errors'
import { formatDate, toISODate } from '../../lib/format'
import type { ChecklistCategory, ChecklistItem } from '../../types'
import { useTripContext } from './context'

export const CHECKLIST_GROUPS: { value: ChecklistCategory; label: string }[] = [
  { value: 'hanh_ly', label: 'Hành lý' },
  { value: 'giay_to', label: 'Giấy tờ' },
  { value: 'viec_can_lam', label: 'Việc cần làm' },
]

type Props = {
  item: ChecklistItem
  assigneeName: string | null
  onEdit: () => void
  onDelete: () => void
}

/** CHK-03: 1 dòng checklist – gạch ngang khi xong */
export function ChecklistRow({ item, assigneeName, onEdit, onDelete }: Props) {
  const { trip, canEdit, myMemberId } = useTripContext()
  const toast = useToast()
  const setDone = useSetChecklistDone(trip.id)

  // Q-05: Viewer chỉ tick được mục giao cho chính mình
  const canToggle = canEdit || item.assignee_id === myMemberId
  const overdue = !item.is_done && item.due_date !== null && item.due_date < toISODate(new Date())

  function toggle() {
    setDone.mutate(
      { id: item.id, done: !item.is_done },
      { onError: (err) => toast(toFriendlyError(err).message, 'error') },
    )
  }

  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <input
        type="checkbox"
        className="size-6 shrink-0 accent-brand-700 disabled:opacity-40"
        checked={item.is_done}
        disabled={!canToggle || setDone.isPending}
        onChange={toggle}
        aria-label={item.is_done ? `Bỏ đánh dấu ${item.title}` : `Đánh dấu xong ${item.title}`}
      />
      <div className="min-w-0 flex-1 py-1">
        <p className={item.is_done ? 'text-slate-400 line-through' : 'text-slate-900'}>{item.title}</p>
        {(assigneeName || item.due_date) && (
          <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
            {assigneeName && (
              <span className="flex items-center gap-1"><User className="size-3.5" aria-hidden />{assigneeName}</span>
            )}
            {item.due_date && (
              <span className={`flex items-center gap-1 ${overdue ? 'font-medium text-red-600' : ''}`}>
                <CalendarClock className="size-3.5" aria-hidden />
                Hạn {formatDate(item.due_date)}{overdue ? ' (quá hạn)' : ''}
              </span>
            )}
          </p>
        )}
      </div>
      {canEdit && (
        <div className="flex shrink-0">
          <Button variant="ghost" className="px-3" onClick={onEdit} aria-label={`Sửa ${item.title}`}>
            <Pencil className="size-4" aria-hidden />
          </Button>
          <Button variant="ghost" className="px-3 text-red-600" onClick={onDelete} aria-label={`Xóa ${item.title}`}>
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      )}
    </li>
  )
}
