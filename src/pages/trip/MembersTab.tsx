import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Copy, LogOut, Pencil, Trash2, UserPlus } from 'lucide-react'
import { ConfirmDialog } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Badge, Button, Card, ErrorAlert, ErrorState, Spinner } from '../../components/ui'
import { useDeleteMember, useTripMembers } from '../../hooks/members'
import { copyText } from '../../lib/clipboard'
import { ROLE_LABELS } from '../../lib/constants'
import { toFriendlyError } from '../../lib/errors'
import { appUrl } from '../../lib/supabase'
import { buildInvitationText, MEMBER_STATE_LABELS, memberState } from '../../lib/trips'
import type { TripMember } from '../../types'
import { useTripContext } from './context'
import { MemberForm } from './MemberForm'

const STATE_TONE = { joined: 'green', invited: 'amber', offline: 'slate' } as const

/** MEM-01 → MEM-06 */
export function MembersTab() {
  const { trip, isOwner, myMemberId, online } = useTripContext()
  const navigate = useNavigate()
  const toast = useToast()
  const members = useTripMembers(trip.id)
  const remove = useDeleteMember(trip.id)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TripMember | null>(null)
  const [deleting, setDeleting] = useState<TripMember | null>(null)
  const [leaving, setLeaving] = useState(false)

  if (members.isPending) return <Spinner />
  if (members.isError) return <ErrorState error={toFriendlyError(members.error)} onRetry={() => void members.refetch()} />

  function openForm(member: TripMember | null) {
    setEditing(member)
    setFormOpen(true)
  }

  // MEM-04: app chưa tự gửi email → sao chép lời mời để gửi qua Zalo/Messenger
  async function copyInvitation(m: TripMember) {
    if (!m.email) return
    const ok = await copyText(buildInvitationText({
      tripName: trip.name, start: trip.start_date, end: trip.end_date, email: m.email, role: m.role, appLink: appUrl(),
    }))
    toast(ok ? 'Đã sao chép lời mời – dán vào Zalo/Messenger để gửi' : 'Không sao chép được, vui lòng thử lại', ok ? 'success' : 'error')
  }

  function confirmDelete() {
    if (!deleting) return
    remove.mutate(deleting.id, {
      onSuccess: () => {
        toast('Đã xóa thành viên')
        setDeleting(null)
      },
    })
  }

  function confirmLeave() {
    remove.mutate(myMemberId, {
      onSuccess: () => {
        toast('Bạn đã rời chuyến đi', 'info')
        navigate('/', { replace: true })
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-800">Thành viên ({members.data.length})</h2>
        {isOwner && online && (
          <Button onClick={() => openForm(null)}>
            <UserPlus className="size-4" aria-hidden />
            Thêm thành viên
          </Button>
        )}
      </div>

      <ul className="space-y-2">
        {members.data.map((m) => {
          const state = memberState(m)
          const manageable = isOwner && online && m.role !== 'owner'
          return (
            <li key={m.id}>
              <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">
                    {m.display_name}
                    {m.id === myMemberId && <span className="ml-1 text-sm font-normal text-brand-700">(Bạn)</span>}
                  </p>
                  {m.email && <p className="truncate text-sm text-slate-500">{m.email}</p>}
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge tone={m.role === 'owner' ? 'brand' : 'slate'}>{ROLE_LABELS[m.role]}</Badge>
                    <Badge tone={STATE_TONE[state]}>{MEMBER_STATE_LABELS[state]}</Badge>
                  </div>
                </div>
                {manageable && (
                  <div className="flex gap-1">
                    {state === 'invited' && (
                      <Button variant="secondary" onClick={() => void copyInvitation(m)} aria-label={`Sao chép lời mời cho ${m.display_name}`}>
                        <Copy className="size-4" aria-hidden />
                        <span className="sm:hidden lg:inline">Sao chép lời mời</span>
                      </Button>
                    )}
                    <Button variant="ghost" onClick={() => openForm(m)} aria-label={`Sửa ${m.display_name}`}>
                      <Pencil className="size-4" aria-hidden />
                    </Button>
                    <Button variant="ghost" className="text-red-600" onClick={() => { remove.reset(); setDeleting(m) }} aria-label={`Xóa ${m.display_name}`}>
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                )}
              </Card>
            </li>
          )
        })}
      </ul>

      {!isOwner && online && (
        <Button variant="secondary" className="text-red-700" onClick={() => { remove.reset(); setLeaving(true) }}>
          <LogOut className="size-4" aria-hidden />
          Rời chuyến đi
        </Button>
      )}

      <MemberForm tripId={trip.id} open={formOpen} member={editing} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        open={deleting !== null}
        title="Xóa thành viên"
        message={
          <>
            <p>Xóa <strong>{deleting?.display_name}</strong> khỏi chuyến đi?</p>
            {remove.error && <div className="mt-3"><ErrorAlert error={toFriendlyError(remove.error)} /></div>}
          </>
        }
        confirmLabel="Xóa"
        danger
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />

      <ConfirmDialog
        open={leaving}
        title="Rời chuyến đi"
        message={
          <>
            <p>Bạn sẽ không còn xem được chuyến đi <strong>{trip.name}</strong>. Muốn tham gia lại cần Chủ chuyến đi mời lại.</p>
            {remove.error && <div className="mt-3"><ErrorAlert error={toFriendlyError(remove.error)} /></div>}
          </>
        }
        confirmLabel="Rời chuyến đi"
        danger
        loading={remove.isPending}
        onConfirm={confirmLeave}
        onClose={() => setLeaving(false)}
      />
    </div>
  )
}
