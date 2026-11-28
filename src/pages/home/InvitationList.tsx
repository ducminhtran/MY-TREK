import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Mail } from 'lucide-react'
import { useAuth } from '../../auth/AuthProvider'
import { ConfirmDialog } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Button, ErrorAlert } from '../../components/ui'
import { useMyInvitations, useRespondInvitation } from '../../hooks/trips'
import { ROLE_LABELS } from '../../lib/constants'
import { toFriendlyError } from '../../lib/errors'
import { formatDateRange } from '../../lib/trips'
import type { Invitation } from '../../types'

/** MEM-03: khối "Lời mời" ở trang chủ – chỉ hiện khi có lời mời */
export function InvitationList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const invitations = useMyInvitations(user?.id)
  const respond = useRespondInvitation()
  const [declining, setDeclining] = useState<Invitation | null>(null)

  if (!invitations.data || invitations.data.length === 0) return null

  function accept(inv: Invitation) {
    respond.mutate(
      { memberId: inv.member_id, accept: true },
      {
        onSuccess: () => {
          toast(`Đã tham gia "${inv.trip_name}"`)
          navigate(`/trips/${inv.trip_id}`)
        },
      },
    )
  }

  function decline() {
    if (!declining) return
    respond.mutate(
      { memberId: declining.member_id, accept: false },
      {
        onSuccess: () => {
          toast('Đã từ chối lời mời', 'info')
          setDeclining(null)
        },
      },
    )
  }

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-brand-900">
        <Mail className="size-5" aria-hidden />
        Lời mời ({invitations.data.length})
      </h2>
      {respond.error && !declining && (
        <div className="mb-3"><ErrorAlert error={toFriendlyError(respond.error)} /></div>
      )}
      <ul className="space-y-3">
        {invitations.data.map((inv) => (
          <li key={inv.member_id} className="rounded-lg bg-white p-3 shadow-sm">
            <p className="font-medium text-slate-900">{inv.trip_name}</p>
            <p className="text-sm text-slate-600">
              {inv.destination ? `${inv.destination} · ` : ''}
              {formatDateRange(inv.start_date, inv.end_date)}
            </p>
            <p className="text-sm text-slate-600">
              {inv.invited_by ? `${inv.invited_by} mời bạn` : 'Bạn được mời'} với vai trò{' '}
              <strong>{ROLE_LABELS[inv.role]}</strong>
            </p>
            <div className="mt-3 flex gap-2">
              <Button className="flex-1 sm:flex-none" loading={respond.isPending && respond.variables?.memberId === inv.member_id && respond.variables.accept}
                disabled={respond.isPending} onClick={() => accept(inv)}>
                Chấp nhận
              </Button>
              <Button variant="secondary" className="flex-1 sm:flex-none" disabled={respond.isPending}
                onClick={() => { respond.reset(); setDeclining(inv) }}>
                Từ chối
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={declining !== null}
        title="Từ chối lời mời"
        message={
          <>
            <p>Bạn chắc chắn từ chối lời mời tham gia <strong>{declining?.trip_name}</strong>?</p>
            {respond.error && <div className="mt-3"><ErrorAlert error={toFriendlyError(respond.error)} /></div>}
          </>
        }
        confirmLabel="Từ chối"
        danger
        loading={respond.isPending}
        onConfirm={decline}
        onClose={() => setDeclining(null)}
      />
    </div>
  )
}
