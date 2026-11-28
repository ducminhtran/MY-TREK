import { Plus, Trash2 } from 'lucide-react'
import { DateInput } from '../../components/DateTimeInputs'
import { Button, Field, Input, SELECT_CLASS } from '../../components/ui'
import { formatMoney, formatNumber, isValidIsoDate, parseNumberInput, toISODate } from '../../lib/format'
import { fromMinor, toMinor } from '../../lib/split'
import type { ExpensePayment, PaymentInput, TripMember } from '../../types'

export type PayMode = 'full' | 'multi' | 'planned'

const MODE_LABELS: Record<PayMode, string> = {
  full: 'Trả đủ 1 lần',
  multi: 'Đặt cọc / nhiều đợt',
  planned: 'Dự chi',
}

/** 1 dòng đợt thanh toán đang nhập (số tiền dạng chữ theo kiểu VN) */
export type PaymentRow = { key: string; paid_by: string; amountText: string; date: string; note: string | null }

let rowSeq = 0
export function newPaymentRow(payer: string, amountText = ''): PaymentRow {
  rowSeq += 1
  return { key: `row-${rowSeq}`, paid_by: payer, amountText, date: toISODate(new Date()), note: null }
}

export function paymentsToRows(payments: ExpensePayment[]): PaymentRow[] {
  return payments.map((p) => ({ ...newPaymentRow(p.paid_by, formatNumber(p.amount, 2)), date: p.paid_on, note: p.note }))
}

/** Kiểm tra + chuyển các dòng thành dữ liệu gửi RPC. amount = tổng tiền khoản chi (đã làm tròn) */
export function rowsToPayments(rows: PaymentRow[], amount: number, currency: string): { payments: PaymentInput[]; error?: string } {
  const payments: PaymentInput[] = []
  for (const [i, r] of rows.entries()) {
    const value = parseNumberInput(r.amountText)
    if (value === null || Number.isNaN(value) || toMinor(value, currency) <= 0) return { payments, error: `Đợt ${i + 1}: số tiền phải lớn hơn 0` }
    if (!r.paid_by) return { payments, error: `Đợt ${i + 1}: chọn người trả` }
    if (!isValidIsoDate(r.date)) return { payments, error: `Đợt ${i + 1}: ngày không hợp lệ (dd-mm-yyyy)` }
    payments.push({ paid_by: r.paid_by, amount: fromMinor(toMinor(value, currency), currency), paid_on: r.date, note: r.note })
  }
  const paid = payments.reduce((s, p) => s + toMinor(p.amount, currency), 0)
  if (paid > toMinor(amount, currency)) return { payments, error: 'Tổng các đợt đã trả vượt quá số tiền chi' }
  return { payments }
}

type Props = {
  members: TripMember[]
  currency: string
  /** Tổng tiền hợp lệ (null nếu chưa nhập đúng) */
  amount: number | null
  mode: PayMode
  onModeChange: (m: PayMode) => void
  payer: string
  onPayerChange: (id: string) => void
  rows: PaymentRow[]
  onRowsChange: (rows: PaymentRow[]) => void
  dueDate: string
  onDueDateChange: (v: string) => void
  error?: string
  defaultPayer: string
}

/** Trả đủ 1 lần / Đặt cọc – nhiều đợt (mỗi đợt có người trả, ngày, số tiền) / Dự chi (sẽ chi, chưa trả) */
export function PaymentsEditor(p: Props) {
  const paidMinor = p.rows.reduce((s, r) => {
    const v = parseNumberInput(r.amountText)
    return s + (v === null || Number.isNaN(v) ? 0 : Math.max(0, toMinor(v, p.currency)))
  }, 0)
  const totalMinor = p.amount === null ? 0 : toMinor(p.amount, p.currency)
  const money = (minor: number) => formatMoney(fromMinor(minor, p.currency), p.currency)
  const update = (key: string, patch: Partial<PaymentRow>) => p.onRowsChange(p.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-sm font-medium text-slate-700">Thanh toán</legend>
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
        {(['full', 'multi', 'planned'] as const).map((m) => (
          <button key={m} type="button" onClick={() => p.onModeChange(m)}
            className={`min-h-10 rounded-md px-1 text-xs font-medium sm:text-sm ${p.mode === m ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-600'}`}>
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {p.mode === 'planned' ? (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          Khoản <strong>sẽ chi</strong> (ước tính), chưa ai trả. Được tính vào <strong>Tổng dự kiến</strong> để so ngân sách,
          không ảnh hưởng bảng Chia tiền. Khi chi thật, bấm <strong>"Đã chi"</strong> để ghi số tiền thực tế.
        </p>
      ) : p.mode === 'full' ? (
        <Field label="Người trả" htmlFor="exp-payer" required>
          <select id="exp-payer" className={SELECT_CLASS} value={p.payer} onChange={(e) => p.onPayerChange(e.target.value)}>
            {p.members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
          </select>
        </Field>
      ) : (
        <div className="space-y-3">
          {p.rows.length === 0 && <p className="text-sm text-slate-500">Chưa trả đợt nào – bấm "Thêm đợt" khi đã cọc / đã trả.</p>}
          {p.rows.map((r, i) => (
            <div key={r.key} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{i === 0 ? 'Đợt 1 (cọc)' : `Đợt ${i + 1}`}</span>
                <Button variant="ghost" className="px-3 text-red-600" aria-label={`Xóa đợt ${i + 1}`}
                  onClick={() => p.onRowsChange(p.rows.filter((x) => x.key !== r.key))}>
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input aria-label={`Số tiền đợt ${i + 1}`} inputMode="decimal" placeholder="Số tiền"
                  value={r.amountText} onChange={(e) => update(r.key, { amountText: e.target.value })} />
                <select aria-label={`Người trả đợt ${i + 1}`} className={SELECT_CLASS} value={r.paid_by}
                  onChange={(e) => update(r.key, { paid_by: e.target.value })}>
                  {p.members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
                </select>
                <DateInput aria-label={`Ngày trả đợt ${i + 1}`} value={r.date} onChange={(v) => update(r.key, { date: v })} />
              </div>
            </div>
          ))}
          <Button variant="secondary" onClick={() => {
            const rest = Math.max(0, totalMinor - paidMinor)
            // Đợt sau mặc định = phần còn lại
            const preset = p.rows.length > 0 && rest > 0 ? formatNumber(fromMinor(rest, p.currency), 2) : ''
            p.onRowsChange([...p.rows, newPaymentRow(p.defaultPayer, preset)])
          }}>
            <Plus className="size-4" aria-hidden />
            Thêm đợt
          </Button>

          {p.amount !== null && (
            <p className={`text-sm font-medium ${paidMinor > totalMinor ? 'text-red-600' : 'text-slate-700'}`} role="status">
              Đã trả {money(paidMinor)} / {money(totalMinor)}
              {paidMinor < totalMinor && ` · Còn phải trả ${money(totalMinor - paidMinor)}`}
              {paidMinor > totalMinor && ' · Vượt quá số tiền chi'}
            </p>
          )}

          <Field label="Hạn trả phần còn lại" htmlFor="exp-due" hint="Tùy chọn – hiện trong mục Sắp phải trả">
            <DateInput id="exp-due" value={p.dueDate} onChange={p.onDueDateChange} />
          </Field>
        </div>
      )}
      {p.error && <p className="text-sm text-red-600" role="alert">{p.error}</p>}
    </fieldset>
  )
}
