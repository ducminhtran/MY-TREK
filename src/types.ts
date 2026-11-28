export type Profile = {
  id: string
  email: string | null
  full_name: string
}

export type TripRole = 'owner' | 'editor' | 'viewer'
export type MemberStatus = 'invited' | 'active'

export type Trip = {
  id: string
  name: string
  destination: string | null
  description: string | null
  start_date: string
  end_date: string
  base_currency: string
  budget: number | null
  owner_id: string
  created_at: string
}

/** Chuyến đi kèm vai trò của người đang đăng nhập */
export type MyTrip = Trip & { my_role: TripRole }

export type TripMember = {
  id: string
  trip_id: string
  user_id: string | null
  display_name: string
  email: string | null
  role: TripRole
  status: MemberStatus
  created_at: string
}

export type TripCurrency = {
  trip_id: string
  currency: string
  rate_to_base: number
}

export type Invitation = {
  member_id: string
  trip_id: string
  trip_name: string
  destination: string | null
  start_date: string
  end_date: string
  role: TripRole
  invited_by: string | null
}

export type ItineraryCategory = 'di_chuyen' | 'luu_tru' | 'an_uong' | 'tham_quan' | 'mua_sam' | 'khac'

export type ItineraryItem = {
  id: string
  trip_id: string
  day_date: string
  start_time: string | null
  end_time: string | null
  title: string
  category: ItineraryCategory
  location_name: string | null
  address: string | null
  lat: number | null
  lng: number | null
  cost_estimate: number | null
  note: string | null
  sort_order: number
  created_at: string
}

/** Dữ liệu ghi vào bảng itinerary_items (ITI-02) */
export type ItineraryInput = Omit<ItineraryItem, 'id' | 'trip_id' | 'sort_order' | 'created_at'>

export type ExpenseSplit = { member_id: string; share_amount: number }

export type Expense = {
  id: string
  trip_id: string
  title: string
  category: ItineraryCategory
  amount: number
  currency: string
  exchange_rate: number
  amount_base: number
  paid_by: string
  expense_date: string
  split_type: 'equal' | 'custom'
  note: string | null
  created_at: string
  splits: ExpenseSplit[]
  attachment_count: number
}

/** Tham số gửi RPC save_expense (KT-09) */
export type ExpenseInput = {
  id?: string
  title: string
  category: ItineraryCategory
  amount: number
  currency: string
  exchange_rate: number
  paid_by: string
  expense_date: string
  split_type: 'equal' | 'custom'
  note: string | null
}

export type Settlement = {
  id: string
  trip_id: string
  from_member: string
  to_member: string
  amount: number
  settled_on: string
  note: string | null
  created_at: string
}

/** Dữ liệu nhập của form chuyến đi (TRIP-02) */
export type TripInput = {
  name: string
  destination: string
  start_date: string
  end_date: string
  base_currency: string
  budget: number | null
  description: string
}
