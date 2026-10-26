import { createClient } from '@/lib/supabase/server'
import { ProductManagementView } from './_components/ProductManagementView'
import { Product, Category, StockLog } from '@/types/database'

export const metadata = {
  title: 'Produk & Stock - Barakah Fauna',
}

export default async function ProductPage() {
  const supabase = await createClient()

  // Ambil daftar produk
  const { data: productsData } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .order('name', { ascending: true })

  // Ambil kategori
  const { data: categoriesData } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true })

  // Ambil 50 log stok terakhir
  const { data: logsData } = await supabase
    .from('stock_logs')
    .select('*, product:products(name)')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <ProductManagementView
      initialProducts={(productsData as Product[]) || []}
      categories={(categoriesData as Category[]) || []}
      stockLogs={(logsData as (StockLog & { product?: Product | null })[]) || []}
    />
  )
}
