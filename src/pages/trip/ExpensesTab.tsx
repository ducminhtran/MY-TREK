import { useState } from 'react'
import { Paperclip, Plus, Receipt } from 'lucide-react'
import { ConfirmDialog } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Badge, Button, Card, EmptyState, ErrorAlert, ErrorState, Spinner } from '../../components/ui'
import { useDeleteExpense, useExpenses } from '../../hooks/expenses'
import { useTripMembers } from '../../hooks/members'
import { CATEGORY_LABELS } from '../../lib/constants'
import { toFriendlyError } from '../../lib/errors'
import { formatDateWithWeekday, formatMoney } from '../../lib/format'
import type { Expense } from '../../types'
import { useTripContext } from './context'
import { ExpenseForm } from './ExpenseForm'

/** EXP-01, EXP-06 */
export function ExpensesTab() {
  const { trip, canEdit, myMemberId } = useTripContext()
  const toast = useToast()
  const expenses = useExpenses(trip.id)
  const members = useTripMembers(trip.id)
  const remove = useDeleteExpense(trip.id)

  const [filter, setFilter] = useState<string>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [deleting, setDeleting] = useState<Expense | null>(null)

  if (expenses.isPending || members.isPending) return <Spinner />
  if (expenses.isError) return <ErrorState error={toFriendlyError(expenses.error)} onRetry={() => void expenses.refetch()} />
  if (members.isError) return <ErrorState error={toFriendlyError(members.error)} onRetry={() => void members.refetch()} />

  const nameOf = new Map(members.data.map((m) => [m.id, m.display_name]))
  const money = (n: number, cur = trip.base_currency) => formatMoney(n, cur)
  const all = expenses.data
  const total = Math.round(all.reduce((s, e) => s + e.amount_base, 0) * 100) / 100
  const budget = trip.budget === null ? null : Number(trip.budget)
  const categories = [...new Set(all.map((e) => e.category))]
  const shown = filter === 'all' ? all : all.filter((e) => e.category === filter)

  // Nhóm theo ngày, mới nhất trước (dữ liệu đã sắp sẵn)
  const groups: { date: string; items: Expense[] }[] = []
  for (const e of shown) {
    const last = groups[groups.length - 1]
    if (last && last.date === e.expense_date) last.items.push(e)
    else groups.push({ date: e.expense_date, items: [e] })
  }

  function openForm(e: Expense | null) {
    setEditing(e)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* EXP-06 */}
      <Card className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Tổng chi ({all.length} khoản)</p>
          <p className={`text-2xl font-bold ${budget !== null && total > budget ? 'text-red-600' : 'text-slate-900'}`}>{money(total)}</p>
          {budget !== null && budget > 0 && (
            <p className="text-sm text-slate-500">
              Ngân sách {money(budget)} · {total > budget ? `vượt ${money(total - budget)}` : `còn ${money(budget - total)}`}
            </p>
          )}
        </div>
        {canEdit && (
          <Button onClick={() => openForm(null)}>
            <Plus className="size-4" aria-hidden />
            Thêm khoản chi
          </Button>
        )}
      </Card>

      {categories.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {['all', ...categories].map((c) => (
            <button key={c} type="button" onClick={() => setFilter(c)}
              className={`min-h-9 shrink-0 rounded-full border px-3 text-sm ${filter === c ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>
              {c === 'all' ? 'Tất cả' : CATEGORY_LABELS[c] ?? c}
            </button>
          ))}
        </div>
      )}

      {all.length === 0 ? (
        <EmptyState icon={<Receipt className="size-10" aria-hidden />} title="Chưa có khoản chi nào"
          description="Ghi lại các khoản chi để theo dõi ngân sách và chia tiền tự động."
          action={canEdit ? <Button onClick={() => openForm(null)}><Plus className="size-4" aria-hidden />Thêm khoản chi</Button> : undefined} />
      ) : (
        groups.map((g) => (
          <section key={g.date}>
            <h3 className="mb-2 text-sm font-semibold text-slate-500">{formatDateWithWeekday(g.date)}</h3>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {g.items.map((e) => (
                <li key={e.id}>
                  <button type="button" disabled={!canEdit} onClick={() => openForm(e)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left enabled:hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 font-medium text-slate-900">
                        <span className="truncate">{e.title}</span>
                        {e.attachment_count > 0 && <Paperclip className="size-4 shrink-0 text-slate-400" aria-label="Có tệp đính kèm" />}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        <Badge>{CATEGORY_LABELS[e.category] ?? e.category}</Badge>
                        <span>{nameOf.get(e.paid_by) ?? '?'} trả</span>
                        <span>· chia {e.splits.length} người</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">{money(e.amount, e.currency)}</p>
                      {e.currency !== trip.base_currency && <p className="text-xs text-slate-500">≈ {money(e.amount_base)}</p>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <ExpenseForm trip={trip} members={members.data} myMemberId={myMemberId} open={formOpen} expense={editing}
        onClose={() => setFormOpen(false)} onDelete={(e) => { remove.reset(); setDeleting(e) }} />

      <ConfirmDialog
        open={deleting !== null}
        title="Xóa khoản chi"
        message={
          <>
            <p>Xóa khoản chi <strong>{deleting?.title}</strong>? Phần chia của khoản này cũng bị xóa.</p>
            {remove.error && <div className="mt-3"><ErrorAlert error={toFriendlyError(remove.error)} /></div>}
          </>
        }
        confirmLabel="Xóa"
        danger
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id, {
          onSuccess: () => {
            toast('Đã xóa khoản chi')
            setDeleting(null)
            setFormOpen(false)
          },
        })}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}
