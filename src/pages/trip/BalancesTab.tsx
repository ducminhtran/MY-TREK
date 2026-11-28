import { useState } from 'react'
import { ArrowRight, Copy, HandCoins, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Alert, Button, Card, ErrorAlert, ErrorState, Spinner } from '../../components/ui'
import { useAddSettlement, useDeleteSettlement, useExpenses, useSettlements } from '../../hooks/expenses'
import { useTripMembers } from '../../hooks/members'
import { copyText } from '../../lib/clipboard'
import { toFriendlyError } from '../../lib/errors'
import { formatDate, formatMoney, toISODate } from '../../lib/format'
import { balanceTotalMinor, buildBalanceText, computeBalances, suggestTransfers, type Transfer } from '../../lib/settle'
import type { Settlement } from '../../types'
import { useTripContext } from './context'
import { SettlementForm } from './SettlementForm'

/** BAL-01 → BAL-06 */
export function BalancesTab() {
  const { trip, canEdit } = useTripContext()
  const toast = useToast()
  const members = useTripMembers(trip.id)
  const expenses = useExpenses(trip.id)
  const settlements = useSettlements(trip.id)
  const add = useAddSettlement(trip.id)
  const remove = useDeleteSettlement(trip.id)

  const [formOpen, setFormOpen] = useState(false)
  const [paying, setPaying] = useState<Transfer | null>(null)
  const [deleting, setDeleting] = useState<Settlement | null>(null)

  if (members.isPending || expenses.isPending || settlements.isPending) return <Spinner />
  const failed = members.error ?? expenses.error ?? settlements.error
  if (failed || !members.data || !expenses.data || !settlements.data) {
    return <ErrorState error={toFriendlyError(failed)} onRetry={() => { void members.refetch(); void expenses.refetch(); void settlements.refetch() }} />
  }

  const cur = trip.base_currency
  const memberList = members.data
  const settlementList = settlements.data
  const money = (n: number) => formatMoney(n, cur)
  const nameOf = (id: string) => memberList.find((m) => m.id === id)?.display_name ?? '?'
  const balances = computeBalances(memberList.map((m) => m.id), expenses.data, settlementList, cur)
  const transfers = suggestTransfers(balances, cur)
  const totalOk = balanceTotalMinor(balances, cur) === 0

  async function copyResult() {
    const ok = await copyText(buildBalanceText(trip.name, cur, balances, transfers, nameOf))
    toast(ok ? 'Đã sao chép bảng chia tiền' : 'Không sao chép được', ok ? 'success' : 'error')
  }

  return (
    <div className="space-y-4">
      {/* BAL-01 */}
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-800">Bảng cân đối ({cur})</h2>
          <Button variant="secondary" onClick={() => void copyResult()}>
            <Copy className="size-4" aria-hidden />
            Sao chép bảng chia tiền
          </Button>
        </div>
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="py-2 font-medium">Thành viên</th>
                <th className="py-2 text-right font-medium">Đã trả</th>
                <th className="py-2 text-right font-medium">Phải chịu</th>
                <th className="py-2 text-right font-medium">Đã chuyển</th>
                <th className="py-2 text-right font-medium">Đã nhận</th>
                <th className="py-2 text-right font-medium">Còn lại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {balances.map((b) => (
                <tr key={b.member_id}>
                  <td className="py-2 font-medium text-slate-800">{nameOf(b.member_id)}</td>
                  <td className="py-2 text-right">{money(b.paid)}</td>
                  <td className="py-2 text-right">{money(b.owed)}</td>
                  <td className="py-2 text-right">{money(b.transferred)}</td>
                  <td className="py-2 text-right">{money(b.received)}</td>
                  <td className={`py-2 text-right font-semibold ${b.balance > 0 ? 'text-green-700' : b.balance < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                    {b.balance > 0 ? '+' : ''}{money(b.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">Còn lại: <span className="text-green-700">+ được nhận</span> · <span className="text-red-600">− phải trả</span></p>
        {/* BAL-06 */}
        {!totalOk && <div className="mt-2"><Alert tone="error">Tổng cột "Còn lại" khác 0 – vui lòng báo lỗi cho người quản trị.</Alert></div>}
      </Card>

      {/* BAL-02, BAL-03 */}
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-800">Gợi ý chuyển tiền</h2>
          {canEdit && (
            <Button variant="secondary" onClick={() => { add.reset(); setFormOpen(true) }}>
              <HandCoins className="size-4" aria-hidden />
              Ghi nhận thanh toán
            </Button>
          )}
        </div>
        {transfers.length === 0 ? (
          <p className="text-sm text-slate-500">Mọi người đã thanh toán xong, không ai nợ ai.</p>
        ) : (
          <ul className="space-y-2">
            {transfers.map((t) => (
              <li key={`${t.from}-${t.to}`} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <span className="font-medium text-slate-800">{nameOf(t.from)}</span>
                <ArrowRight className="size-4 text-slate-400" aria-label="chuyển cho" />
                <span className="font-medium text-slate-800">{nameOf(t.to)}</span>
                <span className="ml-auto font-semibold text-slate-900">{money(t.amount)}</span>
                {canEdit && <Button variant="secondary" onClick={() => { add.reset(); setPaying(t) }}>Đã trả</Button>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* BAL-04 */}
      <Card>
        <h2 className="mb-3 font-semibold text-slate-800">Lịch sử thanh toán</h2>
        {settlementList.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có thanh toán nào.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {settlementList.map((s) => (
              <li key={s.id} className="flex items-center gap-2 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="text-slate-800">{nameOf(s.from_member)} → {nameOf(s.to_member)}: <strong>{money(s.amount)}</strong></p>
                  <p className="text-xs text-slate-500">{formatDate(s.settled_on)}{s.note ? ` · ${s.note}` : ''}</p>
                </div>
                {canEdit && (
                  <Button variant="ghost" className="text-red-600" aria-label="Xóa thanh toán" onClick={() => { remove.reset(); setDeleting(s) }}>
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <SettlementForm trip={trip} members={memberList} open={formOpen} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        open={paying !== null}
        title="Ghi nhận đã trả"
        message={
          <>
            <p>Ghi nhận <strong>{paying && nameOf(paying.from)}</strong> đã chuyển <strong>{paying && money(paying.amount)}</strong> cho <strong>{paying && nameOf(paying.to)}</strong> hôm nay?</p>
            {add.error && <div className="mt-3"><ErrorAlert error={toFriendlyError(add.error)} /></div>}
          </>
        }
        confirmLabel="Đã trả"
        loading={add.isPending}
        onConfirm={() => paying && add.mutate(
          { from_member: paying.from, to_member: paying.to, amount: paying.amount, settled_on: toISODate(new Date()), note: null },
          { onSuccess: () => { toast('Đã ghi nhận thanh toán'); setPaying(null) } },
        )}
        onClose={() => setPaying(null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Xóa thanh toán"
        message={
          <>
            <p>Xóa thanh toán {deleting && `${nameOf(deleting.from_member)} → ${nameOf(deleting.to_member)}: ${money(deleting.amount)}`}?</p>
            {remove.error && <div className="mt-3"><ErrorAlert error={toFriendlyError(remove.error)} /></div>}
          </>
        }
        confirmLabel="Xóa"
        danger
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => { toast('Đã xóa thanh toán'); setDeleting(null) } })}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}
