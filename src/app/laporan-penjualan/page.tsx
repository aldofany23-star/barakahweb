import { createClient } from '@/lib/supabase/server'
import { SalesReportsView } from './_components/SalesReportsView'
import { Order, StoreProfile } from '@/types/database'

export const metadata = {
  title: 'Laporan Penjualan - Barakah Fauna',
}

export default async function SalesReportsPage() {
  const supabase = await createClient()

  // Ambil data transaksi terbaru dengan relasi item produk
  const { data: ordersData } = await supabase
    .from('orders')
    .select('*, order_items(*, product:products(*))')
    .order('created_at', { ascending: false })
    .limit(200)

  // Ambil profil toko
  const { data: storeProfileData } = await supabase
    .from('store_profile')
    .select('*')
    .limit(1)
    .maybeSingle()

  return (
    <SalesReportsView
      initialOrders={(ordersData as Order[]) || []}
      storeProfile={storeProfileData as StoreProfile | null}
    />
  )
}
