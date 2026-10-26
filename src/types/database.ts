export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Profile {
  id: string
  name: string
  role: 'admin' | 'kasir' | string
  menu_access?: string[] | null
  created_at: string
  email?: string | null
  raw_password?: string | null
  last_seen_work_report?: string | null
}

export interface Category {
  id: string
  name: string
  created_at?: string
}

export interface Product {
  id: string
  category_id?: string | null
  name: string
  sku: string
  buy_price: number
  sell_price: number
  stock_qty: number
  low_stock_threshold: number
  is_deleted: boolean
  created_at?: string
  category?: Category | null
}

export interface Discount {
  id: string
  name: string
  product_id: string
  value: number
  type: 'nominal' | 'percentage' | string
  start_date: string
  end_date: string
  is_active: boolean
  created_at?: string
  product?: Product | null
}

export interface Bundle {
  id: string
  name: string
  bundle_price: number
  start_date?: string | null
  end_date?: string | null
  is_active: boolean
  created_at?: string
  items?: (BundleItem & { product?: Product | null })[]
}

export interface BundleItem {
  id: string
  bundle_id: string
  product_id: string
  qty: number
  product?: Product | null
}

export interface Shift {
  id: string
  user_id?: string | null
  start_time: string
  end_time?: string | null
  expected_revenue?: number
  actual_revenue?: number
  system_revenue?: number | null
  starting_cash?: number | null
  cash_difference?: number | null
  notes?: string | null
  status: 'active' | 'closed' | string
  created_at?: string
  profile?: { name: string } | null
}

export interface Order {
  id: string
  shift_id?: string | null
  user_id?: string | null
  cashier_name?: string | null
  order_number: string
  table_number?: string | null
  guest_count: number
  subtotal: number
  tax: number
  total: number
  payment_method: 'cash' | 'transfer' | 'qris' | string
  status: 'pending' | 'completed' | 'cancelled' | string
  custom_discount: number
  cash_amount: number
  change_amount: number
  created_at: string
  order_items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id?: string | null
  qty: number
  unit_price: number
  total_price: number
  bundle_name?: string | null
  applied_promo_name?: string | null
  created_at?: string
  product?: Product | null
}

export interface StockLog {
  id: string
  product_id: string
  user_id?: string | null
  type: 'sale' | 'restock' | 'adjustment' | 'return' | string
  qty_change: number
  reason?: string | null
  created_at: string
}

export interface StoreProfile {
  id: string
  store_name: string
  tagline?: string | null
  address?: string | null
  whatsapp?: string | null
  email?: string | null
  instagram?: string | null
  qris_image_url?: string | null
  bank_account_info?: string | null
  updated_at?: string | null
}

export interface WorkReport {
  id: string
  user_id: string
  user_name: string
  caption: string
  image_urls?: string[] | null
  is_pinned: boolean
  created_at: string
}

export interface CartItem {
  id: string
  product?: Product | null
  bundle?: Bundle | null
  name: string
  qty: number
  originalPrice: number
  finalUnitPrice: number
  totalPrice: number
  appliedPromoName?: string | null
  isBundle: boolean
  bundleDetails?: string[] | null
}
