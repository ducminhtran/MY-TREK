import { useEffect, useState, type FormEvent } from 'react'
import { DateInput, dateFieldError } from '../../components/DateTimeInputs'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Button, ErrorAlert, Field, Input, SELECT_CLASS } from '../../components/ui'
import { useAddExpensePayment } from '../../hooks/expenses'
import { toFriendlyError } from '../../lib/errors'
import { formatMoney, formatNumber, parseNumberInput, toISODate } from '../../lib/format'
import { remainingAmount } from '../../lib/payments'
import { fromMinor, toMinor } from '../../lib/split'
import type { Expense, TripMember } from '../../types'

type Props = {
  tripId: string
  members: TripMember[]
  defaultPayer: string
  /** null = đóng */
  expense: Expense | null
  onClose: () => void
}

const FORM_ID = 'add-payment-form'

/** Ghi nhận thêm 1 đợt trả (VD trả nốt phần còn lại sau cọc) */
export function AddPaymentForm({ tripId, members, defaultPayer, expense, onClose }: Props) {
  const toast = useToast()
  const add = useAddExpensePayment(tripId)
  const [amountText, setAmountText] = useState('')
  const [payer, setPayer] = useState('')
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Partial<Record<'amount' | 'date', string>>>({})

  const remaining = expense ? remainingAmount(expense) : 0

  useEffect(() => {
    if (!expense) return
    setAmountText(formatNumber(remainingAmount(expense), 2))
    setPayer(defaultPayer)
    setDate(toISODate(new Date()))
    setNote('')
    setErrors({})
    add.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ nạp lại khi đổi khoản chi
  }, [expense])

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!expense) return
    const found: typeof errors = {}
    const raw = parseNumberInput(amountText)
    const minor = raw === null || Number.isNaN(raw) ? 0 : toMinor(raw, expense.currency)
    if (minor <= 0) found.amount = 'Số tiền phải lớn hơn 0'
    else if (minor > toMinor(remaining, expense.currency)) found.amount = `Tối đa ${formatMoney(remaining, expense.currency)} (phần còn lại)`
    const dateError = dateFieldError(date, true)
    if (dateError) found.date = dateError
    setErrors(found)
    if (Object.keys(found).length > 0) return

    add.mutate(
      { expenseId: expense.id, payment: { paid_by: payer, amount: fromMinor(minor, expense.currency), paid_on: date, note: note.trim() || null } },
      { onSuccess: () => { toast('Đã ghi nhận thanh toán'); onClose() } },
    )
  }

  return (
    <Modal
      open={expense !== null}
      onClose={onClose}
      title="Ghi nhận thanh toán"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Hủy</Button>
          <Button type="submit" form={FORM_ID} loading={add.isPending}>Lưu</Button>
        </>
      }
    >
      {expense && (
        <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4" noValidate>
          {add.error && <ErrorAlert error={toFriendlyError(add.error)} />}
          <p className="text-sm text-slate-600">
            <strong className="text-slate-900">{expense.title}</strong> · còn phải trả{' '}
            <strong className="text-slate-900">{formatMoney(remaining, expense.currency)}</strong>
          </p>
          <Field label={`Số tiền (${expense.currency})`} htmlFor="ap-amount" required error={errors.amount}>
            <Input id="ap-amount" inputMode="decimal" aria-invalid={!!errors.amount} value={amountText} onChange={(e) => setAmountText(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Người trả" htmlFor="ap-payer">
              <select id="ap-payer" className={SELECT_CLASS} value={payer} onChange={(e) => setPayer(e.target.value)}>
                {members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
              </select>
            </Field>
            <Field label="Ngày trả" htmlFor="ap-date" error={errors.date}>
              <DateInput id="ap-date" invalid={!!errors.date} value={date} onChange={setDate} />
            </Field>
          </div>
          <Field label="Ghi chú" htmlFor="ap-note">
            <Input id="ap-note" maxLength={500} placeholder="VD: Trả nốt khi nhận phòng" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </form>
      )}
    </Modal>
  )
}
