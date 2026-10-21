'use server'

import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

export async function createDiscountAction(data: {
  name: string
  productId: string
  value: number
  type: string
  startDate: string
  endDate: string
}) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase.from('discounts').insert({
    name: data.name,
    product_id: data.productId,
    value: data.value,
    type: data.type,
    start_date: data.startDate,
    end_date: data.endDate,
    is_active: true,
  })

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
