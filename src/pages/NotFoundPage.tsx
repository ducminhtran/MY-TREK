import { Link } from 'react-router'
import { buttonClass, EmptyState } from '../components/ui'
import { ILLUSTRATIONS } from '../lib/assets'

export function NotFoundPage() {
  return (
    <EmptyState
      image={ILLUSTRATIONS.notFound}
      title="Không tìm thấy trang"
      description="Đường dẫn không tồn tại hoặc đã bị thay đổi."
      action={
        <Link to="/" className={buttonClass('secondary')}>
          Về trang chủ
        </Link>
      }
    />
  )
}
