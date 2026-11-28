import { lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'
import { isSupabaseConfigured } from './lib/supabase'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAuth } from './auth/RequireAuth'
import { ConfigMissing } from './components/ConfigMissing'
import { Layout } from './components/Layout'
import { ToastProvider } from './components/Toast'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { TripsPage } from './pages/TripsPage'
import { NewTripPage } from './pages/NewTripPage'
import { ProfilePage } from './pages/ProfilePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { TripDetailPage } from './pages/TripDetailPage'
import { OverviewTab } from './pages/trip/OverviewTab'
import { MembersTab } from './pages/trip/MembersTab'
import { SettingsTab } from './pages/trip/SettingsTab'
import { ItineraryTab } from './pages/trip/ItineraryTab'
import { ExpensesTab } from './pages/trip/ExpensesTab'
import { BalancesTab } from './pages/trip/BalancesTab'
import { ChecklistTab } from './pages/trip/ChecklistTab'
import { FilesTab } from './pages/trip/FilesTab'
import { Spinner } from './components/ui'

// KT-16: chỉ tải Leaflet khi mở tab Bản đồ
const MapTab = lazy(() => import('./pages/trip/MapTab'))

const queryClient = new QueryClient({
  defaultOptions: {
    // PWA-03: offlineFirst → vẫn gọi fetch khi offline để Service Worker trả dữ liệu đã cache (NetworkFirst)
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false, networkMode: 'offlineFirst' },
  },
})

// KT-01: BrowserRouter + basename theo base path (bỏ dấu "/" cuối để khớp cả "/MY-TREK")
const basename = import.meta.env.BASE_URL.replace(/\/+$/, '') || '/'

export default function App() {
  // KT-05: thiếu biến môi trường → hiện hướng dẫn thay vì trắng trang
  if (!isSupabaseConfigured) return <ConfigMissing />

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter basename={basename}>
            <Routes>
              {/* Công khai */}
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />

              {/* Cần đăng nhập (AUTH-07) */}
              <Route
                element={
                  <RequireAuth>
                    <Layout />
                  </RequireAuth>
                }
              >
                <Route index element={<TripsPage />} />
                <Route path="trips/new" element={<NewTripPage />} />
                <Route path="trips/:tripId" element={<TripDetailPage />}>
                  <Route index element={<OverviewTab />} />
                  <Route path="itinerary" element={<ItineraryTab />} />
                  <Route path="expenses" element={<ExpensesTab />} />
                  <Route path="balances" element={<BalancesTab />} />
                  <Route path="checklist" element={<ChecklistTab />} />
                  <Route
                    path="map"
                    element={
                      <Suspense fallback={<Spinner label="Đang tải bản đồ…" />}>
                        <MapTab />
                      </Suspense>
                    }
                  />
                  <Route path="files" element={<FilesTab />} />
                  <Route path="members" element={<MembersTab />} />
                  <Route path="settings" element={<SettingsTab />} />
                </Route>
                <Route path="profile" element={<ProfilePage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
