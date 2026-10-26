'use server'

import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

export async function createProductAction(data: {
  name: string
  sku: string
  categoryId?: string | null
  buyPrice: number
  sellPrice: number
  stockQty: number
  lowStockThreshold: number
}) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  const supabase = await createClient()
  const { data: inserted, error } = await supabase
    .from('products')
    .insert({
      name: data.name,
      sku: data.sku,
      category_id: data.categoryId || null,
      buy_price: data.buyPrice,
      sell_price: data.sellPrice,
      stock_qty: data.stockQty,
      low_stock_threshold: data.lowStockThreshold || 5,
      is_deleted: false,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Catat stok awal jika > 0
  if (data.stockQty > 0 && inserted) {
    await supabase.from('stock_logs').insert({
      product_id: inserted.id,
      user_id: session.id,
      type: 'in',
      qty_change: data.stockQty,
      reason: 'Stok awal produk baru',
    })
  }

  revalidatePath('/produk')
  revalidatePath('/kasir')
  return { success: true }
}

export async function updateProductAction(
  id: string,
  data: {
    name: string
    sku: string
    categoryId?: string | null
    buyPrice: number
    sellPrice: number
    lowStockThreshold: number
  }
) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .update({
      name: data.name,
      sku: data.sku,
      category_id: data.categoryId || null,
      buy_price: data.buyPrice,
      sell_price: data.sellPrice,
      low_stock_threshold: data.lowStockThreshold,
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/produk')
  revalidatePath('/kasir')
  return { success: true }
}

export async function deleteProductAction(id: string) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  const supabase = await createClient()
  // Soft-delete seperti di aplikasi Android
  const { error } = await supabase
    .from('products')
    .update({ is_deleted: true })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/produk')
  revalidatePath('/kasir')
  return { success: true }
}

export async function adjustStockAction(
  productId: string,
  qtyChange: number,
  typeOrReason: string,
  maybeReason?: string
) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  const supabase = await createClient()

  // Ambil data produk
  const { data: prod } = await supabase
    .from('products')
    .select('stock_qty, name')
    .eq('id', productId)
    .single()

  if (!prod) return { success: false, error: 'Produk tidak ditemukan' }

  const newStock = Math.max(0, (prod.stock_qty || 0) + qtyChange)

  // Tentukan reason dan type log
  const reason = maybeReason ? maybeReason.trim() : typeOrReason.trim()
  const logType = (typeOrReason === 'in' || typeOrReason === 'adjustment')
    ? typeOrReason
    : (qtyChange >= 0 ? 'in' : 'adjustment')

  // Update stok
  const { error: updateErr } = await supabase
    .from('products')
    .update({ stock_qty: newStock })
    .eq('id', productId)

  if (updateErr) return { success: false, error: updateErr.message }

  // Catat log stok
  await supabase.from('stock_logs').insert({
    product_id: productId,
    user_id: session.id,
    type: logType,
    qty_change: qtyChange,
    reason: reason || (qtyChange >= 0 ? 'Penambahan Stok' : 'Pengurangan Stok'),
  })

  revalidatePath('/produk')
  revalidatePath('/kasir')
  return { success: true }
}

export async function createCategoryAction(name: string) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase.from('categories').insert({ name: name.trim() })

  if (error) return { success: false, error: error.message }

  revalidatePath('/produk')
  revalidatePath('/kasir')
  return { success: true }
}

export async function updateCategoryAction(id: string, name: string) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('categories')
    .update({ name: name.trim() })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/produk')
  revalidatePath('/kasir')
  return { success: true }
}

export async function deleteCategoryAction(id: string) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  const supabase = await createClient()

  // Null-kan category_id pada produk yang memakai kategori ini terlebih dahulu agar aman
  await supabase
    .from('products')
    .update({ category_id: null })
    .eq('category_id', id)

  const { error } = await supabase.from('categories').delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/produk')
  revalidatePath('/kasir')
  return { success: true }
}
