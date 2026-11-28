import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Button, ErrorAlert, Field, Input, SELECT_CLASS } from '../../components/ui'
import { useAddSettlement } from '../../hooks/expenses'
import { toFriendlyError } from '../../lib/errors'
import { currencyDecimals, parseNumberInput, toISODate } from '../../lib/format'
import type { Trip, TripMember } from '../../types'

type Props = {
  trip: Trip
  members: TripMember[]
  open: boolean
  onClose: () => void
}

const FORM_ID = 'settlement-form'

/** BAL-03: ghi nhận thanh toán thủ công (tiền tệ gốc) */
export function SettlementForm({ trip, members, open, onClose }: Props) {
  const toast = useToast()
  const add = useAddSettlement(trip.id)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [amountText, setAmountText] = useState('')
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Partial<Record<'to' | 'amount', string>>>({})

  useEffect(() => {
    if (!open) return
    setFrom(members[0]?.id ?? '')
    setTo(members[1]?.id ?? '')
    setAmountText('')
    setDate(toISODate(new Date()))
    setNote('')
    setErrors({})
    add.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ nạp lại khi mở form
  }, [open])

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const raw = parseNumberInput(amountText)
    const d = currencyDecimals(trip.base_currency)
    const amount = raw === null || Number.isNaN(raw) ? null : Math.round(raw * 10 ** d) / 10 ** d
    const found: typeof errors = {}
    if (!from || !to || from === to) found.to = 'Người trả và người nhận phải khác nhau'
    if (amount === null || amount <= 0) found.amount = 'Số tiền phải lớn hơn 0'
    setErrors(found)
    if (Object.keys(found).length > 0 || amount === null) return

    add.mutate(
      { from_member: from, to_member: to, amount, settled_on: date || toISODate(new Date()), note: note.trim() || null },
      { onSuccess: () => { toast('Đã ghi nhận thanh toán'); onClose() } },
    )
  }

  const memberOptions = members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ghi nhận thanh toán"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Hủy</Button>
          <Button type="submit" form={FORM_ID} loading={add.isPending}>Lưu</Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4" noValidate>
        {add.error && <ErrorAlert error={toFriendlyError(add.error)} />}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Người trả" htmlFor="st-from">
            <select id="st-from" className={SELECT_CLASS} value={from} onChange={(e) => setFrom(e.target.value)}>{memberOptions}</select>
          </Field>
          <Field label="Người nhận" htmlFor="st-to" error={errors.to}>
            <select id="st-to" className={SELECT_CLASS} value={to} onChange={(e) => setTo(e.target.value)}>{memberOptions}</select>
          </Field>
        </div>
        <Field label={`Số tiền (${trip.base_currency})`} htmlFor="st-amount" required error={errors.amount}>
          <Input id="st-amount" inputMode="decimal" aria-invalid={!!errors.amount} value={amountText} onChange={(e) => setAmountText(e.target.value)} />
        </Field>
        <Field label="Ngày" htmlFor="st-date">
          <Input id="st-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Ghi chú" htmlFor="st-note">
          <Input id="st-note" maxLength={2000} placeholder="VD: Chuyển khoản Vietcombank" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </form>
    </Modal>
  )
}
