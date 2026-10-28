import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { DashboardView } from './_components/DashboardView'
import { Order, Product, Category, StoreProfile, Profile } from '@/types/database'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Dashboard Analitik - Barakah Fauna',
  description: 'Dashboard performa omset, valuasi stok, pergerakan barang, dan transaksi kasir Barakah Fauna.',
}

interface DashboardOrderItem {
  id: string
  order_id: string
  product_id?: string | null
  qty: number
  unit_price: number
  total_price: number
  bundle_name?: string | null
  applied_promo_name?: string | null
  created_at?: string
}

async function fetchAllSince<T>(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  columns: string,
  sinceIso: string
): Promise<T[]> {
  const PAGE_SIZE = 1000
  const allRows: T[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (error || !data || data.length === 0) break
    allRows.push(...(data as unknown as T[]))
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
    if (from >= 4000) break
  }

  return allRows
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const session = await getSession()
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)
  const minDate = startOfMonth < thirtyFiveDaysAgo ? startOfMonth : thirtyFiveDaysAgo
  const sinceIso = minDate.toISOString()
  const [orders, orderItems, productsRes, categoriesRes, profilesRes, storeProfileRes] =
    await Promise.all([
      fetchAllSince<Order>(
        supabase,
        'orders',
        'id, shift_id, user_id, cashier_name, order_number, table_number, guest_count, subtotal, tax, total, payment_method, status, custom_discount, cash_amount, change_amount, payment_details, created_at',
        sinceIso
      ),
      fetchAllSince<DashboardOrderItem>(
        supabase,
        'order_items',
        'id, order_id, product_id, qty, unit_price, total_price, bundle_name, applied_promo_name, created_at',
        sinceIso
      ),
      supabase
        .from('products')
        .select('id, category_id, name, sku, buy_price, sell_price, stock_qty, low_stock_threshold, is_deleted')
        .eq('is_deleted', false)
        .order('name', { ascending: true }),
      supabase.from('categories').select('id, name').order('name', { ascending: true }),
      supabase.from('profiles').select('id, name, email, role').order('name', { ascending: true }),
      supabase.from('store_profile').select('*').limit(1).maybeSingle(),
    ])

  return (
    <DashboardView
      initialOrders={orders}
      initialOrderItems={orderItems}
      products={(productsRes.data as Product[]) || []}
      categories={(categoriesRes.data as Category[]) || []}
      profiles={(profilesRes.data as Profile[]) || []}
      storeProfile={storeProfileRes.data as StoreProfile | null}
      currentUserSession={session}
    />
  )
}
