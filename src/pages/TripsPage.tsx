import { Link } from 'react-router'
import { Luggage, Plus } from 'lucide-react'
import { buttonClass, EmptyState } from '../components/ui'

/** TRIP-01 – khung trang; dữ liệu thật làm ở Giai đoạn 4 */
export function TripsPage() {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Chuyến đi của tôi</h1>
        <Link to="/trips/new" className={buttonClass('primary', 'hidden md:inline-flex')}>
          <Plus className="size-4" aria-hidden />
          Tạo chuyến đi
        </Link>
      </div>

      <EmptyState
        icon={<Luggage className="size-10" aria-hidden />}
        title="Chưa có chuyến đi nào"
        description="Tạo chuyến đi đầu tiên để lên lịch trình, ghi chi tiêu và chia tiền cùng bạn bè."
        action={
          <Link to="/trips/new" className={buttonClass('primary')}>
            <Plus className="size-4" aria-hidden />
            Tạo chuyến đi
          </Link>
        }
      />
    </section>
  )
}
