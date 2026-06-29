'use client'
import { useState } from 'react'
import { QrCode, Search, User, Cpu } from 'lucide-react'
import { useRouter } from 'next/navigation'

function resolveQrRoute(code: string): string {
  const c = code.trim()
  if (c.startsWith('EMPLOYEE-')) {
    // EMPLOYEE-HP00xxx → /employee/HP00xxx
    return `/employee/${c.replace(/^EMPLOYEE-/, '')}`
  }
  if (c.startsWith('ITASSET-')) {
    // ITASSET-PC-001-... → /device/{full qr string}
    return `/device/${c}`
  }
  // Fallback: có thể là asset_code trực tiếp hoặc qr_code cũ
  return `/device/${c}`
}

export default function ScanPage() {
  const [manualCode, setManualCode] = useState('')
  const router = useRouter()

  function handleManualSearch(e: React.FormEvent) {
    e.preventDefault()
    if (manualCode.trim()) {
      router.push(resolveQrRoute(manualCode))
    }
  }

  return (
    <div className="p-8 max-w-lg">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Quét QR</h1>
        <p className="text-gray-400 text-sm mt-1">Tra cứu thiết bị hoặc nhân viên bằng mã QR</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center mb-6">
        <QrCode size={64} className="mx-auto text-gray-600 mb-4" />
        <p className="text-gray-400 text-sm mb-2">Dùng điện thoại để quét QR tốt hơn</p>
        <p className="text-gray-500 text-xs">Camera quét QR trên web đang được phát triển</p>
      </div>

      {/* Hướng dẫn QR format */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Cpu size={14} className="text-blue-400" />
            <span className="text-xs font-medium text-gray-300">QR Thiết bị</span>
          </div>
          <p className="text-xs text-gray-500">Prefix: <span className="font-mono text-gray-400">ITASSET-</span></p>
          <p className="text-xs text-gray-500 mt-0.5">→ Xem thông tin thiết bị</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <User size={14} className="text-green-400" />
            <span className="text-xs font-medium text-gray-300">QR Nhân viên</span>
          </div>
          <p className="text-xs text-gray-500">Prefix: <span className="font-mono text-gray-400">EMPLOYEE-</span></p>
          <p className="text-xs text-gray-500 mt-0.5">→ Xem thiết bị của NV</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="font-semibold mb-4">Nhập mã thủ công</h2>
        <form onSubmit={handleManualSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ITASSET-... hoặc EMPLOYEE-..."
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button type="submit"
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
            Tìm
          </button>
        </form>
        <p className="text-xs text-gray-600 mt-2.5">
          Hoặc nhập trực tiếp mã tài sản (VD: <span className="font-mono">PC-001</span>)
        </p>
      </div>
    </div>
  )
}
