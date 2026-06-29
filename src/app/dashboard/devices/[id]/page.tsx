'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, QrCode, User, Calendar, DollarSign, Shield, Cpu, Monitor, HardDrive, Download, Trash2, Pencil, Printer } from 'lucide-react'
import Link from 'next/link'
import type { Device, Assignment } from '@/lib/types'

const STATUS_LABEL: Record<string, string> = {
  in_use: 'Đang dùng', in_stock: 'Trong kho', broken: 'Hỏng', liquidated: 'Thanh lý',
}
const STATUS_COLOR: Record<string, string> = {
  in_use: 'bg-green-500/20 text-green-400 border-green-500/30',
  in_stock: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  broken: 'bg-red-500/20 text-red-400 border-red-500/30',
  liquidated: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

export default function DeviceDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [device, setDevice] = useState<Device | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    async function load() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { data: dev } = await supabase
        .from('devices')
        .select('*, laptop_specs:device_laptop_specs(*), monitor_specs:device_monitor_specs(*)')
        .eq('id', id)
        .single()

      if (!dev) { router.push('/dashboard/devices'); return }
      setDevice(dev as Device)

      const { data: asgn } = await supabase
        .from('assignments')
        .select('*, employee:employees(*, department:departments(*))')
        .eq('device_id', id)
        .order('created_at', { ascending: false })

      setAssignments((asgn as Assignment[]) || [])

      // Generate QR code
      const QRCode = (await import('qrcode')).default
      const url = `${window.location.origin}/device/${dev.id}`
      const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 2, color: { dark: '#ffffff', light: '#111827' } })
      setQrDataUrl(dataUrl)

      setLoading(false)
    }
    load()
  }, [id, router])

  async function handleDelete() {
    setDeleting(true)
    setDeleteError('')
    const res = await fetch(`/api/devices/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) { setDeleteError(json.error); setDeleting(false); return }
    router.push('/dashboard/devices')
  }

  if (loading) return <div className="p-8 text-gray-400">Đang tải...</div>
  if (!device) return null

  const activeAssignment = assignments.find(a => a.is_active)

  return (
    <div className="p-8 max-w-4xl">
      {/* Delete confirm modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <Trash2 size={22} className="text-red-400" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Xóa thiết bị?</h3>
            <p className="text-gray-400 text-sm mb-1">
              Bạn sắp xóa <span className="text-white font-medium">{device.brand} {device.model}</span>
            </p>
            <p className="text-gray-500 text-xs mb-5">Thao tác này không thể hoàn tác.</p>
            {deleteError && <p className="text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{deleteError}</p>}
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 py-2.5 rounded-lg text-sm font-medium transition-colors">
                {deleting ? 'Đang xóa...' : 'Xóa thiết bị'}
              </button>
              <button onClick={() => { setShowDeleteModal(false); setDeleteError('') }}
                className="flex-1 border border-gray-700 hover:border-gray-500 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors">
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/devices" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{device.brand} {device.model}</h1>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${STATUS_COLOR[device.status]}`}>
              {STATUS_LABEL[device.status]}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-0.5 font-mono">{device.asset_code}</p>
        </div>
        <div className="flex items-center gap-2">
          {activeAssignment && (
            <Link href={`/dashboard/devices/${id}/handover`}
              className="flex items-center gap-2 border border-gray-700 hover:border-gray-500 px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white transition-colors">
              <Printer size={14} /> In biên bản
            </Link>
          )}
          <Link href={`/dashboard/devices/${id}/edit`}
            className="flex items-center gap-2 border border-gray-700 hover:border-gray-500 px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white transition-colors">
            <Pencil size={14} /> Sửa
          </Link>
          <button onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 border border-red-800/50 hover:border-red-600 px-4 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 transition-colors">
            <Trash2 size={14} /> Xóa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: device info */}
        <div className="col-span-2 space-y-6">
          {/* Thông tin cơ bản */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="font-semibold mb-4">Thông tin thiết bị</h2>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Mã tài sản" value={device.asset_code} mono />
              <InfoRow label="Serial" value={device.serial_number || '—'} mono />
              <InfoRow label="Hãng" value={device.brand} />
              <InfoRow label="Model" value={device.model} />
              {device.purchase_date && <InfoRow label="Ngày mua" value={new Date(device.purchase_date).toLocaleDateString('vi-VN')} icon={<Calendar size={14} />} />}
              {device.purchase_price && <InfoRow label="Giá mua" value={device.purchase_price.toLocaleString('vi-VN') + ' ₫'} icon={<DollarSign size={14} />} />}
              {device.warranty_expiry && (
                <InfoRow
                  label="Bảo hành đến"
                  value={new Date(device.warranty_expiry).toLocaleDateString('vi-VN')}
                  icon={<Shield size={14} />}
                  valueClass={new Date(device.warranty_expiry) < new Date() ? 'text-red-400' : 'text-green-400'}
                />
              )}
            </div>
            {device.notes && <p className="mt-4 text-sm text-gray-400 bg-gray-800 rounded-lg p-3">{device.notes}</p>}
          </div>

          {/* Cấu hình Laptop */}
          {device.category === 'laptop' && device.laptop_specs && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2"><Cpu size={16} className="text-blue-400" /> Cấu hình</h2>
              <div className="grid grid-cols-2 gap-4">
                {device.laptop_specs.cpu && <InfoRow label="CPU" value={device.laptop_specs.cpu} />}
                {device.laptop_specs.ram && <InfoRow label="RAM" value={device.laptop_specs.ram} />}
                {device.laptop_specs.storage && <InfoRow label="Ổ cứng" value={device.laptop_specs.storage} icon={<HardDrive size={14} />} />}
                {device.laptop_specs.display && <InfoRow label="Màn hình" value={device.laptop_specs.display} icon={<Monitor size={14} />} />}
                {device.laptop_specs.os && <InfoRow label="Hệ điều hành" value={device.laptop_specs.os} />}
                {device.laptop_specs.gpu && <InfoRow label="GPU" value={device.laptop_specs.gpu} />}
              </div>
            </div>
          )}

          {/* Cấu hình Màn hình */}
          {device.category === 'monitor' && device.monitor_specs && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2"><Monitor size={16} className="text-purple-400" /> Thông số màn hình</h2>
              <div className="grid grid-cols-2 gap-4">
                {device.monitor_specs.screen_size && <InfoRow label="Kích thước" value={device.monitor_specs.screen_size} />}
                {device.monitor_specs.resolution && <InfoRow label="Độ phân giải" value={device.monitor_specs.resolution} />}
                {device.monitor_specs.panel_type && <InfoRow label="Tấm nền" value={device.monitor_specs.panel_type} />}
                {device.monitor_specs.refresh_rate && <InfoRow label="Tần số quét" value={device.monitor_specs.refresh_rate} />}
              </div>
            </div>
          )}

          {/* Lịch sử cấp phát */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Lịch sử cấp phát</h2>
              <Link href={`/dashboard/devices/${id}/assign`} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                + Cấp phát
              </Link>
            </div>
            {assignments.length === 0 ? (
              <p className="text-gray-500 text-sm">Chưa có lịch sử cấp phát</p>
            ) : (
              <div className="space-y-3">
                {assignments.map(a => (
                  <div key={a.id} className={`flex items-start gap-3 p-3 rounded-lg ${a.is_active ? 'bg-green-500/5 border border-green-500/20' : 'bg-gray-800/50'}`}>
                    <User size={16} className={a.is_active ? 'text-green-400 mt-0.5' : 'text-gray-500 mt-0.5'} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{a.employee?.full_name}</span>
                        {a.is_active && <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Hiện tại</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {a.employee?.department?.name} · Cấp: {new Date(a.assigned_date).toLocaleDateString('vi-VN')}
                        {a.returned_date && ` · Trả: ${new Date(a.returned_date).toLocaleDateString('vi-VN')}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: QR code */}
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
            <h2 className="font-semibold mb-4 flex items-center justify-center gap-2">
              <QrCode size={16} className="text-blue-400" /> QR Code
            </h2>
            {qrDataUrl ? (
              <>
                <img src={qrDataUrl} alt="QR Code" className="mx-auto rounded-lg mb-4" />
                <a
                  href={qrDataUrl}
                  download={`QR-${device.asset_code}.png`}
                  className="flex items-center justify-center gap-2 w-full bg-gray-800 hover:bg-gray-700 px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  <Download size={14} />
                  Tải về để in
                </a>
              </>
            ) : (
              <div className="w-48 h-48 mx-auto bg-gray-800 rounded-lg animate-pulse" />
            )}
            <p className="text-xs text-gray-500 mt-3">Quét để xem thông tin thiết bị</p>
          </div>

          {/* Người đang dùng */}
          {activeAssignment && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="font-semibold mb-3 text-sm text-gray-400">ĐANG SỬ DỤNG BỞI</h2>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center">
                  <User size={18} className="text-blue-400" />
                </div>
                <div>
                  <div className="font-medium">{activeAssignment.employee?.full_name}</div>
                  <div className="text-xs text-gray-400">{activeAssignment.employee?.department?.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Từ {new Date(activeAssignment.assigned_date).toLocaleDateString('vi-VN')}</div>
                </div>
              </div>
              <Link href={`/dashboard/devices/${id}/return`} className="block mt-4 text-center text-sm text-orange-400 hover:text-orange-300 border border-orange-500/30 rounded-lg py-2 transition-colors">
                Thu hồi thiết bị
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono, icon, valueClass }: { label: string; value: string; mono?: boolean; icon?: React.ReactNode; valueClass?: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className={`text-sm flex items-center gap-1.5 ${mono ? 'font-mono' : ''} ${valueClass || 'text-white'}`}>
        {icon} {value}
      </div>
    </div>
  )
}
