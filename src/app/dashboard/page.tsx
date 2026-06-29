'use client'
import { useEffect, useState } from 'react'
import { Monitor, Laptop, Cpu, Package, CheckCircle, Archive, XCircle, Users, ArrowRight, Printer, Wifi, Zap } from 'lucide-react'
import Link from 'next/link'

interface Stats {
  total: number; in_use: number; in_stock: number; broken: number; employees: number
  laptop: number; monitor: number; pc: number; printer: number
  networking: number; component: number; ups: number; peripheral: number; other: number
}
interface RecentAssignment {
  id: string; assigned_date: string; is_active: boolean
  device?: { brand: string; model: string; asset_code: string; category: string }
  employee?: { full_name: string; department?: { name: string } }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recent, setRecent] = useState<RecentAssignment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const [{ data: devices }, { data: employees }, { data: assignments }] = await Promise.all([
        supabase.from('devices').select('status, category'),
        supabase.from('employees').select('id'),
        supabase.from('assignments')
          .select('id, assigned_date, is_active, device:devices(brand,model,asset_code,category), employee:employees(full_name,department:departments(name))')
          .order('created_at', { ascending: false })
          .limit(8),
      ])

      if (devices) {
        const byCategory = (cat: string) => devices.filter(d => d.category === cat).length
        setStats({
          total: devices.length,
          in_use: devices.filter(d => d.status === 'in_use').length,
          in_stock: devices.filter(d => d.status === 'in_stock').length,
          broken: devices.filter(d => d.status === 'broken').length,
          employees: employees?.length || 0,
          laptop: byCategory('laptop'), monitor: byCategory('monitor'), pc: byCategory('pc'),
          printer: byCategory('printer'), networking: byCategory('networking'),
          component: byCategory('component'), ups: byCategory('ups'),
          peripheral: byCategory('peripheral'), other: byCategory('other'),
        })
      }
      setRecent((assignments as unknown as RecentAssignment[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  const val = (n: number | undefined) => loading ? '—' : (n ?? 0).toString()

  const usedPct = stats && stats.total > 0 ? Math.round((stats.in_use / stats.total) * 100) : 0

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Tổng quan</h1>
        <p className="text-gray-400 text-sm mt-1">Hệ thống quản lý tài sản IT · HPCONS</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Tổng thiết bị', value: val(stats?.total), icon: Package, color: 'text-blue-400', bg: 'bg-blue-400/10', href: '/dashboard/devices' },
          { label: 'Đang sử dụng', value: val(stats?.in_use), icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10', href: '/dashboard/devices?status=in_use' },
          { label: 'Trong kho', value: val(stats?.in_stock), icon: Archive, color: 'text-purple-400', bg: 'bg-purple-400/10', href: '/dashboard/devices?status=in_stock' },
          { label: 'Hỏng / Thanh lý', value: val(stats?.broken), icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', href: '/dashboard/devices?status=broken' },
        ].map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href} className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-5 transition-colors group">
            <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center mb-3`}>
              <Icon className={color} size={20} />
            </div>
            <div className="text-2xl font-bold mb-0.5">{value}</div>
            <div className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">{label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Tỉ lệ sử dụng */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Tỉ lệ sử dụng</div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-bold">{loading ? '—' : `${usedPct}%`}</span>
            <span className="text-gray-500 text-sm mb-1">thiết bị đang dùng</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${usedPct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1.5">
            <span>{val(stats?.in_use)} đang dùng</span>
            <span>{val(stats?.in_stock)} trong kho</span>
          </div>
        </div>

        {/* Nhân viên */}
        <Link href="/dashboard/employees" className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-5 transition-colors group">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Nhân viên</div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-400/10 rounded-xl flex items-center justify-center">
              <Users className="text-orange-400" size={24} />
            </div>
            <div>
              <div className="text-3xl font-bold">{val(stats?.employees)}</div>
              <div className="text-sm text-gray-400">nhân viên</div>
            </div>
          </div>
        </Link>

        {/* Theo loại */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Theo loại thiết bị</div>
          <div className="space-y-2">
            {[
              { label: 'Laptop', value: stats?.laptop, icon: Laptop, color: 'text-blue-400', cat: 'laptop' },
              { label: 'Màn hình', value: stats?.monitor, icon: Monitor, color: 'text-purple-400', cat: 'monitor' },
              { label: 'PC', value: stats?.pc, icon: Cpu, color: 'text-green-400', cat: 'pc' },
              { label: 'Máy in', value: stats?.printer, icon: Printer, color: 'text-orange-400', cat: 'printer' },
              { label: 'Thiết bị mạng', value: stats?.networking, icon: Wifi, color: 'text-cyan-400', cat: 'networking' },
              { label: 'Linh kiện', value: stats?.component, icon: Cpu, color: 'text-yellow-400', cat: 'component' },
              { label: 'UPS', value: stats?.ups, icon: Zap, color: 'text-red-400', cat: 'ups' },
              { label: 'Phụ kiện', value: stats?.peripheral, icon: Package, color: 'text-pink-400', cat: 'peripheral' },
              { label: 'Khác', value: stats?.other, icon: Package, color: 'text-gray-400', cat: 'other' },
            ]
              .filter(item => (item.value ?? 0) > 0) // ẩn loại không có
              .map(({ label, value, icon: Icon, color, cat }) => (
                <Link key={cat} href={`/dashboard/devices?category=${cat}`} className="flex items-center gap-3 group">
                  <Icon className={`${color} shrink-0`} size={14} />
                  <span className="text-sm text-gray-400 flex-1 group-hover:text-white transition-colors">{label}</span>
                  <span className="text-sm font-semibold">{loading ? '—' : (value ?? 0)}</span>
                </Link>
              ))}
            {!loading && stats && [stats.laptop, stats.monitor, stats.pc, stats.printer, stats.networking, stats.component, stats.ups, stats.peripheral, stats.other].every(v => !v) && (
              <p className="text-xs text-gray-600">Chưa có dữ liệu</p>
            )}
          </div>
        </div>
      </div>

      {/* Cấp phát gần đây */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="font-semibold">Cấp phát gần đây</h2>
          <Link href="/dashboard/devices" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
            Xem tất cả <ArrowRight size={14} />
          </Link>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-center text-gray-500 text-sm">Đang tải...</div>
        ) : recent.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500 text-sm">Chưa có lịch sử cấp phát</div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {recent.map(a => (
              <div key={a.id} className="flex items-center gap-4 px-6 py-3.5">
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center shrink-0 text-gray-300 font-semibold text-sm">
                  {a.employee?.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{a.employee?.full_name}</span>
                    {a.is_active && <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded shrink-0">Hiện tại</span>}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{a.employee?.department?.name}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm text-gray-300 font-mono">{a.device?.asset_code}</div>
                  <div className="text-xs text-gray-500">{a.device?.brand} {a.device?.model}</div>
                </div>
                <div className="text-xs text-gray-500 shrink-0 w-20 text-right">
                  {new Date(a.assigned_date).toLocaleDateString('vi-VN')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="mt-6">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Thao tác nhanh</div>
        <div className="flex gap-3 flex-wrap">
          <Link href="/dashboard/devices/new" className="bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
            + Thêm thiết bị
          </Link>
          <Link href="/dashboard/devices/import" className="bg-gray-800 hover:bg-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
            Import Excel / PDF
          </Link>
          <Link href="/dashboard/employees/new" className="bg-gray-800 hover:bg-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
            + Thêm nhân viên
          </Link>
          <Link href="/dashboard/employees/import" className="bg-gray-800 hover:bg-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
            Import nhân viên
          </Link>
        </div>
      </div>
    </div>
  )
}
