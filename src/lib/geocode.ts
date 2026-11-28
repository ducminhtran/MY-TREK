/**
 * ITI-03: tìm tọa độ bằng Nominatim (OpenStreetMap).
 * Chính sách sử dụng: tối đa 1 request/giây, chỉ gọi khi người dùng bấm nút.
 */

export type GeocodeResult = { name: string; lat: number; lng: number }

const ENDPOINT = 'https://nominatim.openstreetmap.org/search'
let lastCallAt = 0

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function searchPlaces(query: string): Promise<GeocodeResult[]> {
  const q = query.trim()
  if (!q) return []

  // Giữ khoảng cách ≥ 1 giây giữa 2 lần gọi
  const wait = lastCallAt + 1000 - Date.now()
  if (wait > 0) await sleep(wait)
  lastCallAt = Date.now()

  const params = new URLSearchParams({ q, format: 'jsonv2', limit: '5', 'accept-language': 'vi' })
  const res = await fetch(`${ENDPOINT}?${params.toString()}`, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Dịch vụ tìm tọa độ đang bận (mã ${res.status}), vui lòng thử lại sau`)

  const data = (await res.json()) as { display_name: string; lat: string; lon: string }[]
  return data.slice(0, 5).map((r) => ({
    name: r.display_name,
    // 6 số lẻ ≈ 0,1 m – đủ chính xác
    lat: Math.round(Number(r.lat) * 1e6) / 1e6,
    lng: Math.round(Number(r.lon) * 1e6) / 1e6,
  }))
}
