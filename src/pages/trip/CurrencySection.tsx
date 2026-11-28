import { useState, type FormEvent } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Button, Card, ErrorAlert, Field, Input, SELECT_CLASS } from '../../components/ui'
import { useDeleteCurrency, useSaveCurrency, useTripCurrencies } from '../../hooks/members'
import { COMMON_CURRENCIES } from '../../lib/constants'
import { toFriendlyError } from '../../lib/errors'
import { formatNumber, parseNumberInput } from '../../lib/format'
import { useTripContext } from './context'

/** SET-02: tỷ giá "1 USD = 25.400 VND" – chỉ là giá trị mặc định khi nhập khoản chi (BR-04) */
export function CurrencySection() {
  const { trip } = useTripContext()
  const toast = useToast()
  const currencies = useTripCurrencies(trip.id)
  const save = useSaveCurrency(trip.id)
  const remove = useDeleteCurrency(trip.id)

  const [currency, setCurrency] = useState('')
  const [rateText, setRateText] = useState('')
  const [editing, setEditing] = useState(false)
  const [rateError, setRateError] = useState<string>()
  const [deleting, setDeleting] = useState<string | null>(null)

  const existing = new Set((currencies.data ?? []).map((c) => c.currency))
  const options = COMMON_CURRENCIES.filter((c) => c !== trip.base_currency && !existing.has(c))
  const selected = editing ? currency : currency || options[0] || ''
  const rate = parseNumberInput(rateText)

  function resetForm() {
    setCurrency('')
    setRateText('')
    setEditing(false)
    setRateError(undefined)
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (rate === null || Number.isNaN(rate) || rate <= 0) {
      setRateError('Tỷ giá phải là số lớn hơn 0')
      return
    }
    if (!selected) return
    save.mutate(
      { currency: selected, rate },
      {
        onSuccess: () => {
          toast(editing ? 'Đã cập nhật tỷ giá' : 'Đã thêm tiền tệ')
          resetForm()
        },
      },
    )
  }

  return (
    <Card>
      <h2 className="mb-1 font-semibold text-slate-800">Tỷ giá</h2>
      <p className="mb-3 text-sm text-slate-500">
        Tỷ giá dùng làm giá trị mặc định khi nhập khoản chi ngoại tệ. Sửa tỷ giá không ảnh hưởng khoản chi đã nhập.
      </p>

      {currencies.data && currencies.data.length > 0 && (
        <ul className="mb-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {currencies.data.map((c) => (
            <li key={c.currency} className="flex items-center gap-2 px-3 py-1">
              <span className="flex-1 text-sm text-slate-800">
                1 {c.currency} = <strong>{formatNumber(c.rate_to_base)}</strong> {trip.base_currency}
              </span>
              <Button variant="ghost" aria-label={`Sửa tỷ giá ${c.currency}`}
                onClick={() => { setEditing(true); setCurrency(c.currency); setRateText(formatNumber(c.rate_to_base)); setRateError(undefined) }}>
                <Pencil className="size-4" aria-hidden />
              </Button>
              <Button variant="ghost" className="text-red-600" aria-label={`Xóa ${c.currency}`} onClick={() => setDeleting(c.currency)}>
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {(options.length > 0 || editing) && (
        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          {save.error && <ErrorAlert error={toFriendlyError(save.error)} />}
          <div className="grid grid-cols-[7rem_1fr] gap-3">
            <Field label="Tiền tệ" htmlFor="cur-code">
              <select id="cur-code" className={SELECT_CLASS} disabled={editing} value={selected}
                onChange={(e) => setCurrency(e.target.value)}>
                {editing ? <option value={selected}>{selected}</option> : options.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label={`Bằng bao nhiêu ${trip.base_currency}`} htmlFor="cur-rate" error={rateError}>
              <Input id="cur-rate" inputMode="decimal" placeholder="VD: 25.400" aria-invalid={!!rateError}
                value={rateText} onChange={(e) => setRateText(e.target.value)} />
            </Field>
          </div>
          {rate !== null && !Number.isNaN(rate) && rate > 0 && (
            <p className="text-sm text-slate-600">1 {selected} = {formatNumber(rate)} {trip.base_currency}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" loading={save.isPending}>{editing ? 'Lưu tỷ giá' : 'Thêm tiền tệ'}</Button>
            {editing && <Button variant="secondary" onClick={resetForm}>Hủy</Button>}
          </div>
        </form>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Xóa tiền tệ"
        message={
          <>
            <p>Xóa tỷ giá <strong>{deleting}</strong>? Các khoản chi đã nhập bằng {deleting} vẫn giữ nguyên.</p>
            {remove.error && <div className="mt-3"><ErrorAlert error={toFriendlyError(remove.error)} /></div>}
          </>
        }
        confirmLabel="Xóa"
        danger
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting, { onSuccess: () => setDeleting(null) })}
        onClose={() => setDeleting(null)}
      />
    </Card>
  )
}
