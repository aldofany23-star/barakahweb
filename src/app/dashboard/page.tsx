import { createClient } from '@/lib/supabase/server'
import { DashboardView } from './_components/DashboardView'
import { Order, Product, Category } from '@/types/database'

export const metadata = {
  title: 'Dashboard Analitik - Barakah Fauna',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // Ambil data transaksi selesai
  const { data: ordersData } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(500)

  // Ambil data produk
  const { data: productsData } = await supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true })

  // Ambil kategori
  const { data: categoriesData } = await supabase
    .from('categories')
    .select('*')

  return (
    <DashboardView
      orders={(ordersData as Order[]) || []}
      products={(productsData as Product[]) || []}
      categories={(categoriesData as Category[]) || []}
    />
  )
}
