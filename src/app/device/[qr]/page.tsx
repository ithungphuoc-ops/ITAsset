import { notFound } from 'next/navigation'
import { Laptop, Monitor, Cpu, Package, User, Calendar, CheckCircle, AlertTriangle, ArrowRight, Printer } from 'lucide-react'
import Link from 'next/link'
import { getDeviceById, findDeviceByQrCode, findDeviceByAssetCode, toDeviceJson } from '@/lib/firestore/devices'
import { getActiveAssignmentForDevice } from '@/lib/firestore/assignments'
import { getEmployeeById, toEmployeeJson } from '@/lib/firestore/employees'

const CATEGORY_LABEL: Record<string, string> = {
  laptop: 'Laptop', monitor: 'Màn hình', pc: 'PC / Máy tính để bàn',
  peripheral: 'Phụ kiện', printer: 'Máy in', other: 'Thiết bị khác',
}
const CATEGORY_ICON: Record<string, React.ElementType> = {
  laptop: Laptop, monitor: Monitor, pc: Cpu,
  peripheral: Package, printer: Printer, other: Package,
}

export default async function PublicDevicePage({ params }: { params: Promise<{ qr: string }> }) {
  const { qr } = await params

  // Thử lookup theo id → qr_code → asset_code
  const found = (await getDeviceById(qr)) ?? (await findDeviceByQrCode(qr)) ?? (await findDeviceByAssetCode(qr))
  if (!found) notFound()

  const device = toDeviceJson(found)
  const activeAssignmentDoc = await getActiveAssignmentForDevice(found.id)
  const employeeDoc = activeAssignmentDoc ? await getEmployeeById(activeAssignmentDoc.employeeId) : null
  const activeAssignment = activeAssignmentDoc && employeeDoc
    ? { assigned_date: activeAssignmentDoc.assignedDate, employee: await toEmployeeJson(employeeDoc) }
    : null

  const Icon = CATEGORY_ICON[device.category as string] || Package
  const statusColor = {
    in_use: 'text-green-400 bg-green-500/10 border-green-500/20',
    in_stock: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    broken: 'text-red-400 bg-red-500/10 border-red-500/20',
    liquidated: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
  }[device.status as string] || 'text-gray-400'
  const statusLabel = { in_use: 'Đang sử dụng', in_stock: 'Trong kho', broken: 'Hỏng', liquidated: 'Thanh lý' }[device.status as string] || ''
  const warrantyExpired = device.warranty_expiry && new Date(device.warranty_expiry) < new Date()

  const employee = activeAssignment?.employee as Record<string, unknown> | null
  const dept = employee?.department as { name: string } | null
  const laptopSpecs = device.laptop_specs as Record<string, string> | null
  const monitorSpecs = device.monitor_specs as Record<string, string> | null
  const isPC = device.category === 'pc'
  const isLaptop = device.category === 'laptop'
  const isMonitor = device.category === 'monitor'

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-lg mx-auto px-4 py-10">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Icon className="text-blue-400" size={28} />
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{CATEGORY_LABEL[device.category as string] || device.category}</p>
          <h1 className="text-2xl font-bold">{device.brand} {device.model}</h1>
          <p className="text-gray-400 font-mono text-sm mt-1">{device.asset_code}</p>
          <span className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
            {device.status === 'in_use' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
            {statusLabel}
          </span>
        </div>

        {/* Người đang dùng */}
        {employee ? (
          <Link href={`/employee/${employee.employee_code}`}
            className="block bg-gray-900 border border-gray-800 hover:border-blue-500/40 rounded-xl p-5 mb-4 transition-colors group">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Đang sử dụng bởi</div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center shrink-0">
                <User size={18} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white">{String(employee.full_name)}</div>
                <div className="text-sm text-gray-400">{dept?.name}</div>
                {activeAssignment?.assigned_date && (
                  <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    <Calendar size={11} />
                    Nhận từ {new Date(activeAssignment.assigned_date).toLocaleDateString('vi-VN')}
                  </div>
                )}
              </div>
              <div className="text-blue-400 group-hover:translate-x-1 transition-transform">
                <ArrowRight size={16} />
              </div>
            </div>
            <p className="text-xs text-blue-400/60 mt-3">↗ Nhấn để xem tất cả thiết bị của người này</p>
          </Link>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Người sử dụng</div>
            <p className="text-gray-400 text-sm">Thiết bị đang trong kho, chưa cấp phát</p>
          </div>
        )}

        {/* Thông tin chung */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Thông tin thiết bị</div>
          <div className="space-y-2.5">
            {device.serial_number && <Row label="Serial" value={device.serial_number} mono />}
            {device.purchase_date && <Row label="Ngày mua" value={new Date(device.purchase_date).toLocaleDateString('vi-VN')} />}
            {device.purchase_price && <Row label="Nguyên giá" value={Number(device.purchase_price).toLocaleString('vi-VN') + ' ₫'} />}
            {device.warranty_expiry && (
              <Row
                label="Bảo hành đến"
                value={new Date(device.warranty_expiry).toLocaleDateString('vi-VN')}
                valueClass={warrantyExpired ? 'text-red-400' : 'text-green-400'}
                suffix={warrantyExpired ? ' · Hết hạn' : ' · Còn hạn'}
              />
            )}
          </div>
        </div>

        {/* PC Specs */}
        {isPC && laptopSpecs && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Cấu hình PC</div>
            <div className="space-y-2.5">
              {laptopSpecs.cpu && <SpecRow icon="🖥" label="CPU" value={laptopSpecs.cpu} />}
              {laptopSpecs.ram && <SpecRow icon="💾" label="RAM" value={laptopSpecs.ram} />}
              {laptopSpecs.gpu && <SpecRow icon="🎮" label="GPU / VGA" value={laptopSpecs.gpu} />}
              {laptopSpecs.storage && <SpecRow icon="💿" label="Ổ cứng" value={laptopSpecs.storage} />}
              {laptopSpecs.main_board && <SpecRow icon="🔧" label="Main" value={laptopSpecs.main_board} />}
              {laptopSpecs.power_supply && <SpecRow icon="⚡" label="Nguồn" value={laptopSpecs.power_supply} />}
              {laptopSpecs.os && <SpecRow icon="🪟" label="HĐH" value={laptopSpecs.os} />}
            </div>
          </div>
        )}

        {/* Laptop Specs */}
        {isLaptop && laptopSpecs && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Cấu hình Laptop</div>
            <div className="space-y-2.5">
              {laptopSpecs.cpu && <SpecRow icon="🖥" label="CPU" value={laptopSpecs.cpu} />}
              {laptopSpecs.ram && <SpecRow icon="💾" label="RAM" value={laptopSpecs.ram} />}
              {laptopSpecs.gpu && <SpecRow icon="🎮" label="GPU" value={laptopSpecs.gpu} />}
              {laptopSpecs.storage && <SpecRow icon="💿" label="Ổ cứng" value={laptopSpecs.storage} />}
              {laptopSpecs.display && <SpecRow icon="📺" label="Màn hình" value={laptopSpecs.display} />}
              {laptopSpecs.os && <SpecRow icon="🪟" label="HĐH" value={laptopSpecs.os} />}
            </div>
          </div>
        )}

        {/* Monitor Specs */}
        {isMonitor && monitorSpecs && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Thông số màn hình</div>
            <div className="space-y-2.5">
              {monitorSpecs.screen_size && <SpecRow icon="📐" label="Kích thước" value={monitorSpecs.screen_size} />}
              {monitorSpecs.resolution && <SpecRow icon="🔍" label="Độ phân giải" value={monitorSpecs.resolution} />}
              {monitorSpecs.panel_type && <SpecRow icon="🎨" label="Tấm nền" value={monitorSpecs.panel_type} />}
              {monitorSpecs.refresh_rate && <SpecRow icon="⚡" label="Tần số quét" value={monitorSpecs.refresh_rate} />}
            </div>
          </div>
        )}

        {device.notes && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Ghi chú</div>
            <p className="text-sm text-gray-300">{device.notes}</p>
          </div>
        )}

        <p className="text-center text-xs text-gray-600 mt-6">ITAsset · HPCONS</p>
      </div>
    </div>
  )
}

function Row({ label, value, mono, valueClass, suffix }: {
  label: string; value: string; mono?: boolean; valueClass?: string; suffix?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-gray-400 shrink-0">{label}</span>
      <span className={`text-sm text-right ${mono ? 'font-mono text-xs' : ''} ${valueClass || 'text-white'}`}>
        {value}{suffix && <span className="text-xs text-gray-500">{suffix}</span>}
      </span>
    </div>
  )
}

function SpecRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-base leading-none mt-0.5">{icon}</span>
      <span className="text-sm text-gray-400 w-20 shrink-0">{label}</span>
      <span className="text-sm text-white font-medium flex-1">{value}</span>
    </div>
  )
}
