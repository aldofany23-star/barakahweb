'use server'

import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { Shift, Order } from '@/types/database'
import { getOrderPaymentBreakdown } from '@/lib/utils'
import { revalidatePath } from 'next/cache'

export async function getActiveShift(): Promise<Shift | null> {
  const session = await getSession()
  if (!session) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('user_id', session.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data
}

export async function startShiftAction() {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  const supabase = await createClient()

  // Pastikan belum ada shift aktif
  const existing = await getActiveShift()
  if (existing) {
    return { success: false, error: 'Shift sudah berjalan.' }
  }

  const { data, error } = await supabase
    .from('shifts')
    .insert({
      user_id: session.id,
      status: 'active',
      start_time: new Date().toISOString(),
      expected_revenue: 0,
      actual_revenue: 0,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true, shift: data }
}

export async function getShiftSummary(shiftId: string) {
  const supabase = await createClient()
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('shift_id', shiftId)
    .eq('status', 'completed')

  if (error || !orders) {
    return {
      totalRevenue: 0,
      cashRevenue: 0,
      qrisRevenue: 0,
      transferRevenue: 0,
      totalOrders: 0,
    }
  }

  const typedOrders = orders as Order[]
  const totalRevenue = typedOrders.reduce((sum, o) => sum + (o.total || 0), 0)
  
  let cashRevenue = 0
  let qrisRevenue = 0
  let transferRevenue = 0

  for (const o of typedOrders) {
    const bd = getOrderPaymentBreakdown(o)
    cashRevenue += bd.cash
    qrisRevenue += bd.qris
    transferRevenue += bd.transfer
  }

  return {
    totalRevenue,
    cashRevenue,
    qrisRevenue,
    transferRevenue,
    totalOrders: typedOrders.length,
  }
}

export async function endShiftAction(shiftId: string, actualRevenue: number) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('shifts')
    .update({
      status: 'closed',
      actual_revenue: actualRevenue,
      end_time: new Date().toISOString(),
    })
    .eq('id', shiftId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/', 'layout')
  revalidatePath('/laporan-penjualan')
  revalidatePath('/kasir')
  return { success: true }
}
