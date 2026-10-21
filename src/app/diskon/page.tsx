import { createClient } from '@/lib/supabase/server'
import { DiscountView } from './_components/DiscountView'
import { Discount, Product } from '@/types/database'

export const metadata = {
  title: 'Setup Diskon - Barakah Fauna',
}

export default async function DiscountPage() {
  const supabase = await createClient()

  const { data: discountsData } = await supabase
    .from('discounts')
    .select('*, product:products(*)')
    .order('created_at', { ascending: false })

  const { data: productsData } = await supabase
    .from('products')
    .select('*')
    .eq('is_deleted', false)
    .order('name', { ascending: true })

  return (
    <DiscountView
      initialDiscounts={(discountsData as (Discount & { product?: Product | null })[]) || []}
      products={(productsData as Product[]) || []}
    />
  )
}
