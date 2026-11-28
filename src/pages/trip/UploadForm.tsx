import { useEffect, useRef, useState } from 'react'
import { Camera, FolderOpen } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Alert, Button, ErrorAlert, Field, SELECT_CLASS } from '../../components/ui'
import { useExpenses } from '../../hooks/expenses'
import { useUploadFile } from '../../hooks/files'
import { useItinerary } from '../../hooks/itinerary'
import { toFriendlyError } from '../../lib/errors'
import { formatDate } from '../../lib/format'
import { formatBytes, validateUpload } from '../../lib/files'
import { MAX_FILE_SIZE_MB } from '../../lib/constants'

type Props = { tripId: string; open: boolean; onClose: () => void }

/** FILE-01: chọn tệp / chụp ảnh, tùy chọn gắn với 1 khoản chi hoặc 1 hoạt động */
export function UploadForm({ tripId, open, onClose }: Props) {
  const toast = useToast()
  const upload = useUploadFile(tripId)
  const expenses = useExpenses(tripId)
  const itinerary = useItinerary(tripId)
  const fileInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  // '' = không gắn; 'e:<id>' = khoản chi; 'i:<id>' = hoạt động
  const [link, setLink] = useState('')

  useEffect(() => {
    if (!open) return
    setFile(null)
    setFileError(null)
    setLink('')
    upload.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi mở form
  }, [open])

  function pick(list: FileList | null) {
    const chosen = list?.[0] ?? null
    setFile(chosen)
    setFileError(chosen ? validateUpload(chosen) : null)
  }

  function handleUpload() {
    if (!file || fileError) return
    upload.mutate(
      {
        file,
        expenseId: link.startsWith('e:') ? link.slice(2) : null,
        itineraryItemId: link.startsWith('i:') ? link.slice(2) : null,
      },
      { onSuccess: () => { toast('Đã tải tệp lên'); onClose() } },
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tải tệp lên"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={upload.isPending}>Hủy</Button>
          <Button onClick={handleUpload} loading={upload.isPending} disabled={!file || !!fileError}>Tải lên</Button>
        </>
      }
    >
      <div className="space-y-4">
        {upload.error && <ErrorAlert error={toFriendlyError(upload.error)} />}

        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => fileInput.current?.click()}>
            <FolderOpen className="size-4" aria-hidden />
            Chọn tệp
          </Button>
          {/* Trên điện thoại: mở camera chụp trực tiếp */}
          <Button variant="secondary" onClick={() => cameraInput.current?.click()}>
            <Camera className="size-4" aria-hidden />
            Chụp ảnh
          </Button>
          <input ref={fileInput} type="file" className="hidden" onChange={(e) => pick(e.target.files)} />
          <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files)} />
        </div>

        {file ? (
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="break-all font-medium text-slate-800">{file.name}</p>
            <p className="text-slate-500">{formatBytes(file.size)}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Ảnh, PDF hoặc tệp khác, tối đa {MAX_FILE_SIZE_MB} MB.</p>
        )}
        {fileError && <Alert tone="error">{fileError}</Alert>}

        <Field label="Gắn với (tùy chọn)" htmlFor="upload-link">
          <select id="upload-link" className={SELECT_CLASS} value={link} onChange={(e) => setLink(e.target.value)}>
            <option value="">Không gắn</option>
            {(expenses.data ?? []).length > 0 && (
              <optgroup label="Khoản chi">
                {(expenses.data ?? []).map((x) => (
                  <option key={x.id} value={`e:${x.id}`}>{formatDate(x.expense_date)} · {x.title}</option>
                ))}
              </optgroup>
            )}
            {(itinerary.data ?? []).length > 0 && (
              <optgroup label="Hoạt động lịch trình">
                {(itinerary.data ?? []).map((x) => (
                  <option key={x.id} value={`i:${x.id}`}>{formatDate(x.day_date)} · {x.title}</option>
                ))}
              </optgroup>
            )}
          </select>
        </Field>
      </div>
    </Modal>
  )
}
