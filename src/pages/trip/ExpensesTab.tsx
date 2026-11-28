import { useState } from 'react'
import { CalendarClock, Plus } from 'lucide-react'
import { ConfirmDialog } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Button, Card, EmptyState, ErrorAlert, ErrorState, Spinner } from '../../components/ui'
import { useDeleteExpense, useExpenses } from '../../hooks/expenses'
import { useTripMembers } from '../../hooks/members'
import { ILLUSTRATIONS } from '../../lib/assets'
import { CATEGORY_LABELS } from '../../lib/constants'
import { toFriendlyError } from '../../lib/errors'
import { formatDate, formatDateWithWeekday, formatMoney, toISODate } from '../../lib/format'
import { summarizeSpending, upcomingDues } from '../../lib/payments'
import type { Expense } from '../../types'
import { AddPaymentForm } from './AddPaymentForm'
import { useTripContext } from './context'
import { ExpenseForm } from './ExpenseForm'
import { ExpenseRow } from './ExpenseRow'
import { PlannedSection } from './PlannedSection'
import type { PayMode } from './PaymentsEditor'

/** EXP-01, EXP-06 + đặt cọc: Tổng chi phí · Đã thực chi · Còn phải trả · Sắp phải trả */
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
  const [paying, setPaying] = useState<Expense | null>(null)
  const [startMode, setStartMode] = useState<PayMode | undefined>(undefined)
  const [converting, setConverting] = useState(false)

  if (expenses.isPending || members.isPending) return <Spinner />
  if (expenses.isError) return <ErrorState error={toFriendlyError(expenses.error)} onRetry={() => void expenses.refetch()} />
  if (members.isError) return <ErrorState error={toFriendlyError(members.error)} onRetry={() => void members.refetch()} />

  const memberList = members.data
  const nameOf = (id: string) => memberList.find((m) => m.id === id)?.display_name ?? '?'
  const cur = trip.base_currency
  const money = (n: number) => formatMoney(n, cur)
  const today = toISODate(new Date())
  const sum = summarizeSpending(expenses.data, cur)
  const dues = upcomingDues(expenses.data, cur, today)
  const plannedItems = expenses.data.filter((e) => e.is_planned)
  const all = expenses.data.filter((e) => !e.is_planned)  // khoản chi thật (đã chốt)
  const budget = trip.budget === null ? null : Number(trip.budget)
  // Quyết định 1a: ngân sách so với Tổng dự kiến (đã chi + còn phải trả + dự chi)
  const overBudget = budget !== null && sum.projected > budget
  const categories = [...new Set(all.map((e) => e.category))]
  const shown = filter === 'all' ? all : all.filter((e) => e.category === filter)

  // Nhóm theo ngày, mới nhất trước (dữ liệu đã sắp sẵn)
  const groups: { date: string; items: Expense[] }[] = []
  for (const e of shown) {
    const last = groups[groups.length - 1]
    if (last && last.date === e.expense_date) last.items.push(e)
    else groups.push({ date: e.expense_date, items: [e] })
  }

  function openForm(e: Expense | null, mode?: PayMode, convert = false) {
    setEditing(e)
    setStartMode(mode)
    setConverting(convert)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Tổng dự kiến</p>
            <p className={`text-2xl font-bold ${overBudget ? 'text-red-600' : 'text-slate-900'}`}>{money(sum.projected)}</p>
          </div>
          {canEdit && (
            <Button onClick={() => openForm(null)}>
              <Plus className="size-4" aria-hidden />
              Thêm khoản chi
            </Button>
          )}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-lg bg-green-50 p-2 sm:p-3">
            <p className="text-xs text-green-800 sm:text-sm">Đã thực chi</p>
            <p className="font-semibold text-green-900 sm:text-lg">{money(sum.paid)}</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-2 sm:p-3">
            <p className="text-xs text-amber-800 sm:text-sm">Còn phải trả</p>
            <p className="font-semibold text-amber-900 sm:text-lg">{money(sum.remaining)}</p>
          </div>
          <div className="rounded-lg bg-slate-100 p-2 sm:p-3">
            <p className="text-xs text-slate-600 sm:text-sm">Dự chi</p>
            <p className="font-semibold text-slate-800 sm:text-lg">{money(sum.planned)}</p>
          </div>
        </div>
        {budget !== null && budget > 0 && (
          <p className={`mt-2 text-sm ${overBudget ? 'font-medium text-red-600' : 'text-slate-600'}`}>
            Ngân sách {money(budget)} · {overBudget ? `vượt ${money(sum.projected - budget)}` : `còn lại ${money(budget - sum.projected)}`} sau dự kiến
          </p>
        )}
      </Card>

      <PlannedSection items={plannedItems} baseCurrency={cur} canEdit={canEdit}
        onAdd={() => openForm(null, 'planned')} onEdit={(e) => openForm(e)} onConvert={(e) => openForm(e, undefined, true)} />

      {dues.length > 0 && (
        <Card>
          <h2 className="mb-2 flex items-center gap-2 font-semibold text-slate-800">
            <CalendarClock className="size-5 text-amber-600" aria-hidden />
            Sắp phải trả ({dues.length})
          </h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {dues.map((d) => (
              <li key={d.expense.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{d.expense.title}</p>
                  <p className={`text-xs ${d.overdue ? 'font-semibold text-red-600' : 'text-slate-500'}`}>
                    {d.expense.due_date ? `Hạn ${formatDate(d.expense.due_date)}${d.overdue ? ' (quá hạn)' : ''}` : 'Chưa đặt hạn'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-slate-900">{formatMoney(d.remaining, d.expense.currency)}</p>
                  {d.expense.currency !== cur && <p className="text-xs text-slate-500">≈ {money(d.remainingBase)}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

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
        <EmptyState image={ILLUSTRATIONS.emptyExpenses} title="Chưa có khoản chi nào"
          description="Ghi lại các khoản chi (kể cả khoản mới đặt cọc) để theo dõi ngân sách và chia tiền tự động."
          action={canEdit ? <Button onClick={() => openForm(null)}><Plus className="size-4" aria-hidden />Thêm khoản chi</Button> : undefined} />
      ) : (
        groups.map((g) => (
          <section key={g.date}>
            <h3 className="mb-2 text-sm font-semibold text-slate-500">{formatDateWithWeekday(g.date)}</h3>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {g.items.map((e) => (
                <li key={e.id}>
                  <ExpenseRow expense={e} baseCurrency={cur} canEdit={canEdit} nameOf={nameOf} today={today}
                    onEdit={() => openForm(e)} onAddPayment={() => setPaying(e)} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <ExpenseForm trip={trip} members={memberList} myMemberId={myMemberId} open={formOpen} expense={editing}
        startMode={startMode} convert={converting}
        onClose={() => setFormOpen(false)} onDelete={(e) => { remove.reset(); setDeleting(e) }} />

      <AddPaymentForm tripId={trip.id} members={memberList} defaultPayer={myMemberId} expense={paying} onClose={() => setPaying(null)} />

      <ConfirmDialog
        open={deleting !== null}
        title="Xóa khoản chi"
        message={
          <>
            <p>Xóa khoản chi <strong>{deleting?.title}</strong>? Phần chia và các đợt thanh toán của khoản này cũng bị xóa.</p>
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
