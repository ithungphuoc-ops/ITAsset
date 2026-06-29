'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Printer, Download } from 'lucide-react'
import Link from 'next/link'

interface Device {
  id: string; asset_code: string; brand: string; model: string; category: string
  serial_number?: string; purchase_date?: string; purchase_price?: number
  warranty_expiry?: string; notes?: string; qr_code: string
  laptop_specs?: { cpu?: string; ram?: string; storage?: string; display?: string; os?: string; gpu?: string }
  monitor_specs?: { screen_size?: string; resolution?: string; panel_type?: string; refresh_rate?: string }
}
interface Employee {
  full_name: string; employee_code?: string; position?: string
  department?: { name: string }; email?: string; phone?: string
}
interface Assignment {
  assigned_date: string; notes?: string
  employee?: Employee
}

const CATEGORY_LABEL: Record<string, string> = {
  laptop: 'Laptop', monitor: 'Màn hình', pc: 'Máy tính bàn',
  peripheral: 'Phụ kiện', other: 'Thiết bị khác',
}

export default function HandoverPrintPage() {
  const { id } = useParams()
  const router = useRouter()
  const [device, setDevice] = useState<Device | null>(null)
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/devices/${id}`)
      const json = await res.json()
      if (!json.data) { router.push(`/dashboard/devices/${id}`); return }
      setDevice(json.data)
      setAssignment(json.active_assignment || null)

      const QRCode = (await import('qrcode')).default
      const url = `${window.location.origin}/device/${json.data.qr_code}`
      const dataUrl = await QRCode.toDataURL(url, { width: 150, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      setQrDataUrl(dataUrl)
      setLoading(false)
    }
    load()
  }, [id, router])

  function handlePrint() {
    window.print()
  }

  if (loading) return <div className="p-8 text-gray-400">Đang tải...</div>
  if (!device) return null

  const today = new Date().toLocaleDateString('vi-VN')
  const emp = assignment?.employee

  return (
    <>
      {/* Print controls - ẩn khi in */}
      <div className="print:hidden p-6 border-b border-gray-800 flex items-center gap-4 bg-gray-950">
        <Link href={`/dashboard/devices/${id}`} className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-semibold flex-1">Biên bản bàn giao thiết bị</h1>
        <button onClick={handlePrint}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <Printer size={16} /> In biên bản
        </button>
        <a href="#" onClick={e => { e.preventDefault(); handlePrint() }}
          className="flex items-center gap-2 border border-gray-700 hover:border-gray-500 px-5 py-2.5 rounded-lg text-sm text-gray-300 hover:text-white transition-colors">
          <Download size={16} /> Lưu PDF
        </a>
      </div>

      {/* Preview wrapper */}
      <div className="print:p-0 p-8 bg-gray-950 min-h-screen print:bg-white">
        {/* Printable content */}
        <div ref={printRef} className="print-area bg-white text-black max-w-[794px] mx-auto p-10 shadow-lg print:shadow-none">

          {/* Header */}
          <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-gray-800">
            <div>
              <div className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-1">Công ty TNHH HPCONS</div>
              <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">Biên bản bàn giao thiết bị</h1>
              <div className="text-sm text-gray-500 mt-1">Ngày lập: {today}</div>
            </div>
            {qrDataUrl && (
              <div className="text-center">
                <img src={qrDataUrl} alt="QR Code" className="w-24 h-24 border border-gray-200" />
                <div className="text-xs text-gray-400 mt-1 font-mono">{device.asset_code}</div>
              </div>
            )}
          </div>

          {/* Người nhận */}
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3 pb-1 border-b border-gray-200">
              I. Thông tin người nhận
            </h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <Row label="Họ và tên" value={emp?.full_name || '___________________'} />
              <Row label="Mã nhân viên" value={emp?.employee_code || '___________________'} />
              <Row label="Phòng ban" value={emp?.department?.name || '___________________'} />
              <Row label="Chức vụ" value={emp?.position || '___________________'} />
              <Row label="Email" value={emp?.email || '___________________'} />
              <Row label="Điện thoại" value={emp?.phone || '___________________'} />
            </div>
          </section>

          {/* Thiết bị */}
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3 pb-1 border-b border-gray-200">
              II. Thông tin thiết bị bàn giao
            </h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <Row label="Loại thiết bị" value={CATEGORY_LABEL[device.category] || device.category} />
              <Row label="Mã tài sản" value={device.asset_code} bold />
              <Row label="Hãng sản xuất" value={device.brand} />
              <Row label="Model" value={device.model} />
              <Row label="Serial Number" value={device.serial_number || '___________________'} />
              {device.purchase_date && <Row label="Ngày mua" value={new Date(device.purchase_date).toLocaleDateString('vi-VN')} />}
              {device.warranty_expiry && <Row label="Bảo hành đến" value={new Date(device.warranty_expiry).toLocaleDateString('vi-VN')} />}
            </div>

            {/* Cấu hình laptop */}
            {device.category === 'laptop' && device.laptop_specs && (
              <div className="mt-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Cấu hình:</div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm bg-gray-50 p-3 rounded">
                  {device.laptop_specs.cpu && <Row label="CPU" value={device.laptop_specs.cpu} />}
                  {device.laptop_specs.ram && <Row label="RAM" value={device.laptop_specs.ram} />}
                  {device.laptop_specs.storage && <Row label="Ổ cứng" value={device.laptop_specs.storage} />}
                  {device.laptop_specs.display && <Row label="Màn hình" value={device.laptop_specs.display} />}
                  {device.laptop_specs.os && <Row label="HĐH" value={device.laptop_specs.os} />}
                  {device.laptop_specs.gpu && <Row label="GPU" value={device.laptop_specs.gpu} />}
                </div>
              </div>
            )}

            {/* Ghi chú thiết bị */}
            {device.notes && (
              <div className="mt-3 text-sm">
                <span className="text-gray-500">Ghi chú: </span>
                <span>{device.notes}</span>
              </div>
            )}
          </section>

          {/* Điều khoản */}
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3 pb-1 border-b border-gray-200">
              III. Điều khoản bàn giao
            </h2>
            <ol className="text-sm text-gray-700 space-y-1.5 list-decimal list-inside">
              <li>Người nhận cam kết sử dụng thiết bị đúng mục đích công việc, không sử dụng cho mục đích cá nhân.</li>
              <li>Người nhận có trách nhiệm bảo quản thiết bị, tránh để hư hỏng, mất mát do lỗi chủ quan.</li>
              <li>Trường hợp hư hỏng do lỗi chủ quan, người nhận chịu trách nhiệm bồi thường theo quy định công ty.</li>
              <li>Khi nghỉ việc hoặc chuyển công tác, người nhận phải bàn giao lại thiết bị nguyên vẹn cho phòng IT.</li>
              <li>Mọi sự cố liên quan đến thiết bị phải thông báo ngay cho phòng IT để được hỗ trợ.</li>
            </ol>
          </section>

          {/* Ngày bàn giao */}
          {assignment && (
            <div className="mb-6 text-sm text-gray-600">
              <span className="font-medium">Ngày bàn giao: </span>
              {new Date(assignment.assigned_date).toLocaleDateString('vi-VN')}
              {assignment.notes && <span className="ml-4"><span className="font-medium">Ghi chú: </span>{assignment.notes}</span>}
            </div>
          )}

          {/* Chữ ký */}
          <section className="mt-10">
            <div className="grid grid-cols-2 gap-16 text-center text-sm">
              <div>
                <div className="font-semibold text-gray-800 mb-1">Người bàn giao</div>
                <div className="text-xs text-gray-500 mb-16">(Ký, ghi rõ họ tên)</div>
                <div className="border-t border-gray-400 pt-2 text-gray-600">Đại diện Phòng IT</div>
              </div>
              <div>
                <div className="font-semibold text-gray-800 mb-1">Người nhận</div>
                <div className="text-xs text-gray-500 mb-16">(Ký, ghi rõ họ tên)</div>
                <div className="border-t border-gray-400 pt-2 text-gray-600">{emp?.full_name || '___________________'}</div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="mt-10 pt-4 border-t border-gray-200 text-xs text-gray-400 text-center">
            Biên bản được lập thành 02 bản, mỗi bên giữ 01 bản. · Hệ thống ITAsset · {today}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; background: white; }
          .print-area { max-width: 100%; margin: 0; padding: 20mm 18mm; box-shadow: none; }
        }
      `}</style>
    </>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 shrink-0 w-32">{label}:</span>
      <span className={bold ? 'font-bold' : 'font-medium text-gray-800'}>{value}</span>
    </div>
  )
}
