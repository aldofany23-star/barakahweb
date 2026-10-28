export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] p-8 animate-in fade-in duration-150 select-none">
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 rounded-full border-2 border-[#00A250]/20 border-t-[#00A250] animate-spin" />
        <p className="text-xs font-medium text-gray-500 tracking-wide">
          Memuat...
        </p>
      </div>
    </div>
  )
}
