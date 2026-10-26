'use server'

import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { getActiveShift } from '@/lib/actions/shiftActions'
import { CartItem, Order, OrderItem, Product } from '@/types/database'
import { revalidatePath } from 'next/cache'

export interface CheckoutInput {
  items: CartItem[]
  subtotal: number
  customDiscount: number
  total: number
  paymentMethod: string
  cashAmount: number
  changeAmount: number
  tableNumber?: string
}

export async function createOrderAction(input: CheckoutInput) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized: Harap login terlebih dahulu' }

  const currentShift = await getActiveShift()
  if (!currentShift) {
    return {
      success: false,
      error: 'Shift belum dibuka! Harap buka shift kasir terlebih dahulu di pojok kanan atas.',
    }
  }

  const supabase = await createClient()

  try {
    const orderNumber = `TRX-${Date.now().toString().slice(-6)}`

    // 1. Simpan ke tabel orders
    const { data: newOrder, error: orderErr } = await supabase
      .from('orders')
      .insert({
        shift_id: currentShift.id,
        user_id: session.id,
        cashier_name: session.name,
        order_number: orderNumber,
        table_number: input.tableNumber || null,
        guest_count: 1,
        subtotal: input.subtotal,
        tax: 0,
        total: input.total,
        payment_method: input.paymentMethod,
        status: 'completed',
        custom_discount: input.customDiscount,
        cash_amount: input.cashAmount,
        change_amount: input.changeAmount,
      })
      .select()
      .single()

    if (orderErr || !newOrder) {
      return { success: false, error: `Gagal membuat pesanan: ${orderErr?.message}` }
    }

    const orderId = newOrder.id

    // 2. Simpan order items dan potong stok
    for (const item of input.items) {
      if (!item.isBundle && item.product) {
        // Single Product
        await supabase.from('order_items').insert({
          order_id: orderId,
          product_id: item.product.id,
          qty: item.qty,
          unit_price: item.finalUnitPrice,
          total_price: item.totalPrice,
          applied_promo_name: item.appliedPromoName || null,
        })

        // Log stok keluar
        await supabase.from('stock_logs').insert({
          product_id: item.product.id,
          user_id: session.id,
          type: 'out',
          qty_change: -item.qty,
          reason: `Penjualan Order ${orderNumber}`,
        })

        // Ambil stok terbaru dan kurangi
        const { data: currentP } = await supabase
          .from('products')
          .select('stock_qty')
          .eq('id', item.product.id)
          .single()

        if (currentP) {
          const newQty = (currentP.stock_qty || 0) - item.qty
          await supabase.from('products').update({ stock_qty: newQty }).eq('id', item.product.id)
        }
      } else if (item.isBundle && item.bundle) {
        // Bundle (100% mirrors Android CashierViewModel.kt:368-410 proportional allocation)
        const { data: bundleItems } = await supabase
          .from('bundle_items')
          .select('*, product:products(*)')
          .eq('bundle_id', item.bundle.id)

        if (bundleItems && bundleItems.length > 0) {
          const totalNormalPrice = bundleItems.reduce((sum, bi) => {
            const p = bi.product as Product
            return sum + (p?.sell_price || 0) * (bi.qty || 1)
          }, 0)

          let remainingAllocatedTotal = item.totalPrice

          for (let idx = 0; idx < bundleItems.length; idx++) {
            const bi = bundleItems[idx]
            const p = bi.product as Product
            const totalQty = (bi.qty || 1) * item.qty

            let allocatedTotal = 0
            if (idx === bundleItems.length - 1) {
              allocatedTotal = remainingAllocatedTotal
            } else {
              const ratio =
                totalNormalPrice > 0
                  ? ((bi.qty || 1) * (p?.sell_price || 0)) / totalNormalPrice
                  : 1 / bundleItems.length
              allocatedTotal = Math.round(item.totalPrice * ratio)
              remainingAllocatedTotal -= allocatedTotal
            }

            const unitPrice = totalQty > 0 ? allocatedTotal / totalQty : 0

            await supabase.from('order_items').insert({
              order_id: orderId,
              product_id: bi.product_id,
              qty: totalQty,
              unit_price: unitPrice,
              total_price: allocatedTotal,
              bundle_name: item.bundle.name,
              applied_promo_name: null,
            })

            await supabase.from('stock_logs').insert({
              product_id: bi.product_id,
              user_id: session.id,
              type: 'out',
              qty_change: -totalQty,
              reason: `Penjualan Order ${orderNumber} (Bundle: ${item.bundle.name})`,
            })

            const { data: currentP } = await supabase
              .from('products')
              .select('stock_qty')
              .eq('id', bi.product_id)
              .single()

            if (currentP) {
              const newQty = Math.max(0, (currentP.stock_qty || 0) - totalQty)
              await supabase.from('products').update({ stock_qty: newQty }).eq('id', bi.product_id)
            }
          }
        }
      }
    }

    revalidatePath('/kasir')
    revalidatePath('/produk')
    revalidatePath('/laporan-penjualan')

    return {
      success: true,
      order: newOrder as Order,
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Kesalahan sistem saat checkout'
    return { success: false, error: msg }
  }
}
