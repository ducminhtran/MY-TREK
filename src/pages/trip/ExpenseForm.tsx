import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Button, ErrorAlert, Field, Input, SELECT_CLASS, TEXTAREA_CLASS } from '../../components/ui'
import { useSaveExpense } from '../../hooks/expenses'
import { useTripCurrencies } from '../../hooks/members'
import { CATEGORY_LABELS } from '../../lib/constants'
import { toFriendlyError } from '../../lib/errors'
import { currencyDecimals, formatMoney, formatNumber, parseNumberInput, toISODate } from '../../lib/format'
import { splitDifferenceMinor, splitEqual, type Share } from '../../lib/split'
import type { Expense, ItineraryCategory, Trip, TripMember } from '../../types'
import { SplitEditor } from './SplitEditor'
import { DateInput, dateFieldError } from '../../components/DateTimeInputs'

type Props = {
  trip: Trip
  members: TripMember[]
  myMemberId: string
  open: boolean
  expense: Expense | null
  onClose: () => void
  onDelete: (e: Expense) => void
}

const FORM_ID = 'expense-form'

/** EXP-02 → EXP-05 */
export function ExpenseForm({ trip, members, myMemberId, open, expense, onClose, onDelete }: Props) {
  const toast = useToast()
  const save = useSaveExpense(trip.id)
  const rates = useTripCurrencies(trip.id)

  const [title, setTitle] = useState('')
  const [amountText, setAmountText] = useState('')
  const [currency, setCurrency] = useState(trip.base_currency)
  const [rateText, setRateText] = useState('1')
  const [date, setDate] = useState('')
  const [category, setCategory] = useState<ItineraryCategory>('an_uong')
  const [paidBy, setPaidBy] = useState('')
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [customShares, setCustomShares] = useState<Record<string, string>>({})
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Partial<Record<'title' | 'amount' | 'rate' | 'date' | 'paidBy' | 'split', string>>>({})

  useEffect(() => {
    if (!open) return
    setTitle(expense?.title ?? '')
    setAmountText(expense ? formatNumber(expense.amount, 2) : '')
    setCurrency(expense?.currency ?? trip.base_currency)
    setRateText(formatNumber(expense?.exchange_rate ?? 1))
    setDate(expense?.expense_date ?? toISODate(new Date()))
    setCategory(expense?.category ?? 'an_uong')
    setPaidBy(expense?.paid_by ?? myMemberId)
    setSplitType(expense?.split_type ?? 'equal')
    setSelected(new Set(expense ? expense.splits.map((s) => s.member_id) : members.map((m) => m.id)))
    setCustomShares(expense?.split_type === 'custom'
      ? Object.fromEntries(expense.splits.map((s) => [s.member_id, formatNumber(s.share_amount, 2)]))
      : {})
    setNote(expense?.note ?? '')
    setErrors({})
    save.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ nạp lại khi mở form
  }, [open, expense])

  const isBase = currency === trip.base_currency
  const currencyOptions = [trip.base_currency, ...(rates.data ?? []).map((r) => r.currency)]
  if (!currencyOptions.includes(currency)) currencyOptions.push(currency)

  // Số tiền làm tròn theo số lẻ của tiền tệ (KT-13)
  const amountRaw = parseNumberInput(amountText)
  const decimals = currencyDecimals(currency)
  const amount = amountRaw === null || Number.isNaN(amountRaw) ? null : Math.round(amountRaw * 10 ** decimals) / 10 ** decimals
  const amountValid = amount !== null && amount > 0
  const rate = isBase ? 1 : parseNumberInput(rateText)

  const equalShares = amountValid ? splitEqual(amount, currency, members.filter((m) => selected.has(m.id)).map((m) => m.id)) : []
  const customList: Share[] = members
    .map((m) => ({ member_id: m.id, share_amount: parseNumberInput(customShares[m.id] ?? '') ?? 0 }))
    .filter((s) => !Number.isNaN(s.share_amount) && s.share_amount > 0)
  const shares = splitType === 'equal' ? equalShares : customList
  const differenceMinor = amountValid ? splitDifferenceMinor(amount, currency, shares.map((s) => s.share_amount)) : 0

  function changeCurrency(next: string) {
    setCurrency(next)
    // SET-02 / BR-04: tự điền tỷ giá từ cài đặt, người dùng sửa được
    const found = rates.data?.find((r) => r.currency === next)
    setRateText(next === trip.base_currency ? '1' : found ? formatNumber(found.rate_to_base) : '')
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const found: typeof errors = {}
    if (!title.trim()) found.title = 'Vui lòng nhập tên khoản chi'
    if (!amountValid) found.amount = 'Số tiền phải lớn hơn 0'
    if (rate === null || Number.isNaN(rate) || rate <= 0) found.rate = 'Tỷ giá phải là số lớn hơn 0'
    const dateError = dateFieldError(date, true)
    if (dateError) found.date = dateError
    if (!paidBy) found.paidBy = 'Chọn người trả'
    if (shares.length === 0) found.split = 'Chọn ít nhất 1 người chia'
    else if (differenceMinor !== 0) found.split = 'Tổng phần chia phải bằng đúng số tiền'
    setErrors(found)
    if (Object.keys(found).length > 0 || amount === null || rate === null) return

    save.mutate(
      {
        expense: {
          id: expense?.id, title: title.trim(), category, amount, currency, exchange_rate: rate,
          paid_by: paidBy, expense_date: date || toISODate(new Date()), split_type: splitType, note: note.trim() || null,
        },
        splits: shares,
      },
      // EXP-05: lỗi → giữ nguyên form (không đóng)
      { onSuccess: () => { toast(expense ? 'Đã lưu khoản chi' : 'Đã thêm khoản chi'); onClose() } },
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={expense ? 'Sửa khoản chi' : 'Thêm khoản chi'}
      footer={
        <>
          {expense && <Button variant="ghost" className="text-red-600" onClick={() => onDelete(expense)}>Xóa</Button>}
          <Button variant="secondary" onClick={onClose}>Hủy</Button>
          <Button type="submit" form={FORM_ID} loading={save.isPending}>Lưu</Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4" noValidate>
        {save.error && <ErrorAlert error={toFriendlyError(save.error)} />}

        <Field label="Tên khoản chi" htmlFor="exp-title" required error={errors.title}>
          <Input id="exp-title" maxLength={200} placeholder="VD: Ăn tối lẩu gà" aria-invalid={!!errors.title}
            value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>

        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Field label="Số tiền" htmlFor="exp-amount" required error={errors.amount}>
            <Input id="exp-amount" inputMode="decimal" placeholder="VD: 450.000" aria-invalid={!!errors.amount}
              value={amountText} onChange={(e) => setAmountText(e.target.value)} />
          </Field>
          <Field label="Tiền tệ" htmlFor="exp-currency">
            <select id="exp-currency" className={SELECT_CLASS} value={currency} onChange={(e) => changeCurrency(e.target.value)}>
              {currencyOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        {!isBase && (
          <Field label={`Tỷ giá: 1 ${currency} = ? ${trip.base_currency}`} htmlFor="exp-rate" error={errors.rate}
            hint={amountValid && rate && !Number.isNaN(rate) ? `≈ ${formatMoney(amount * rate, trip.base_currency)}` : 'Tỷ giá được chốt cho riêng khoản chi này'}>
            <Input id="exp-rate" inputMode="decimal" aria-invalid={!!errors.rate} value={rateText} onChange={(e) => setRateText(e.target.value)} />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Ngày chi" htmlFor="exp-date" error={errors.date}>
            <DateInput id="exp-date" invalid={!!errors.date} value={date} onChange={setDate} />
          </Field>
          <Field label="Hạng mục" htmlFor="exp-category">
            <select id="exp-category" className={SELECT_CLASS} value={category} onChange={(e) => setCategory(e.target.value as ItineraryCategory)}>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Người trả" htmlFor="exp-payer" required error={errors.paidBy}>
          <select id="exp-payer" className={SELECT_CLASS} value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
            {members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
          </select>
        </Field>

        <SplitEditor
          members={members} splitType={splitType} onSplitTypeChange={setSplitType} currency={currency}
          selected={selected}
          onToggle={(id) => setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })}
          onToggleAll={(all) => setSelected(new Set(all ? members.map((m) => m.id) : []))}
          equalShares={equalShares}
          customShares={customShares}
          onCustomChange={(id, v) => setCustomShares((prev) => ({ ...prev, [id]: v }))}
          differenceMinor={differenceMinor}
          amountValid={amountValid}
        />
        {errors.split && <p className="text-sm text-red-600" role="alert">{errors.split}</p>}

        <Field label="Ghi chú" htmlFor="exp-note">
          <textarea id="exp-note" rows={2} maxLength={2000} className={TEXTAREA_CLASS} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </form>
    </Modal>
  )
}
