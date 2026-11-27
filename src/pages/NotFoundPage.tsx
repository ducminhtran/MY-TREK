import { Link } from 'react-router'
import { SearchX } from 'lucide-react'
import { buttonClass, EmptyState } from '../components/ui'

export function NotFoundPage() {
  return (
    <EmptyState
      icon={<SearchX className="size-10" aria-hidden />}
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
