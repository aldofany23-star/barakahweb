import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(amount: number | null | undefined): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : Number(amount) || 0
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatDateOnly(dateString: string): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export interface OrderPaymentBreakdown {
  cash: number
  qris: number
  transfer: number
}

export function getOrderPaymentBreakdown(order: {
  payment_method?: string | null
  total?: number | null
  payment_details?: any
}): OrderPaymentBreakdown {
  const result: OrderPaymentBreakdown = { cash: 0, qris: 0, transfer: 0 }
  const total = Number(order.total) || 0

  if (order.payment_method?.toLowerCase() === 'split' && order.payment_details?.payments) {
    const payments = order.payment_details.payments
    if (Array.isArray(payments)) {
      for (const p of payments) {
        const method = String(p.method || '').toLowerCase()
        const amount = Number(p.amount) || 0
        if (method === 'cash' || method === 'tunai') result.cash += amount
        else if (method === 'qris') result.qris += amount
        else if (method === 'transfer' || method === 'card') result.transfer += amount
      }
      return result
    }
  }

  const method = String(order.payment_method || '').toLowerCase()
  if (method === 'cash' || method === 'tunai') {
    result.cash += total
  } else if (method === 'qris') {
    result.qris += total
  } else if (method === 'transfer' || method === 'card') {
    result.transfer += total
  }

  return result
}

export function formatPaymentMethodLabel(order: {
  payment_method?: string | null
  payment_details?: any
}): string {
  if (order.payment_method?.toLowerCase() === 'split' && order.payment_details?.payments) {
    const list = order.payment_details.payments
      .map((p: any) => `${String(p.method).toUpperCase()} (${formatRupiah(Number(p.amount) || 0)})`)
      .join(' + ')
    return `SPLIT: ${list}`
  }
  return String(order.payment_method || 'CASH').toUpperCase()
}
