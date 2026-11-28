import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import { useToast } from '../../components/Toast'
import { Button, ErrorAlert, Field, Input, SELECT_CLASS, TEXTAREA_CLASS } from '../../components/ui'
import { useSaveItineraryItem } from '../../hooks/itinerary'
import { CATEGORY_LABELS } from '../../lib/constants'
import { toFriendlyError } from '../../lib/errors'
import { formatDateWithWeekday, formatNumber, formatTime, parseNumberInput } from '../../lib/format'
import { enumerateDays, parseCoordinate } from '../../lib/itinerary'
import type { ItineraryCategory, ItineraryInput, ItineraryItem, Trip } from '../../types'
import { GeocodePicker } from './GeocodePicker'

type Props = {
  trip: Trip
  open: boolean
  item: ItineraryItem | null
  /** Ngày mặc định khi thêm mới */
  defaultDay: string
  onClose: () => void
}

type Errors = Partial<Record<'day' | 'title' | 'end' | 'coords' | 'cost', string>>
const FORM_ID = 'itinerary-form'

/** ITI-02: thêm / sửa hoạt động */
export function ItineraryForm({ trip, open, item, defaultDay, onClose }: Props) {
  const toast = useToast()
  const save = useSaveItineraryItem(trip.id)

  const [day, setDay] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<ItineraryCategory>('tham_quan')
  const [locationName, setLocationName] = useState('')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [cost, setCost] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Errors>({})

  useEffect(() => {
    if (!open) return
    setDay(item?.day_date ?? defaultDay)
    setStartTime(formatTime(item?.start_time))
    setEndTime(formatTime(item?.end_time))
    setTitle(item?.title ?? '')
    setCategory(item?.category ?? 'tham_quan')
    setLocationName(item?.location_name ?? '')
    setAddress(item?.address ?? '')
    setLat(item?.lat != null ? String(item.lat) : '')
    setLng(item?.lng != null ? String(item.lng) : '')
    setCost(item?.cost_estimate != null ? formatNumber(item.cost_estimate, 2) : '')
    setNote(item?.note ?? '')
    setErrors({})
    save.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ nạp lại khi mở form
  }, [open, item, defaultDay])

  // BR-14: chỉ chọn ngày trong chuyến đi; giữ ngày cũ nếu hoạt động đang nằm ngoài
  const days = enumerateDays(trip.start_date, trip.end_date)
  const dayOptions = item && !days.includes(item.day_date) ? [item.day_date, ...days] : days

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const found: Errors = {}
    if (!day) found.day = 'Vui lòng chọn ngày'
    if (!title.trim()) found.title = 'Vui lòng nhập tiêu đề'
    if (startTime && endTime && endTime < startTime) found.end = 'Giờ kết thúc phải sau giờ bắt đầu'
    const latNum = parseCoordinate(lat)
    const lngNum = parseCoordinate(lng)
    if ((latNum === null) !== (lngNum === null)) found.coords = 'Cần nhập đủ cả vĩ độ và kinh độ'
    else if (latNum !== null && (Number.isNaN(latNum) || latNum < -90 || latNum > 90)) found.coords = 'Vĩ độ phải từ -90 đến 90'
    else if (lngNum !== null && (Number.isNaN(lngNum) || lngNum < -180 || lngNum > 180)) found.coords = 'Kinh độ phải từ -180 đến 180'
    const costNum = parseNumberInput(cost)
    if (costNum !== null && (Number.isNaN(costNum) || costNum < 0)) found.cost = 'Chi phí phải là số ≥ 0'
    setErrors(found)
    if (Object.keys(found).length > 0) return

    const input: ItineraryInput = {
      day_date: day,
      start_time: startTime || null,
      end_time: endTime || null,
      title: title.trim(),
      category,
      location_name: locationName.trim() || null,
      address: address.trim() || null,
      lat: latNum,
      lng: lngNum,
      cost_estimate: costNum,
      note: note.trim() || null,
    }
    save.mutate({ id: item?.id, input }, {
      onSuccess: () => {
        toast(item ? 'Đã lưu hoạt động' : 'Đã thêm hoạt động')
        onClose()
      },
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? 'Sửa hoạt động' : 'Thêm hoạt động'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Hủy</Button>
          <Button type="submit" form={FORM_ID} loading={save.isPending}>Lưu</Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4" noValidate>
        {save.error && <ErrorAlert error={toFriendlyError(save.error)} />}

        <Field label="Ngày" htmlFor="iti-day" required error={errors.day}>
          <select id="iti-day" className={SELECT_CLASS} value={day} onChange={(e) => setDay(e.target.value)}>
            {dayOptions.map((d) => {
              const index = days.indexOf(d)
              return (
                <option key={d} value={d}>
                  {index >= 0 ? `Ngày ${index + 1} · ` : '(Ngoài thời gian chuyến đi) '}{formatDateWithWeekday(d)}
                </option>
              )
            })}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Giờ bắt đầu" htmlFor="iti-start">
            <Input id="iti-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </Field>
          <Field label="Giờ kết thúc" htmlFor="iti-end" error={errors.end}>
            <Input id="iti-end" type="time" aria-invalid={!!errors.end} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </Field>
        </div>

        <Field label="Tiêu đề" htmlFor="iti-title" required error={errors.title}>
          <Input id="iti-title" maxLength={200} aria-invalid={!!errors.title} placeholder="VD: Tham quan Hồ Xuân Hương"
            value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>

        <Field label="Hạng mục" htmlFor="iti-category">
          <select id="iti-category" className={SELECT_CLASS} value={category}
            onChange={(e) => setCategory(e.target.value as ItineraryCategory)}>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>

        <Field label="Tên địa điểm" htmlFor="iti-place">
          <Input id="iti-place" maxLength={200} value={locationName} onChange={(e) => setLocationName(e.target.value)} />
        </Field>
        <Field label="Địa chỉ" htmlFor="iti-address">
          <Input id="iti-address" maxLength={500} value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>

        <GeocodePicker
          query={[locationName, address].filter((s) => s.trim()).join(', ')}
          onPick={(r) => {
            setLat(String(r.lat))
            setLng(String(r.lng))
            if (!address.trim()) setAddress(r.name.slice(0, 500))
          }}
        />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Vĩ độ" htmlFor="iti-lat" error={errors.coords}>
            <Input id="iti-lat" inputMode="decimal" placeholder="11.9404" aria-invalid={!!errors.coords}
              value={lat} onChange={(e) => setLat(e.target.value)} />
          </Field>
          <Field label="Kinh độ" htmlFor="iti-lng">
            <Input id="iti-lng" inputMode="decimal" placeholder="108.4583" aria-invalid={!!errors.coords}
              value={lng} onChange={(e) => setLng(e.target.value)} />
          </Field>
        </div>

        <Field label={`Chi phí dự kiến (${trip.base_currency})`} htmlFor="iti-cost" error={errors.cost}>
          <Input id="iti-cost" inputMode="decimal" placeholder="VD: 150.000" aria-invalid={!!errors.cost}
            value={cost} onChange={(e) => setCost(e.target.value)} />
        </Field>

        <Field label="Ghi chú" htmlFor="iti-note">
          <textarea id="iti-note" rows={3} maxLength={2000} className={TEXTAREA_CLASS} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </form>
    </Modal>
  )
}
