import { useState } from 'react'
import { ExternalLink, FileText, File as FileIcon, Image as ImageIcon, Paperclip, Trash2, Upload } from 'lucide-react'
import { ConfirmDialog } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Button, EmptyState, ErrorAlert, ErrorState, Spinner } from '../../components/ui'
import { createSignedFileUrl, useAttachments, useDeleteFile } from '../../hooks/files'
import { toFriendlyError } from '../../lib/errors'
import { fileKind, formatBytes } from '../../lib/files'
import type { Attachment } from '../../types'
import { useTripContext } from './context'
import { UploadForm } from './UploadForm'

const KIND_ICON = { image: ImageIcon, pdf: FileText, other: FileIcon } as const

/** Ngày giờ tải lên: 'dd/MM/yyyy HH:mm' */
function formatUploadedAt(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** FILE-01 → FILE-04 */
export function FilesTab() {
  const { trip, canEdit } = useTripContext()
  const toast = useToast()
  const files = useAttachments(trip.id)
  const remove = useDeleteFile(trip.id)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleting, setDeleting] = useState<Attachment | null>(null)
  const [opening, setOpening] = useState<string | null>(null)

  if (files.isPending) return <Spinner />
  if (files.isError) return <ErrorState error={toFriendlyError(files.error)} onRetry={() => void files.refetch()} />

  // FILE-03 / KT-15: mở tab mới NGAY khi bấm (iOS chặn popup mở sau await), rồi mới gán signed URL
  async function openFile(a: Attachment) {
    const win = window.open('', '_blank')
    setOpening(a.id)
    try {
      const url = await createSignedFileUrl(a.storage_path)
      if (win) {
        win.opener = null
        win.location.href = url
      } else {
        window.location.assign(url)
      }
    } catch (err) {
      win?.close()
      toast(toFriendlyError(err).message, 'error')
    } finally {
      setOpening(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-800">Tệp đính kèm ({files.data.length})</h2>
        {canEdit && (
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="size-4" aria-hidden />
            Tải lên
          </Button>
        )}
      </div>

      {files.data.length === 0 ? (
        <EmptyState
          icon={<Paperclip className="size-10" aria-hidden />}
          title="Chưa có tệp nào"
          description="Lưu vé, xác nhận đặt phòng, ảnh hóa đơn… để cả nhóm cùng xem."
          action={canEdit ? <Button onClick={() => setUploadOpen(true)}><Upload className="size-4" aria-hidden />Tải lên</Button> : undefined}
        />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {files.data.map((a) => {
            const Icon = KIND_ICON[fileKind(a.mime_type, a.file_name)]
            const linked = a.expense_title ? `Khoản chi: ${a.expense_title}` : a.itinerary_title ? `Hoạt động: ${a.itinerary_title}` : null
            return (
              <li key={a.id} className="flex items-center gap-3 px-3 py-2">
                <Icon className="size-8 shrink-0 text-brand-700" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900" title={a.file_name}>{a.file_name}</p>
                  <p className="text-xs text-slate-500">{formatBytes(a.size_bytes)} · {formatUploadedAt(a.created_at)}</p>
                  {linked && <p className="truncate text-xs text-brand-700">{linked}</p>}
                </div>
                <Button variant="ghost" className="px-3" loading={opening === a.id} onClick={() => void openFile(a)} aria-label={`Mở ${a.file_name}`}>
                  {opening !== a.id && <ExternalLink className="size-4" aria-hidden />}
                </Button>
                {canEdit && (
                  <Button variant="ghost" className="px-3 text-red-600" onClick={() => { remove.reset(); setDeleting(a) }} aria-label={`Xóa ${a.file_name}`}>
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <UploadForm tripId={trip.id} open={uploadOpen} onClose={() => setUploadOpen(false)} />

      <ConfirmDialog
        open={deleting !== null}
        title="Xóa tệp"
        message={
          <>
            <p>Xóa vĩnh viễn tệp <strong className="break-all">{deleting?.file_name}</strong>?</p>
            {remove.error && <div className="mt-3"><ErrorAlert error={toFriendlyError(remove.error)} /></div>}
          </>
        }
        confirmLabel="Xóa"
        danger
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting, { onSuccess: () => { toast('Đã xóa tệp'); setDeleting(null) } })}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}
