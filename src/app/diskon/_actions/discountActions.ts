'use server'

import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { formatRupiah } from '@/lib/utils'

export async function createDiscountAction(data: {
  name: string
  productId: string
  value: number
  type: string
  durationDays: number
  startDate?: string
  endDate?: string
}) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  const supabase = await createClient()
  const { data: prod } = await supabase
    .from('products')
    .select('*')
    .eq('id', data.productId)
    .single()

  if (!prod) return { success: false, error: 'Produk tidak ditemukan' }
  const projectedPrice =
    data.type === 'nominal'
      ? prod.sell_price - data.value
      : prod.sell_price - (prod.sell_price * data.value) / 100

  if (projectedPrice <= prod.buy_price) {
    return {
      success: false,
      error: `VALIDASI GAGAL: Diskon mengakibatkan harga jual (${formatRupiah(projectedPrice)}) di bawah atau sama dengan harga modal (${formatRupiah(prod.buy_price)}). Potensi kerugian!`,
    }
  }
  let startIso = data.startDate
  let endIso = data.endDate

  if (!startIso || !endIso) {
    const now = new Date()
    const future = new Date(now)
    future.setDate(future.getDate() + (data.durationDays || 30))
    future.setHours(23, 59, 59, 999)
    startIso = now.toISOString()
    endIso = future.toISOString()
  }

  const { error } = await supabase.from('discounts').insert({
    name: data.name.trim() || 'Promo Spesial',
    product_id: data.productId,
    value: data.value,
    type: data.type,
    start_date: startIso,
    end_date: endIso,
    is_active: true,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/diskon')
  revalidatePath('/kasir')
  return { success: true }
}

export async function deactivateDiscountAction(id: string) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('discounts')
    .update({ is_active: false })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/diskon')
  revalidatePath('/kasir')
  return { success: true }
}

export async function toggleDiscountAction(id: string, currentActive: boolean) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('discounts')
    .update({ is_active: !currentActive })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/diskon')
  revalidatePath('/kasir')
  return { success: true }
}

export async function deleteDiscountAction(id: string) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase.from('discounts').delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/diskon')
  revalidatePath('/kasir')
  return { success: true }
}

export async function createBundleAction(data: {
  name: string
  bundlePrice: number
  items: { productId: string; qty: number }[]
  durationDays: number
  startDate?: string
  endDate?: string
}) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  if (!data.name.trim()) {
    return { success: false, error: 'Nama paket bundling harus diisi' }
  }

  if (data.items.length === 0) {
    return { success: false, error: 'Pilih minimal satu produk untuk paket bundling' }
  }

  const supabase = await createClient()
  const productIds = data.items.map((i) => i.productId)
  const { data: prods } = await supabase
    .from('products')
    .select('id, buy_price, sell_price, name')
    .in('id', productIds)

  const productMap = new Map((prods || []).map((p) => [p.id, p]))

  let totalBuyPrice = 0
  for (const item of data.items) {
    const p = productMap.get(item.productId)
    if (p) {
      totalBuyPrice += (p.buy_price || 0) * (item.qty || 1)
    }
  }

  if (data.bundlePrice <= totalBuyPrice) {
    return {
      success: false,
      error: `VALIDASI GAGAL: Harga bundling (${formatRupiah(data.bundlePrice)}) di bawah atau sama dengan total modal (${formatRupiah(totalBuyPrice)}).`,
    }
  }

  let startIso = data.startDate
  let endIso = data.endDate

  if (!startIso || !endIso) {
    const now = new Date()
    const future = new Date(now)
    future.setDate(future.getDate() + (data.durationDays || 30))
    future.setHours(23, 59, 59, 999)
    startIso = now.toISOString()
    endIso = future.toISOString()
  }

  const { data: newBundle, error: bundleErr } = await supabase
    .from('bundles')
    .insert({
      name: data.name.trim(),
      bundle_price: data.bundlePrice,
      start_date: startIso,
      end_date: endIso,
      is_active: true,
    })
    .select()
    .single()

  if (bundleErr || !newBundle) {
    return { success: false, error: bundleErr?.message || 'Gagal menyimpan bundling' }
  }

  const bundleItemsPayload = data.items.map((item) => ({
    bundle_id: newBundle.id,
    product_id: item.productId,
    qty: item.qty || 1,
  }))

  const { error: itemsErr } = await supabase
    .from('bundle_items')
    .insert(bundleItemsPayload)

  if (itemsErr) {
    return { success: false, error: itemsErr.message }
  }

  revalidatePath('/diskon')
  revalidatePath('/kasir')
  return { success: true }
}

export async function deactivateBundleAction(bundleId: string) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('bundles')
    .update({ is_active: false })
    .eq('id', bundleId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/diskon')
  revalidatePath('/kasir')
  return { success: true }
}

export async function deleteBundleAction(bundleId: string) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  const supabase = await createClient()
  await supabase.from('bundle_items').delete().eq('bundle_id', bundleId)

  const { error } = await supabase.from('bundles').delete().eq('id', bundleId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/diskon')
  revalidatePath('/kasir')
  return { success: true }
}
