import { createClient } from '@/lib/supabase/server'
import { SalesReportsView } from './_components/SalesReportsView'
import { Order, Shift, StoreProfile } from '@/types/database'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Laporan Penjualan - Barakah Fauna',
}

export default async function SalesReportsPage() {
  const supabase = await createClient()

  // Ambil hanya data awal yang diperlukan (Today + Shifts + StoreProfile)
  // Menjaga kuota egress Supabase Free Tier tetap sangat hemat (~30 KB per visit)
  const now = new Date()
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).toISOString()

  const [ordersRes, shiftsRes, storeProfileRes] = await Promise.all([
    supabase
      .from('orders')
      .select(
        'id, shift_id, cashier_name, order_number, table_number, guest_count, subtotal, tax, total, payment_method, status, custom_discount, cash_amount, change_amount, payment_details, created_at'
      )
      .gte('created_at', todayStart)
      .order('created_at', { ascending: false }),
    supabase
      .from('shifts')
      .select('*, profile:profiles(name)')
      .order('created_at', { ascending: false }),
    supabase.from('store_profile').select('*').limit(1).maybeSingle(),
  ])

  // Fallback: Jika hari ini toko belum ada transaksi, ambil 50 order terakhir agar tampilan awal langsung aktif
  let initialOrders = (ordersRes.data as Order[]) || []
  if (initialOrders.length === 0) {
    const { data: recentOrders } = await supabase
      .from('orders')
      .select(
        'id, shift_id, cashier_name, order_number, table_number, guest_count, subtotal, tax, total, payment_method, status, custom_discount, cash_amount, change_amount, payment_details, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(50)
    if (recentOrders) {
      initialOrders = recentOrders as Order[]
    }
  }

  return (
    <SalesReportsView
      initialOrders={initialOrders}
      initialShifts={
        (shiftsRes.data as unknown as (Shift & { profile?: { name: string } | null })[]) ||
        []
      }
      storeProfile={storeProfileRes.data as StoreProfile | null}
    />
  )
}
