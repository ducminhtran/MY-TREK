import { Download, Share, SquarePlus } from 'lucide-react'
import { Alert, Button, Card } from '../../components/ui'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'

/** PWA-04: nút Cài ứng dụng (Android/PC) hoặc hướng dẫn cho iOS */
export function InstallCard() {
  const { canInstall, isInstalled, isIOS, promptInstall } = useInstallPrompt()

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-slate-800">Cài ứng dụng</h2>
      {isInstalled ? (
        <Alert tone="success">Bạn đang dùng My Trek dạng ứng dụng đã cài.</Alert>
      ) : canInstall ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Cài My Trek lên màn hình chính để mở nhanh như một ứng dụng.</p>
          <Button onClick={() => void promptInstall()}>
            <Download className="size-4" aria-hidden />
            Cài ứng dụng
          </Button>
        </div>
      ) : isIOS ? (
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600">
          <li>Mở trang này bằng <strong>Safari</strong>.</li>
          <li className="flex-wrap">
            Bấm nút <strong>Chia sẻ</strong> <Share className="inline size-4 align-text-bottom" aria-hidden /> ở thanh dưới.
          </li>
          <li>
            Chọn <strong>Thêm vào MH chính</strong> <SquarePlus className="inline size-4 align-text-bottom" aria-hidden /> → Thêm.
          </li>
        </ol>
      ) : (
        <p className="text-sm text-slate-600">
          Trình duyệt chưa hỗ trợ cài trực tiếp. Trên Chrome/Edge: mở menu ⋮ → <strong>Cài đặt ứng dụng</strong> /{' '}
          <strong>Thêm vào màn hình chính</strong>.
        </p>
      )}
    </Card>
  )
}
