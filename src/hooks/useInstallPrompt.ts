import { useSyncExternalStore } from 'react'

/** Sự kiện chưa có trong thư viện kiểu DOM chuẩn */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// PWA-04: sự kiện beforeinstallprompt có thể tới trước khi trang Tài khoản được mở,
// nên bắt ngay khi module được nạp và lưu lại.
let deferredPrompt: BeforeInstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    installed = true
    notify()
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  // iPadOS 13+ báo là MacIntel nhưng có màn hình cảm ứng
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function useInstallPrompt() {
  const prompt = useSyncExternalStore(subscribe, () => deferredPrompt, () => null)
  const isInstalled = useSyncExternalStore(subscribe, () => installed || isStandalone(), () => false)

  async function promptInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    deferredPrompt = null
    notify()
  }

  return {
    canInstall: prompt !== null && !isInstalled,
    isInstalled,
    isIOS: isIOS(),
    promptInstall,
  }
}
