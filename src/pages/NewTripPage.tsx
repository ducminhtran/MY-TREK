import { useNavigate } from 'react-router'
import { Alert, Card } from '../components/ui'
import { useOnline } from '../hooks/useOnline'
import { TripForm } from '../components/TripForm'
import { useToast } from '../components/Toast'
import { useCreateTrip } from '../hooks/trips'
import { toFriendlyError } from '../lib/errors'

/** TRIP-02: tạo chuyến đi; người tạo là Owner; tạo xong mở trang chi tiết */
export function NewTripPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const create = useCreateTrip()
  const online = useOnline()

  return (
    <section className="mx-auto max-w-xl">
      <h1 className="mb-4 text-xl font-bold text-slate-900">Tạo chuyến đi</h1>
      <Card>
        {!online ? (
          <Alert tone="info">Cần kết nối mạng để tạo chuyến đi.</Alert>
        ) : (
        <TripForm
          submitLabel="Tạo chuyến đi"
          submitting={create.isPending}
          error={create.error ? toFriendlyError(create.error) : null}
          onSubmit={(input) =>
            create.mutate(input, {
              onSuccess: (trip) => {
                toast('Đã tạo chuyến đi')
                navigate(`/trips/${trip.id}`, { replace: true })
              },
            })
          }
        />
        )}
      </Card>
    </section>
  )
}
