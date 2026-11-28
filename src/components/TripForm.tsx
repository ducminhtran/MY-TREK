import { useState, type FormEvent } from 'react'
import { Button, ErrorAlert, Field, Input, SELECT_CLASS, TEXTAREA_CLASS } from './ui'
import { COMMON_CURRENCIES, DEFAULT_CURRENCY } from '../lib/constants'
import { formatNumber, parseNumberInput } from '../lib/format'
import { validateTripInput, type TripInputErrors } from '../lib/trips'
import type { FriendlyError } from '../lib/errors'
import type { Trip, TripInput } from '../types'

type TripFormProps = {
  initial?: Trip
  submitLabel: string
  submitting: boolean
  error: FriendlyError | null
  /** BR-10: khóa đổi tiền tệ gốc khi đã có khoản chi */
  currencyLocked?: boolean
  onSubmit: (input: TripInput) => void
}

/** TRIP-02 / SET-01: form dùng chung cho tạo và sửa chuyến đi */
export function TripForm({ initial, submitLabel, submitting, error, currencyLocked = false, onSubmit }: TripFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [destination, setDestination] = useState(initial?.destination ?? '')
  const [startDate, setStartDate] = useState(initial?.start_date ?? '')
  const [endDate, setEndDate] = useState(initial?.end_date ?? '')
  const [currency, setCurrency] = useState(initial?.base_currency ?? DEFAULT_CURRENCY)
  const [budgetText, setBudgetText] = useState(
    initial?.budget !== null && initial?.budget !== undefined ? formatNumber(Number(initial.budget), 2) : '',
  )
  const [description, setDescription] = useState(initial?.description ?? '')
  const [errors, setErrors] = useState<TripInputErrors>({})

  // Tiền tệ đang dùng có thể không nằm trong danh sách hay dùng
  const currencyOptions = COMMON_CURRENCIES.includes(currency as (typeof COMMON_CURRENCIES)[number])
    ? [...COMMON_CURRENCIES]
    : [currency, ...COMMON_CURRENCIES]

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const input: TripInput = {
      name,
      destination,
      start_date: startDate,
      end_date: endDate,
      base_currency: currency,
      budget: parseNumberInput(budgetText),
      description,
    }
    const found = validateTripInput(input)
    setErrors(found)
    if (Object.keys(found).length === 0) onSubmit(input)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && <ErrorAlert error={error} />}

      <Field label="Tên chuyến đi" htmlFor="trip-name" required error={errors.name}>
        <Input id="trip-name" maxLength={200} aria-invalid={!!errors.name} placeholder="VD: Đà Lạt cuối năm"
          value={name} onChange={(e) => setName(e.target.value)} />
      </Field>

      <Field label="Điểm đến" htmlFor="trip-destination" error={errors.destination}>
        <Input id="trip-destination" maxLength={200} value={destination} onChange={(e) => setDestination(e.target.value)} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ngày bắt đầu" htmlFor="trip-start" required error={errors.start_date}>
          <Input id="trip-start" type="date" aria-invalid={!!errors.start_date}
            value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="Ngày kết thúc" htmlFor="trip-end" required error={errors.end_date}>
          <Input id="trip-end" type="date" min={startDate || undefined} aria-invalid={!!errors.end_date}
            value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tiền tệ gốc" htmlFor="trip-currency" error={errors.base_currency}
          hint={currencyLocked ? 'Không đổi được vì chuyến đi đã có khoản chi' : 'Dùng để quy đổi và chia tiền'}>
          <select id="trip-currency" className={SELECT_CLASS} disabled={currencyLocked}
            value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {currencyOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Ngân sách" htmlFor="trip-budget" error={errors.budget} hint={`Theo ${currency}, có thể bỏ trống`}>
          <Input id="trip-budget" inputMode="decimal" placeholder="VD: 15.000.000" aria-invalid={!!errors.budget}
            value={budgetText} onChange={(e) => setBudgetText(e.target.value)} />
        </Field>
      </div>

      <Field label="Mô tả" htmlFor="trip-description" error={errors.description}>
        <textarea id="trip-description" rows={3} maxLength={2000} className={TEXTAREA_CLASS}
          value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>

      <Button type="submit" className="w-full sm:w-auto" loading={submitting}>{submitLabel}</Button>
    </form>
  )
}
