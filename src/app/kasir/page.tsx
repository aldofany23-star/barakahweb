import { createClient } from '@/lib/supabase/server'
import { getActiveShift } from '@/lib/actions/shiftActions'
import { CashierView } from './_components/CashierView'
import { Product, Category, Discount, StoreProfile, Bundle, BundleItem } from '@/types/database'

export const metadata = {
  title: 'Kasir POS - Barakah Fauna',
}

export default async function CashierPage() {
  const supabase = await createClient()

  // Ambil data produk aktif halaman pertama (16 item) secara hemat database
  const { data: productsData, count: totalProductsCount } = await supabase
    .from('products')
    .select('*, category:categories(*)', { count: 'exact' })
    .eq('is_deleted', false)
    .order('name', { ascending: true })
    .range(0, 15)

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

  // Ambil paket bundling aktif
  const { data: bundlesData } = await supabase
    .from('bundles')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // Ambil item produk dalam bundle
  const { data: bundleItemsData } = await supabase
    .from('bundle_items')
    .select('*, product:products(*)')

  // Ambil profil toko untuk cetak struk & QRIS
  const { data: storeProfileData } = await supabase
    .from('store_profile')
    .select('*')
    .limit(1)
    .maybeSingle()

  const currentShift = await getActiveShift()

  const typedBundleItems =
    (bundleItemsData as (BundleItem & { product?: Product | null })[]) || []

  const activeBundlesWithItems: (Bundle & {
    items: (BundleItem & { product?: Product | null })[]
  })[] = (bundlesData || []).map((b) => ({
    ...b,
    items: typedBundleItems.filter((item) => item.bundle_id === b.id),
  }))

  return (
    <CashierView
      initialProducts={(productsData as Product[]) || []}
      initialTotalCount={totalProductsCount || 0}
      categories={(categoriesData as Category[]) || []}
      discounts={(discountsData as Discount[]) || []}
      bundles={activeBundlesWithItems}
      currentShift={currentShift}
      storeProfile={storeProfileData as StoreProfile | null}
    />
  )
}
