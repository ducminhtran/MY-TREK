import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'
import { isSupabaseConfigured } from './lib/supabase'
import { ConfigMissing } from './components/ConfigMissing'
import { Layout } from './components/Layout'
import { TripsPage } from './pages/TripsPage'
import { NewTripPage } from './pages/NewTripPage'
import { ProfilePage } from './pages/ProfilePage'
import { NotFoundPage } from './pages/NotFoundPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
})

// KT-01: BrowserRouter + basename theo base path (bỏ dấu "/" cuối để khớp cả "/MY-TREK")
const basename = import.meta.env.BASE_URL.replace(/\/+$/, '') || '/'

export default function App() {
  // KT-05: thiếu biến môi trường → hiện hướng dẫn thay vì trắng trang
  if (!isSupabaseConfigured) return <ConfigMissing />

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={basename}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<TripsPage />} />
            <Route path="trips/new" element={<NewTripPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
