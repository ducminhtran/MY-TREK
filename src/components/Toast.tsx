import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ToastTone = 'success' | 'error' | 'info'
type ToastItem = { id: number; text: string; tone: ToastTone }
type ShowToast = (text: string, tone?: ToastTone) => void

const ToastContext = createContext<ShowToast>(() => {})

const TONE_CLASS: Record<ToastTone, string> = {
  success: 'bg-slate-900 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-sky-700 text-white',
}

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const show = useCallback<ShowToast>((text, tone = 'success') => {
    const id = nextId++
    setItems((list) => [...list, { id, text, tone }])
    window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 3500)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* bottom-20: nằm trên thanh điều hướng dưới của mobile */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
        {items.map((t) => (
          <div key={t.id} className={`rounded-lg px-4 py-3 text-sm shadow-lg ${TONE_CLASS[t.tone]}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ShowToast {
  return useContext(ToastContext)
}
