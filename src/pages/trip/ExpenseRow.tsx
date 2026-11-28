import { HandCoins, Paperclip } from 'lucide-react'
import { Badge, Button } from '../../components/ui'
import { CATEGORY_LABELS } from '../../lib/constants'
import { formatDate, formatMoney } from '../../lib/format'
import { paidAmount, paymentStatus, PAYMENT_STATUS_LABELS, remainingAmount } from '../../lib/payments'
import type { Expense } from '../../types'

const STATUS_TONE = { unpaid: 'amber', partial: 'brand', paid: 'green' } as const

type Props = {
  expense: Expense
  baseCurrency: string
  canEdit: boolean
  nameOf: (memberId: string) => string
  today: string
  onEdit: () => void
  onAddPayment: () => void
}

/** EXP-01: 1 dòng khoản chi + trạng thái thanh toán */
export function ExpenseRow({ expense: e, baseCurrency, canEdit, nameOf, today, onEdit, onAddPayment }: Props) {
  const status = paymentStatus(e)
  const paid = paidAmount(e)
  const percent = e.amount > 0 ? Math.min(100, (paid / e.amount) * 100) : 0
  const payers = [...new Set(e.payments.map((p) => p.paid_by))].map(nameOf)
  const overdue = status !== 'paid' && e.due_date !== null && e.due_date < today

  return (
    <div className="px-4 py-3">
      <button type="button" disabled={!canEdit} onClick={onEdit} className="flex w-full items-start gap-3 text-left enabled:cursor-pointer">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 font-medium text-slate-900">
            <span className="truncate">{e.title}</span>
            {e.attachment_count > 0 && <Paperclip className="size-4 shrink-0 text-slate-400" aria-label="Có tệp đính kèm" />}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <Badge tone={STATUS_TONE[status]}>{PAYMENT_STATUS_LABELS[status]}</Badge>
            <Badge>{CATEGORY_LABELS[e.category] ?? e.category}</Badge>
            <span>{payers.length > 0 ? `${payers.join(', ')} trả` : 'Chưa ai trả'}</span>
            <span>· chia {e.splits.length} người</span>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold text-slate-900">{formatMoney(e.amount, e.currency)}</p>
          {e.currency !== baseCurrency && <p className="text-xs text-slate-500">≈ {formatMoney(e.amount_base, baseCurrency)}</p>}
        </div>
      </button>

      {status !== 'paid' && (
        <div className="mt-2 space-y-1">
          <div className="h-1.5 rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-600" style={{ width: `${percent}%` }} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-600">
              Đã trả {formatMoney(paid, e.currency)} · còn <strong>{formatMoney(remainingAmount(e), e.currency)}</strong>
              {e.due_date && (
                <span className={overdue ? 'font-semibold text-red-600' : ''}>
                  {' '}· hạn {formatDate(e.due_date)}{overdue ? ' (quá hạn)' : ''}
                </span>
              )}
            </span>
            {canEdit && (
              <Button variant="secondary" onClick={onAddPayment}>
                <HandCoins className="size-4" aria-hidden />
                Ghi nhận thanh toán
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
