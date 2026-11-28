import { useEffect, useId, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button, Field, Input } from './ui'

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Nút hành động – mobile cố định ở cuối bottom sheet */
  footer?: ReactNode
}

/** RESP-01: mobile = bottom sheet, desktop (md) = modal giữa màn hình */
export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center md:items-center md:p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="pb-safe relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-xl md:max-h-[85vh] md:max-w-lg md:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <h2 id={titleId} className="text-base font-semibold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="-mr-2 grid size-11 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Đóng">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && <div className="flex gap-2 border-t border-slate-200 px-4 py-3 [&>*]:flex-1 md:justify-end md:[&>*]:flex-none">{footer}</div>}
      </div>
    </div>
  )
}

type ConfirmDialogProps = {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  danger?: boolean
  loading?: boolean
  /** Bắt người dùng gõ lại chuỗi này mới cho xác nhận (TRIP-04) */
  requireText?: string
  onConfirm: () => void
  onClose: () => void
}

/** mục 9.5: thao tác xóa luôn hỏi xác nhận */
export function ConfirmDialog({
  open, title, message, confirmLabel = 'Xác nhận', danger = false, loading = false, requireText, onConfirm, onClose,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('')
  const inputId = useId()

  useEffect(() => {
    if (open) setTyped('')
  }, [open])

  const blocked = requireText !== undefined && typed.trim() !== requireText.trim()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Hủy</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading} disabled={blocked}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-sm text-slate-700">
        <div>{message}</div>
        {requireText !== undefined && (
          <Field label={`Gõ lại "${requireText}" để xác nhận`} htmlFor={inputId}>
            <Input id={inputId} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </Field>
        )}
      </div>
    </Modal>
  )
}
