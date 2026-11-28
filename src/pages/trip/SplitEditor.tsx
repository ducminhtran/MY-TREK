import { Input } from '../../components/ui'
import { formatMoney } from '../../lib/format'
import { fromMinor, type Share } from '../../lib/split'
import type { TripMember } from '../../types'

type Props = {
  members: TripMember[]
  splitType: 'equal' | 'custom'
  onSplitTypeChange: (t: 'equal' | 'custom') => void
  currency: string
  /** Chia đều: người tham gia */
  selected: Set<string>
  onToggle: (memberId: string) => void
  onToggleAll: (all: boolean) => void
  /** Chia đều: kết quả theo BR-05 để hiển thị */
  equalShares: Share[]
  /** Chia tùy chỉnh: số tiền dạng text theo từng người */
  customShares: Record<string, string>
  onCustomChange: (memberId: string, value: string) => void
  /** Chênh lệch (đơn vị nhỏ nhất): > 0 thiếu, < 0 thừa */
  differenceMinor: number
  amountValid: boolean
}

/** EXP-03 (chia đều) / EXP-04 (chia tùy chỉnh) */
export function SplitEditor(p: Props) {
  const shareOf = new Map(p.equalShares.map((s) => [s.member_id, s.share_amount]))
  const allSelected = p.members.every((m) => p.selected.has(m.id))

  return (
    <fieldset className="space-y-3">
      <legend className="mb-1 text-sm font-medium text-slate-700">Cách chia</legend>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
        {(['equal', 'custom'] as const).map((t) => (
          <button key={t} type="button" onClick={() => p.onSplitTypeChange(t)}
            className={`min-h-10 rounded-md text-sm font-medium ${p.splitType === t ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-600'}`}>
            {t === 'equal' ? 'Chia đều' : 'Tùy chỉnh'}
          </button>
        ))}
      </div>

      {p.splitType === 'equal' ? (
        <div>
          <label className="flex min-h-11 items-center gap-3 border-b border-slate-100 text-sm font-medium text-slate-700">
            <input type="checkbox" className="size-5 accent-brand-700" checked={allSelected} onChange={(e) => p.onToggleAll(e.target.checked)} />
            Tất cả ({p.selected.size}/{p.members.length})
          </label>
          <ul>
            {p.members.map((m) => (
              <li key={m.id}>
                <label className="flex min-h-11 items-center gap-3 text-sm">
                  <input type="checkbox" className="size-5 accent-brand-700" checked={p.selected.has(m.id)} onChange={() => p.onToggle(m.id)} />
                  <span className="flex-1 text-slate-800">{m.display_name}</span>
                  {p.amountValid && shareOf.has(m.id) && (
                    <span className="text-slate-600">{formatMoney(shareOf.get(m.id) ?? 0, p.currency)}</span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul className="space-y-2">
          {p.members.map((m) => (
            <li key={m.id} className="flex items-center gap-3">
              <label htmlFor={`share-${m.id}`} className="flex-1 text-sm text-slate-800">{m.display_name}</label>
              <Input id={`share-${m.id}`} inputMode="decimal" placeholder="0" className="w-36 text-right"
                value={p.customShares[m.id] ?? ''} onChange={(e) => p.onCustomChange(m.id, e.target.value)} />
            </li>
          ))}
        </ul>
      )}

      {p.amountValid && (p.splitType === 'custom' || p.selected.size > 0) && (
        <p className={`text-sm font-medium ${p.differenceMinor === 0 ? 'text-green-700' : 'text-red-600'}`} role="status">
          {p.differenceMinor === 0
            ? 'Đã chia khớp 100%'
            : p.differenceMinor > 0
              ? `Còn thiếu ${formatMoney(fromMinor(p.differenceMinor, p.currency), p.currency)}`
              : `Thừa ${formatMoney(fromMinor(-p.differenceMinor, p.currency), p.currency)}`}
        </p>
      )}
      {p.splitType === 'equal' && p.selected.size === 0 && <p className="text-sm text-red-600">Chọn ít nhất 1 người chia</p>}
    </fieldset>
  )
}
