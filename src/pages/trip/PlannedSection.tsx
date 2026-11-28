import { CircleCheckBig, Plus } from 'lucide-react'
import { Badge, Button, Card } from '../../components/ui'
import { CATEGORY_LABELS } from '../../lib/constants'
import { formatDateWithWeekday, formatMoney } from '../../lib/format'
import type { Expense } from '../../types'

type Props = {
  items: Expense[]
  baseCurrency: string
  canEdit: boolean
  onAdd: () => void
  onEdit: (e: Expense) => void
  onConvert: (e: Expense) => void
}

/** Quyết định 4a: mục "Dự chi" riêng ở đầu tab Chi tiêu, sắp theo ngày dự kiến */
export function PlannedSection({ items, baseCurrency, canEdit, onAdd, onEdit, onConvert }: Props) {
  const sorted = [...items].sort((a, b) => a.expense_date.localeCompare(b.expense_date) || a.created_at.localeCompare(b.created_at))
  const total = Math.round(sorted.reduce((s, e) => s + e.amount_base, 0) * 100) / 100

  return (
    <Card>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-slate-800">Dự chi ({sorted.length})</h2>
          <p className="text-xs text-slate-500">Sẽ chi, chưa trả – không ảnh hưởng bảng Chia tiền</p>
        </div>
        {canEdit && (
          <Button variant="secondary" onClick={onAdd}>
            <Plus className="size-4" aria-hidden />
            Thêm dự chi
          </Button>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-slate-500">Chưa có khoản dự chi. Ghi trước các khoản sẽ chi để biết tổng dự kiến và ngân sách còn lại.</p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100">
            {sorted.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
                <button type="button" disabled={!canEdit} onClick={() => onEdit(e)} className="min-w-0 flex-1 text-left">
                  <p className="truncate font-medium text-slate-800">{e.title}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    <Badge>Dự chi</Badge>
                    <span>{formatDateWithWeekday(e.expense_date)}</span>
                    <span>· {CATEGORY_LABELS[e.category] ?? e.category}</span>
                    <span>· chia {e.splits.length} người</span>
                  </div>
                </button>
                <div className="text-right">
                  <p className="font-semibold text-slate-700">~{formatMoney(e.amount, e.currency)}</p>
                  {e.currency !== baseCurrency && <p className="text-xs text-slate-500">≈ {formatMoney(e.amount_base, baseCurrency)}</p>}
                </div>
                {canEdit && (
                  <Button variant="secondary" onClick={() => onConvert(e)} aria-label={`Đã chi: ${e.title}`}>
                    <CircleCheckBig className="size-4" aria-hidden />
                    Đã chi
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-right text-sm text-slate-600">
            Tổng dự chi: <strong className="text-slate-900">{formatMoney(total, baseCurrency)}</strong>
          </p>
        </>
      )}
    </Card>
  )
}
