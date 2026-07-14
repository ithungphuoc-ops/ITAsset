'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, QrCode, User, Calendar, DollarSign, Shield, Cpu, Monitor, HardDrive, Download, Trash2, Pencil, Printer, ArrowRightLeft, RotateCcw, Search } from 'lucide-react'
import Link from 'next/link'
import type { Device, Assignment } from '@/lib/types'
import { useRole } from '@/lib/hooks/useRole'

const STATUS_LABEL: Record<string, string> = {
  in_use: 'Đang dùng', in_stock: 'Trong kho', broken: 'Hỏng', liquidated: 'Thanh lý',
}
const STATUS_COLOR: Record<string, string> = {
  in_use: 'bg-green-500/20 text-green-400 border-green-500/30',
  in_stock: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  broken: 'bg-red-500/20 text-red-400 border-red-500/30',
  liquidated: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

interface Employee { id: string; full_name: string; employee_code: string; department?: { name: string } }

export default function DeviceDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { canWrite } = useRole()
  const [device, setDevice] = useState<Device | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [qrDataUrl, setQrDataUrl] = useState('')

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Thu hồi modal
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [returnStatus, setReturnStatus] = useState<'in_stock' | 'broken'>('in_stock')
  const [returnNotes, setReturnNotes] = useState('')
  const [returning, setReturning] = useState(false)
  const [returnError, setReturnError] = useState('')

  // Luân chuyển modal
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [empSearch, setEmpSearch] = useState('')
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null)
  const [transferNotes, setTransferNotes] = useState('')
  const [transferring, setTransferring] = useState(false)
  const [transferError, setTransferError] = useState('')

  const loadPage = useCallback(async () => {
    const res = await fetch(`/api/devices/${id}`)
    const json = await res.json()
    if (!res.ok || !json.data) { router.push('/dashboard/devices'); return }
    setDevice(json.data as Device)
    setAssignments((json.assignments as Assignment[]) || [])
    const QRCode = (await import('qrcode')).default
    const url = `${window.location.origin}/device/${json.data.id}`
    const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 2, color: { dark: '#ffffff', light: '#111827' } })
    setQrDataUrl(dataUrl)
    setLoading(false)
  }, [id, router])

  useEffect(() => { loadPage() }, [loadPage])

  async function handleDelete() {
    setDeleting(true); setDeleteError('')
    const res = await fetch(`/api/devices/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) { setDeleteError(json.error); setDeleting(false); return }
    router.push('/dashboard/devices')
  }

  async function handleReturn() {
    setReturning(true); setReturnError('')
    const res = await fetch('/api/assignments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: id, new_status: returnStatus, notes: returnNotes }),
    })
    const json = await res.json()
    if (!res.ok) { setReturnError(json.error); setReturning(false); return }
    setShowReturnModal(false); setReturnNotes(''); setReturning(false)
    await loadPage()
  }

  async function openTransferModal() {
    setShowTransferModal(true); setSelectedEmp(null); setEmpSearch(''); setTransferNotes(''); setTransferError('')
    const res = await fetch('/api/employees')
    const json = await res.json()
    setEmployees((json.data as Employee[]) || [])
  }

  async function handleTransfer() {
    if (!selectedEmp) return
    setTransferring(true); setTransferError('')
    const res = await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: id, employee_id: selectedEmp.id, notes: transferNotes }),
    })
    const json = await res.json()
    if (!res.ok) { setTransferError(json.error); setTransferring(false); return }
    setShowTransferModal(false); setTransferring(false)
    await loadPage()
  }

  function normalizeVi(s: string) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, m => m === 'đ' ? 'd' : 'D').toLowerCase()
  }
  const filteredEmps = employees.filter(e => {
    const q = normalizeVi(empSearch)
    return !q || normalizeVi(e.full_name).includes(q) || normalizeVi(e.employee_code || '').includes(q)
  })

  if (loading) return <div className="p-8 text-gray-400">Đang tải...</div>
  if (!device) return null

  const activeAssignment = assignments.find(a => a.is_active)

  return (
    <div className="p-8 max-w-4xl">

      {/* ===== MODAL XÓA ===== */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <Trash2 size={22} className="text-red-400" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Xóa thiết bị?</h3>
            <p className="text-gray-400 text-sm mb-1">Bạn sắp xóa <span className="text-white font-medium">{device.brand} {device.model}</span></p>
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

      {/* ===== MODAL THU HỒI ===== */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full">
            <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
              <RotateCcw size={22} className="text-orange-400" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Thu hồi thiết bị</h3>
            <p className="text-gray-400 text-sm mb-4">
              Thu hồi <span className="text-white font-medium">{device.brand} {device.model}</span> từ{' '}
              <span className="text-white font-medium">{activeAssignment?.employee?.full_name}</span>
            </p>

            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-2">Trạng thái sau khi thu hồi</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setReturnStatus('in_stock')}
                  className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${returnStatus === 'in_stock' ? 'bg-blue-600 border-blue-500 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                  Nhập kho
                </button>
                <button onClick={() => setReturnStatus('broken')}
                  className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${returnStatus === 'broken' ? 'bg-red-600 border-red-500 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                  Hỏng / Bảo trì
                </button>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs text-gray-400 mb-1.5">Ghi chú (tùy chọn)</label>
              <textarea value={returnNotes} onChange={e => setReturnNotes(e.target.value)}
                placeholder="Lý do thu hồi, tình trạng thiết bị..."
                rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 resize-none" />
            </div>

            {returnError && <p className="text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{returnError}</p>}
            <div className="flex gap-3">
              <button onClick={handleReturn} disabled={returning}
                className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 py-2.5 rounded-lg text-sm font-medium transition-colors">
                {returning ? 'Đang thu hồi...' : 'Xác nhận thu hồi'}
              </button>
              <button onClick={() => { setShowReturnModal(false); setReturnError('') }}
                className="flex-1 border border-gray-700 hover:border-gray-500 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors">
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL LUÂN CHUYỂN ===== */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
              <ArrowRightLeft size={22} className="text-blue-400" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Luân chuyển thiết bị</h3>
            <p className="text-gray-400 text-sm mb-4">
              Chuyển <span className="text-white font-medium">{device.brand} {device.model}</span>
              {activeAssignment?.employee && (
                <> từ <span className="text-orange-400 font-medium">{activeAssignment.employee.full_name}</span></>
              )}
              {' '}sang nhân viên mới
            </p>

            {/* Tìm nhân viên */}
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="text" placeholder="Tìm tên hoặc mã nhân viên..."
                value={empSearch} onChange={e => setEmpSearch(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
            </div>

            {/* Danh sách nhân viên */}
            <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-700 mb-4">
              {filteredEmps.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-6">Không tìm thấy</p>
              ) : filteredEmps.map(emp => (
                <button key={emp.id} onClick={() => setSelectedEmp(emp)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-800/50 last:border-0 ${selectedEmp?.id === emp.id ? 'bg-blue-600/20 text-white' : 'hover:bg-gray-800 text-gray-300'}`}>
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 text-blue-400 text-xs font-medium">
                    {emp.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{emp.full_name}</div>
                    <div className="text-xs text-gray-500">{emp.employee_code} · {emp.department?.name}</div>
                  </div>
                  {selectedEmp?.id === emp.id && <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />}
                </button>
              ))}
            </div>

            {/* Người được chọn */}
            {selectedEmp && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 mb-3 text-sm text-blue-300">
                Chuyển đến: <span className="font-medium text-white">{selectedEmp.full_name}</span> ({selectedEmp.employee_code})
              </div>
            )}

            <div className="mb-5">
              <label className="block text-xs text-gray-400 mb-1.5">Ghi chú (tùy chọn)</label>
              <textarea value={transferNotes} onChange={e => setTransferNotes(e.target.value)}
                placeholder="Lý do luân chuyển..."
                rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none" />
            </div>

            {transferError && <p className="text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{transferError}</p>}
            <div className="flex gap-3">
              <button onClick={handleTransfer} disabled={!selectedEmp || transferring}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 py-2.5 rounded-lg text-sm font-medium transition-colors">
                {transferring ? 'Đang chuyển...' : 'Xác nhận luân chuyển'}
              </button>
              <button onClick={() => { setShowTransferModal(false); setTransferError('') }}
                className="flex-1 border border-gray-700 hover:border-gray-500 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors">
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== HEADER ===== */}
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
        {canWrite && (
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
        )}
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
                <InfoRow label="Bảo hành đến" value={new Date(device.warranty_expiry).toLocaleDateString('vi-VN')}
                  icon={<Shield size={14} />}
                  valueClass={new Date(device.warranty_expiry) < new Date() ? 'text-red-400' : 'text-green-400'} />
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
              {canWrite && (
                <Link href={`/dashboard/devices/${id}/assign`} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                  + Cấp phát
                </Link>
              )}
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
                      {a.notes && <div className="text-xs text-gray-500 mt-0.5 italic">{a.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: QR + người dùng */}
        <div className="space-y-6">
          {/* QR code */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
            <h2 className="font-semibold mb-4 flex items-center justify-center gap-2">
              <QrCode size={16} className="text-blue-400" /> QR Code
            </h2>
            {qrDataUrl ? (
              <>
                <img src={qrDataUrl} alt="QR Code" className="mx-auto rounded-lg mb-4" />
                <a href={qrDataUrl} download={`QR-${device.asset_code}.png`}
                  className="flex items-center justify-center gap-2 w-full bg-gray-800 hover:bg-gray-700 px-4 py-2.5 rounded-lg text-sm transition-colors">
                  <Download size={14} /> Tải về để in
                </a>
              </>
            ) : (
              <div className="w-48 h-48 mx-auto bg-gray-800 rounded-lg animate-pulse" />
            )}
            <p className="text-xs text-gray-500 mt-3">Quét để xem thông tin thiết bị</p>
          </div>

          {/* Người đang dùng + nút hành động */}
          {activeAssignment ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="font-semibold mb-3 text-sm text-gray-400 uppercase tracking-wide">Đang sử dụng bởi</h2>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center">
                  <User size={18} className="text-blue-400" />
                </div>
                <div>
                  <div className="font-medium">{activeAssignment.employee?.full_name}</div>
                  <div className="text-xs text-gray-400">{activeAssignment.employee?.department?.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Từ {new Date(activeAssignment.assigned_date).toLocaleDateString('vi-VN')}</div>
                </div>
              </div>
              {canWrite && (
                <div className="space-y-2">
                  <button onClick={openTransferModal}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 border border-blue-500/30 hover:border-blue-500/50 rounded-lg py-2.5 text-sm font-medium transition-colors">
                    <ArrowRightLeft size={15} /> Luân chuyển
                  </button>
                  <button onClick={() => { setShowReturnModal(true); setReturnError('') }}
                    className="w-full flex items-center justify-center gap-2 bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 hover:text-orange-300 border border-orange-500/30 hover:border-orange-500/50 rounded-lg py-2.5 text-sm font-medium transition-colors">
                    <RotateCcw size={15} /> Thu hồi thiết bị
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="font-semibold mb-2 text-sm text-gray-400 uppercase tracking-wide">Người sử dụng</h2>
              <p className="text-gray-500 text-sm mb-4">Thiết bị đang trong kho</p>
              {canWrite && (
                <Link href={`/dashboard/devices/${id}/assign`}
                  className="block w-full text-center bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
                  + Cấp phát ngay
                </Link>
              )}
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
