import { Hammer } from 'lucide-react'
import { EmptyState } from '../../components/ui'

/** Tab chưa làm – sẽ thay bằng tab thật ở giai đoạn tương ứng */
export function ComingSoonTab({ title }: { title: string }) {
  return (
    <EmptyState
      icon={<Hammer className="size-10" aria-hidden />}
      title={title}
      description="Chức năng này sẽ có ở bản cập nhật tiếp theo."
    />
  )
}
