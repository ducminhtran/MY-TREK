import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Trash2 } from 'lucide-react'
import { ConfirmDialog } from '../../components/Modal'
import { TripForm } from '../../components/TripForm'
import { useToast } from '../../components/Toast'
import { Alert, Button, Card, ErrorAlert } from '../../components/ui'
import { useDeleteTrip, useExpenseCount, useUpdateTrip } from '../../hooks/trips'
import { toFriendlyError } from '../../lib/errors'
import { useTripContext } from './context'
import { CurrencySection } from './CurrencySection'

/** SET-01 → SET-03 */
export function SettingsTab() {
  const { trip, canEdit, isOwner } = useTripContext()
  const navigate = useNavigate()
  const toast = useToast()
  const update = useUpdateTrip(trip.id)
  const remove = useDeleteTrip(trip.id)
  const expenseCount = useExpenseCount(trip.id)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!canEdit) {
    return <Alert tone="info">Bạn có quyền <strong>Chỉ xem</strong> nên không thay đổi được cài đặt của chuyến đi.</Alert>
  }

  function handleDelete() {
    remove.mutate(undefined, {
      onSuccess: () => {
        toast('Đã xóa chuyến đi')
        navigate('/', { replace: true })
      },
    })
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Card>
        <h2 className="mb-3 font-semibold text-slate-800">Thông tin chuyến đi</h2>
        {/* key: nạp lại form khi dữ liệu chuyến đi thay đổi */}
        <TripForm
          key={`${trip.id}-${trip.name}-${trip.start_date}-${trip.end_date}-${trip.base_currency}`}
          initial={trip}
          submitLabel="Lưu thay đổi"
          submitting={update.isPending}
          error={update.error ? toFriendlyError(update.error) : null}
          currencyLocked={(expenseCount.data ?? 0) > 0}
          onSubmit={(input) => update.mutate(input, { onSuccess: () => toast('Đã lưu thông tin chuyến đi') })}
        />
      </Card>

      <CurrencySection />

      {/* SET-03: chỉ Owner thấy */}
      {isOwner && (
        <Card className="border-red-200">
          <h2 className="mb-1 font-semibold text-red-700">Vùng nguy hiểm</h2>
          <p className="mb-3 text-sm text-slate-600">
            Xóa chuyến đi sẽ xóa vĩnh viễn toàn bộ lịch trình, chi tiêu, checklist và tệp đính kèm. Không thể hoàn tác.
          </p>
          <Button variant="danger" onClick={() => { remove.reset(); setConfirmDelete(true) }}>
            <Trash2 className="size-4" aria-hidden />
            Xóa chuyến đi
          </Button>
        </Card>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Xóa chuyến đi"
        message={
          <>
            <p>Toàn bộ dữ liệu của <strong>{trip.name}</strong> sẽ bị xóa vĩnh viễn.</p>
            {remove.error && <div className="mt-3"><ErrorAlert error={toFriendlyError(remove.error)} /></div>}
          </>
        }
        requireText={trip.name}
        confirmLabel="Xóa vĩnh viễn"
        danger
        loading={remove.isPending}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}
