'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, Plus, Upload, Monitor, Laptop, Cpu, Package, Printer, Wifi, Zap } from 'lucide-react'
import Link from 'next/link'
import type { DeviceStatus, DeviceCategory } from '@/lib/types'

function normalizeVi(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, m => m === 'đ' ? 'd' : 'D').toLowerCase()
}

interface Device {
  id: string; asset_code: string; category: DeviceCategory; brand: string; model: string
  serial_number?: string; status: DeviceStatus; warranty_expiry?: string
  quantity: number; quantity_in_use: number; quantity_in_stock: number
  assignees?: { id: string; full_name: string }[]
}

const STATUS_LABEL: Record<DeviceStatus, string> = {
  in_use: 'Đang dùng', in_stock: 'Trong kho', broken: 'Hỏng', liquidated: 'Thanh lý',
}
const STATUS_COLOR: Record<DeviceStatus, string> = {
  in_use: 'bg-green-500/20 text-green-400',
  in_stock: 'bg-blue-500/20 text-blue-400',
  broken: 'bg-red-500/20 text-red-400',
  liquidated: 'bg-gray-500/20 text-gray-400',
}
const CATEGORY_LABEL: Record<DeviceCategory, string> = {
  laptop: 'Laptop', monitor: 'Màn hình', pc: 'PC', peripheral: 'Phụ kiện',
  printer: 'Máy in', networking: 'Thiết bị mạng', component: 'Linh kiện', ups: 'UPS', other: 'Khác',
}
const CATEGORY_ICON: Record<DeviceCategory, React.ElementType> = {
  laptop: Laptop, monitor: Monitor, pc: Cpu, peripheral: Package,
  printer: Printer, networking: Wifi, component: Cpu, ups: Zap, other: Package,
}

export default function DevicesPage() {
  const [allDevices, setAllDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<DeviceCategory | ''>('')
  const [filterStatus, setFilterStatus] = useState<DeviceStatus | ''>('')

  const fetchDevices = useCallback(async () => {
    const params = new URLSearchParams()
    if (filterCategory) params.set('category', filterCategory)
    if (filterStatus) params.set('status', filterStatus)
    const res = await fetch(`/api/devices?${params.toString()}`)
    const json = await res.json()
    setAllDevices((json.data as Device[]) || [])
    setLoading(false)
  }, [filterCategory, filterStatus])

  useEffect(() => { fetchDevices() }, [fetchDevices])

  // Text search client-side — hỗ trợ không dấu
  const devices = useMemo(() => {
    if (!search.trim()) return allDevices
    const q = normalizeVi(search)
    return allDevices.filter(d =>
      normalizeVi(d.asset_code).includes(q) ||
      normalizeVi(d.brand).includes(q) ||
      normalizeVi(d.model).includes(q) ||
      normalizeVi(d.serial_number || '').includes(q)
    )
  }, [allDevices, search])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Thiết bị</h1>
          <p className="text-gray-400 text-sm mt-1">{loading ? '...' : `${devices.length} thiết bị`}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/devices/import" className="flex items-center gap-2 border border-gray-700 hover:border-gray-500 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-300 transition-colors">
            <Upload size={16} />
            Import Excel / PDF
          </Link>
          <Link href="/dashboard/devices/new" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} />
            Thêm thiết bị
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm mã, serial, hãng, model..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value as DeviceCategory | '')}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
          <option value="">Tất cả loại</option>
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as DeviceStatus | '')}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 text-left">
              <th className="px-4 py-3 font-medium">Mã tài sản</th>
              <th className="px-4 py-3 font-medium">Loại</th>
              <th className="px-4 py-3 font-medium">Hãng / Model</th>
              <th className="px-4 py-3 font-medium">Serial</th>
              <th className="px-4 py-3 font-medium">Cấp cho</th>
              <th className="px-4 py-3 font-medium">Tồn kho</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
              <th className="px-4 py-3 font-medium">Bảo hành</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-16 text-center text-gray-500">Đang tải...</td></tr>
            ) : devices.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-gray-500">
                  <Package size={32} className="mx-auto mb-3 opacity-30" />
                  <p>Chưa có thiết bị nào</p>
                  <Link href="/dashboard/devices/new" className="inline-block mt-3 text-blue-400 hover:text-blue-300 text-sm">
                    + Thêm thiết bị đầu tiên
                  </Link>
                </td>
              </tr>
            ) : devices.map(device => {
              const Icon = CATEGORY_ICON[device.category]
              const isWarrantyExpired = device.warranty_expiry && new Date(device.warranty_expiry) < new Date()
              return (
                <tr key={device.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-blue-400 text-sm">{device.asset_code}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Icon size={14} />
                      {CATEGORY_LABEL[device.category]}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{device.brand}</div>
                    <div className="text-gray-400 text-xs">{device.model}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{device.serial_number || '—'}</td>
                  <td className="px-4 py-3">
                    {device.assignees && device.assignees.length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        {device.assignees.map(a => (
                          <span key={a.id} className="text-xs text-white">{a.full_name}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </td>
                  {/* Cột tồn kho */}
                  <td className="px-4 py-3">
                    {(() => {
                      const total = device.quantity || 1
                      const inStock = device.quantity_in_stock ?? total
                      const inUse = device.quantity_in_use ?? 0
                      return (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-white font-semibold text-sm">{inStock}</span>
                            <span className="text-gray-500 text-xs">/ {total}</span>
                          </div>
                          {total > 1 && (
                            <div className="w-16 bg-gray-700 rounded-full h-1">
                              <div
                                className={`h-1 rounded-full ${inStock === 0 ? 'bg-red-500' : inStock < total / 2 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                style={{ width: `${Math.round((inStock / total) * 100)}%` }}
                              />
                            </div>
                          )}
                          {inUse > 0 && (
                            <span className="text-xs text-gray-500">{inUse} đang dùng</span>
                          )}
                        </div>
                      )
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${STATUS_COLOR[device.status]}`}>
                      {STATUS_LABEL[device.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {device.warranty_expiry ? (
                      <span className={isWarrantyExpired ? 'text-red-400' : 'text-gray-400'}>
                        {new Date(device.warranty_expiry).toLocaleDateString('vi-VN')}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/devices/${device.id}`} className="text-gray-400 hover:text-white text-xs transition-colors">
                      Chi tiết →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
