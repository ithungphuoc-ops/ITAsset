import Link from 'next/link'
import { Monitor, Laptop, Cpu, QrCode, Users } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">IT</div>
          <span className="text-xl font-semibold tracking-tight">ITAsset</span>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-600/30 rounded-full px-4 py-1.5 text-sm text-blue-400 mb-6">
          <QrCode size={14} />
          Quét QR — tra cứu tức thì
        </div>
        <h1 className="text-5xl font-bold mb-4 tracking-tight">
          Quản lý tài sản IT<br />
          <span className="text-blue-500">đơn giản & nhanh chóng</span>
        </h1>
        <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
          Theo dõi 500+ thiết bị, lịch sử cấp phát, tra cứu bằng QR code — mọi lúc mọi nơi.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/dashboard" className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg font-medium transition-colors">
            Vào Dashboard
          </Link>
          <Link href="/scan" className="border border-gray-700 hover:border-gray-500 px-6 py-3 rounded-lg font-medium transition-colors">
            Quét QR
          </Link>
        </div>

        {/* Category icons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16">
          {[
            { icon: Laptop, label: 'Laptop', color: 'text-blue-400' },
            { icon: Monitor, label: 'Màn hình', color: 'text-purple-400' },
            { icon: Cpu, label: 'PC / Bộ PC', color: 'text-green-400' },
            { icon: Users, label: 'Nhân viên', color: 'text-orange-400' },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col items-center gap-2">
              <Icon className={color} size={28} />
              <span className="text-sm text-gray-400">{label}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
