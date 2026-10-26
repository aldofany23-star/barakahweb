import { createClient } from '@/lib/supabase/server'
import { DiscountView } from './_components/DiscountView'
import { Discount, Product, Bundle, BundleItem } from '@/types/database'

export const metadata = {
  title: 'Setup Diskon & Bundling - Barakah Fauna',
}

export default async function DiscountPage() {
  const supabase = await createClient()

  // Ambil semua diskon dengan relasi produk
  const { data: discountsData } = await supabase
    .from('discounts')
    .select('*, product:products(*)')
    .order('created_at', { ascending: false })

  // Ambil semua paket bundling
  const { data: bundlesData } = await supabase
    .from('bundles')
    .select('*')
    .order('created_at', { ascending: false })

  // Ambil semua item bundle beserta produknya
  const { data: bundleItemsData } = await supabase
    .from('bundle_items')
    .select('*, product:products(*)')

  // Ambil semua produk aktif
  const { data: productsData } = await supabase
    .from('products')
    .select('*')
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  const typedDiscounts = (discountsData as (Discount & { product?: Product | null })[]) || []
  const typedProducts = (productsData as Product[]) || []
  const typedBundleItems = (bundleItemsData as (BundleItem & { product?: Product | null })[]) || []

  const bundlesWithItems: (Bundle & { items: (BundleItem & { product?: Product | null })[] })[] =
    (bundlesData || []).map((b) => ({
      ...b,
      items: typedBundleItems.filter((item) => item.bundle_id === b.id),
    }))

  return (
    <DiscountView
      initialDiscounts={typedDiscounts}
      initialBundles={bundlesWithItems}
      products={typedProducts}
    />
  )
}
