import { useState, type FormEvent } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { ILLUSTRATIONS } from '../../lib/assets'
import { ConfirmDialog } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Button, EmptyState, ErrorAlert, ErrorState, Input, SELECT_CLASS, Spinner } from '../../components/ui'
import { useAddChecklistItems, useChecklist, useDeleteChecklistItem } from '../../hooks/checklist'
import { useTripMembers } from '../../hooks/members'
import { toFriendlyError } from '../../lib/errors'
import type { ChecklistCategory, ChecklistInput, ChecklistItem } from '../../types'
import { CHECKLIST_GROUPS, ChecklistRow } from './ChecklistRow'
import { ChecklistItemForm } from './ChecklistItemForm'
import { useTripContext } from './context'

/** CHK-04: mẫu gợi ý khi checklist trống */
const TEMPLATE: { title: string; category: ChecklistCategory }[] = [
  { title: 'CCCD / Hộ chiếu', category: 'giay_to' },
  { title: 'Vé máy bay / tàu xe', category: 'giay_to' },
  { title: 'Xác nhận đặt phòng', category: 'giay_to' },
  { title: 'Bảo hiểm du lịch', category: 'giay_to' },
  { title: 'Đổi ngoại tệ', category: 'viec_can_lam' },
  { title: 'SIM / eSIM', category: 'viec_can_lam' },
  { title: 'Sạc dự phòng', category: 'hanh_ly' },
  { title: 'Thuốc cá nhân', category: 'hanh_ly' },
  { title: 'Kem chống nắng', category: 'hanh_ly' },
  { title: 'Quần áo', category: 'hanh_ly' },
]

/** CHK-01 → CHK-04 */
export function ChecklistTab() {
  const { trip, canEdit } = useTripContext()
  const toast = useToast()
  const checklist = useChecklist(trip.id)
  const members = useTripMembers(trip.id)
  const add = useAddChecklistItems(trip.id)
  const remove = useDeleteChecklistItem(trip.id)

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<ChecklistCategory>('hanh_ly')
  const [assignee, setAssignee] = useState('')
  const [due, setDue] = useState('')
  const [editing, setEditing] = useState<ChecklistItem | null>(null)
  const [deleting, setDeleting] = useState<ChecklistItem | null>(null)

  if (checklist.isPending) return <Spinner />
  if (checklist.isError) return <ErrorState error={toFriendlyError(checklist.error)} onRetry={() => void checklist.refetch()} />

  const items = checklist.data
  const memberList = members.data ?? []
  const done = items.filter((i) => i.is_done).length
  const nextOrder = items.reduce((max, i) => Math.max(max, i.sort_order), -1) + 1
  const nameOf = (id: string | null) => (id ? memberList.find((m) => m.id === id)?.display_name ?? null : null)

  // CHK-02: thêm nhanh
  function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!title.trim()) return
    const input: ChecklistInput = { title: title.trim(), category, assignee_id: assignee || null, due_date: due || null }
    add.mutate({ items: [input], startOrder: nextOrder }, { onSuccess: () => { setTitle(''); setDue('') } })
  }

  function addTemplate() {
    add.mutate({ items: TEMPLATE.map((t) => ({ ...t, assignee_id: null, due_date: null })), startOrder: nextOrder }, {
      onSuccess: () => toast('Đã thêm mẫu gợi ý'),
    })
  }

  return (
    <div className="space-y-4">
      {/* CHK-01: tiến độ tổng */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-semibold text-slate-800">Tiến độ</span>
          <span className="text-slate-600">{done}/{items.length} việc</span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand-600" style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} />
        </div>
      </div>

      {canEdit && (
        <form onSubmit={handleAdd} className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3">
          <Input aria-label="Tên việc" placeholder="Thêm việc, VD: Mang ô" maxLength={200} className="min-w-48 flex-[2_1_12rem]"
            value={title} onChange={(e) => setTitle(e.target.value)} />
          <select aria-label="Nhóm" className={`${SELECT_CLASS} flex-[1_1_8rem]`} value={category} onChange={(e) => setCategory(e.target.value as ChecklistCategory)}>
            {CHECKLIST_GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
          <select aria-label="Người phụ trách" className={`${SELECT_CLASS} flex-[1_1_8rem]`} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Chưa giao</option>
            {memberList.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
          </select>
          <Input aria-label="Hạn" type="date" className="flex-[1_1_9rem]" value={due} onChange={(e) => setDue(e.target.value)} />
          <Button type="submit" loading={add.isPending} disabled={!title.trim()} className="flex-[1_1_6rem]">
            <Plus className="size-4" aria-hidden />
            Thêm
          </Button>
        </form>
      )}
      {add.error && <ErrorAlert error={toFriendlyError(add.error)} />}

      {items.length === 0 ? (
        <EmptyState
          image={ILLUSTRATIONS.emptyChecklist}
          title="Checklist đang trống"
          description="Ghi lại hành lý, giấy tờ và việc cần làm trước chuyến đi."
          action={canEdit ? (
            <Button variant="secondary" onClick={addTemplate} loading={add.isPending}>
              <Sparkles className="size-4" aria-hidden />
              Thêm mẫu gợi ý
            </Button>
          ) : undefined}
        />
      ) : (
        CHECKLIST_GROUPS.map((g) => {
          const groupItems = items.filter((i) => i.category === g.value)
          if (groupItems.length === 0) return null
          return (
            <section key={g.value}>
              <h3 className="mb-2 text-sm font-semibold text-slate-500">
                {g.label} ({groupItems.filter((i) => i.is_done).length}/{groupItems.length})
              </h3>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                {groupItems.map((i) => (
                  <ChecklistRow key={i.id} item={i} assigneeName={nameOf(i.assignee_id)}
                    onEdit={() => setEditing(i)} onDelete={() => { remove.reset(); setDeleting(i) }} />
                ))}
              </ul>
            </section>
          )
        })
      )}

      <ChecklistItemForm tripId={trip.id} members={memberList} item={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={deleting !== null}
        title="Xóa việc"
        message={
          <>
            <p>Xóa <strong>{deleting?.title}</strong> khỏi checklist?</p>
            {remove.error && <div className="mt-3"><ErrorAlert error={toFriendlyError(remove.error)} /></div>}
          </>
        }
        confirmLabel="Xóa"
        danger
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}
