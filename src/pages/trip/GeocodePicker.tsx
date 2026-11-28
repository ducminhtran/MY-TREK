import { useState } from 'react'
import { LocateFixed, MapPin } from 'lucide-react'
import { Alert, Button } from '../../components/ui'
import { searchPlaces, type GeocodeResult } from '../../lib/geocode'
import { toFriendlyError } from '../../lib/errors'

type Props = {
  /** Chuỗi tìm kiếm: tên địa điểm + địa chỉ */
  query: string
  onPick: (result: GeocodeResult) => void
}

/** ITI-03: nút "Tìm tọa độ" – hiện ≤ 5 kết quả để chọn; không thấy thì cho nhập tay */
export function GeocodePicker({ query, onPick }: Props) {
  const [results, setResults] = useState<GeocodeResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string>()

  async function handleSearch() {
    setMessage(undefined)
    setResults(null)
    if (!query.trim()) {
      setMessage('Nhập tên địa điểm hoặc địa chỉ trước khi tìm.')
      return
    }
    setLoading(true)
    try {
      const found = await searchPlaces(query)
      if (found.length === 0) setMessage('Không tìm thấy địa điểm. Hãy thử từ khóa khác hoặc nhập tọa độ bằng tay.')
      setResults(found)
    } catch (err) {
      setMessage(toFriendlyError(err).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button variant="secondary" onClick={() => void handleSearch()} loading={loading}>
        <LocateFixed className="size-4" aria-hidden />
        Tìm tọa độ
      </Button>
      {message && <Alert tone="info">{message}</Alert>}
      {results && results.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {results.map((r) => (
            <li key={`${r.lat},${r.lng},${r.name}`}>
              <button
                type="button"
                className="flex min-h-11 w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => {
                  onPick(r)
                  setResults(null)
                }}
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden />
                <span className="text-slate-700">{r.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-slate-500">Dữ liệu tìm kiếm © OpenStreetMap contributors</p>
    </div>
  )
}
