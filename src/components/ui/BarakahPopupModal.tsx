'use client'

import { ReactNode } from 'react'
import { AlertTriangle, AlertCircle, Info, CheckCircle2, ChevronLeft, X } from 'lucide-react'

interface BarakahPopupModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message?: string
  confirmButtonText?: string
  onConfirm?: () => void
  dismissButtonText?: string
  isConfirmEnabled?: boolean
  icon?: 'warning' | 'error' | 'info' | 'success'
  children?: ReactNode
}

export function BarakahPopupModal({
  isOpen,
  onClose,
  title,
  message,
  confirmButtonText = 'Mengerti',
  onConfirm,
  dismissButtonText,
  isConfirmEnabled = true,
  icon,
  children,
}: BarakahPopupModalProps) {
  if (!isOpen) return null

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
    } else {
      onClose()
    }
  }

  const renderIcon = () => {
    switch (icon) {
      case 'warning':
        return (
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 border border-amber-200 flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6 stroke-[2]" />
          </div>
        )
      case 'error':
        return (
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 border border-red-200 flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6 stroke-[2]" />
          </div>
        )
      case 'success':
        return (
          <div className="w-12 h-12 rounded-full bg-[#eef8f2] text-[#00A250] border border-[#b8e8cc] flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6 stroke-[2]" />
          </div>
        )
      case 'info':
        return (
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 border border-blue-200 flex items-center justify-center mb-3">
            <Info className="w-6 h-6 stroke-[2]" />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-[#e2e2e2] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
      >
        {/* Header (Mirrors BarakahPopupDialog) */}
        <div className="px-5 py-3.5 border-b border-[#e2e2e2] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              onClick={onClose}
              className="p-1 -ml-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-sm sm:text-base text-[#262626]">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[65vh]">
          {message ? (
            <div className="flex flex-col items-center text-center">
              {renderIcon()}
              <p className="text-sm text-[#262626] font-medium leading-relaxed">
                {message}
              </p>
            </div>
          ) : (
            children
          )}
        </div>

        {/* Footer (Mirrors BarakahPopupDialog) */}
        <div className="px-5 py-3 bg-[#fbfbfb] border-t border-[#e2e2e2] flex items-center justify-end gap-2">
          {dismissButtonText && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 bg-white border border-[#e2e2e2] hover:bg-gray-50 rounded-xl transition cursor-pointer shadow-2xs"
            >
              {dismissButtonText}
            </button>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isConfirmEnabled}
            className="px-5 py-2 text-xs font-bold text-white bg-[#00A250] hover:bg-[#008f46] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition cursor-pointer shadow-2xs"
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  )
}
