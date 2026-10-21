import { createClient } from '@/lib/supabase/server'
import { getActiveShift } from '@/lib/actions/shiftActions'
import { CashierView } from './_components/CashierView'
import { Product, Category, Discount, StoreProfile } from '@/types/database'

export const metadata = {
  title: 'Kasir POS - Barakah Fauna',
}

export default async function CashierPage() {
  const supabase = await createClient()

  // Ambil data produk aktif
  const { data: productsData } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  // Ambil data kategori
  const { data: categoriesData } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true })

  // Ambil diskon aktif
  const { data: discountsData } = await supabase
    .from('discounts')
    .select('*')
    .eq('is_active', true)

  // Ambil profil toko untuk cetak struk & QRIS
  const { data: storeProfileData } = await supabase
    .from('store_profile')
    .select('*')
    .limit(1)
    .maybeSingle()

  const currentShift = await getActiveShift()

  return (
    <CashierView
      initialProducts={(productsData as Product[]) || []}
      categories={(categoriesData as Category[]) || []}
      discounts={(discountsData as Discount[]) || []}
      currentShift={currentShift}
      storeProfile={storeProfileData as StoreProfile | null}
    />
  )
}
