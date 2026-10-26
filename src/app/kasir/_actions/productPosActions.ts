'use server'

import { createClient } from '@/lib/supabase/server'
import { Product } from '@/types/database'

export interface GetProductsPosParams {
  page?: number
  pageSize?: number
  search?: string
  categoryId?: string | null
}

export interface GetProductsPosResult {
  success: boolean
  products: Product[]
  totalCount: number
  totalPages: number
  page: number
  pageSize: number
  error?: string
}

export async function getProductsPosAction(
  params: GetProductsPosParams
): Promise<GetProductsPosResult> {
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.max(1, params.pageSize || 16)
  const search = params.search?.trim() || ''
  const categoryId = params.categoryId || null

  const supabase = await createClient()

  try {
    let query = supabase
      .from('products')
      .select('*, category:categories(*)', { count: 'exact' })
      .eq('is_deleted', false)

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    if (search) {
      // Escape or handle alphanumeric search safely
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, count, error } = await query
      .order('name', { ascending: true })
      .range(from, to)

    if (error) {
      return {
        success: false,
        products: [],
        totalCount: 0,
        totalPages: 1,
        page,
        pageSize,
        error: error.message,
      }
    }

    const totalCount = count || 0
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

    return {
      success: true,
      products: (data as Product[]) || [],
      totalCount,
      totalPages,
      page,
      pageSize,
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal memuat produk'
    return {
      success: false,
      products: [],
      totalCount: 0,
      totalPages: 1,
      page,
      pageSize,
      error: errorMsg,
    }
  }
}
