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
      const url = `${window.location.origin}/device/${json.data.id}`
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
        <div ref={printRef} className="print-area bg-white text-black max-w-[794px] mx-auto px-10 py-8 shadow-lg print:shadow-none">

          {/* Header */}
          <div className="flex items-start justify-between mb-4 pb-4 border-b-2 border-gray-800">
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-company.png" alt="HP Cons" className="w-14 h-14 object-contain shrink-0" />
              <div>
                <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-0.5 leading-tight">
                  Công ty cổ phần xây dựng<br />công nghiệp Hưng Phước
                </div>
                <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wide leading-tight">Biên bản bàn giao thiết bị</h1>
                <div className="text-xs text-gray-500 mt-0.5">Ngày lập: {today}</div>
              </div>
            </div>
            {qrDataUrl && (
              <div className="text-center">
                <img src={qrDataUrl} alt="QR Code" className="w-20 h-20 border border-gray-200" />
                <div className="text-[10px] text-gray-400 mt-0.5 font-mono">{device.asset_code}</div>
              </div>
            )}
          </div>

          {/* Người nhận */}
          <section className="mb-4">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 pb-1 border-b border-gray-200">
              I. Thông tin người nhận
            </h2>
            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr>
                  <TCell label="Họ và tên" value={emp?.full_name || '_______________'} />
                  <TCell label="Mã nhân viên" value={emp?.employee_code || '_______________'} />
                </tr>
                <tr>
                  <TCell label="Phòng ban" value={emp?.department?.name || '_______________'} />
                  <TCell label="Chức vụ" value={emp?.position || '_______________'} />
                </tr>
                <tr>
                  <TCell label="Email" value={emp?.email || '_______________'} />
                  <TCell label="Điện thoại" value={emp?.phone || '_______________'} />
                </tr>
              </tbody>
            </table>
          </section>

          {/* Thiết bị */}
          <section className="mb-4">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 pb-1 border-b border-gray-200">
              II. Thông tin thiết bị bàn giao
            </h2>
            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr>
                  <TCell label="Loại thiết bị" value={CATEGORY_LABEL[device.category] || device.category} />
                  <TCell label="Mã tài sản" value={device.asset_code} bold />
                </tr>
                <tr>
                  <TCell label="Hãng sản xuất" value={device.brand} />
                  <TCell label="Model" value={device.model} />
                </tr>
                <tr>
                  <TCell label="Serial Number" value={device.serial_number || '_______________'} />
                  <TCell label="Ngày mua" value={device.purchase_date ? new Date(device.purchase_date).toLocaleDateString('vi-VN') : '_______________'} />
                </tr>
                <tr>
                  <TCell label="Bảo hành đến" value={device.warranty_expiry ? new Date(device.warranty_expiry).toLocaleDateString('vi-VN') : '_______________'} />
                  <TCell label="Ngày bàn giao" value={assignment ? new Date(assignment.assigned_date).toLocaleDateString('vi-VN') : today} />
                </tr>
              </tbody>
            </table>

            {device.category === 'laptop' && device.laptop_specs && (
              <div className="mt-2 bg-gray-50 p-2 rounded text-sm">
                <div className="text-[10px] font-semibold text-gray-500 uppercase mb-1">Cấu hình:</div>
                <table className="w-full border-collapse">
                  <tbody>
                    {(device.laptop_specs.cpu || device.laptop_specs.ram) && (
                      <tr>
                        {device.laptop_specs.cpu && <TCell label="CPU" value={device.laptop_specs.cpu} />}
                        {device.laptop_specs.ram && <TCell label="RAM" value={device.laptop_specs.ram} />}
                      </tr>
                    )}
                    {(device.laptop_specs.storage || device.laptop_specs.os) && (
                      <tr>
                        {device.laptop_specs.storage && <TCell label="Ổ cứng" value={device.laptop_specs.storage} />}
                        {device.laptop_specs.os && <TCell label="HĐH" value={device.laptop_specs.os} />}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Điều khoản */}
          <section className="mb-4">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 pb-1 border-b border-gray-200">
              III. Điều khoản bàn giao
            </h2>
            <ol className="text-xs text-gray-700 space-y-1 list-decimal list-inside leading-relaxed">
              <li>Người nhận cam kết sử dụng thiết bị đúng mục đích công việc, không sử dụng cho mục đích cá nhân.</li>
              <li>Người nhận có trách nhiệm bảo quản thiết bị, tránh để hư hỏng, mất mát do lỗi chủ quan.</li>
              <li>Trường hợp hư hỏng do lỗi chủ quan, người nhận chịu trách nhiệm bồi thường theo quy định công ty.</li>
              <li>Khi nghỉ việc hoặc chuyển công tác, người nhận phải bàn giao lại thiết bị nguyên vẹn cho phòng IT.</li>
              <li>Mọi sự cố liên quan đến thiết bị phải thông báo ngay cho phòng IT để được hỗ trợ.</li>
            </ol>
          </section>

          {/* Chữ ký */}
          <section className="mt-6">
            <div className="grid grid-cols-2 gap-16 text-center text-sm">
              <div>
                <div className="font-semibold text-gray-800 mb-0.5">Người bàn giao</div>
                <div className="text-xs text-gray-500 mb-12">(Ký, ghi rõ họ tên)</div>
                <div className="border-t border-gray-400 pt-1.5 text-gray-600 text-sm">Đại diện Phòng IT</div>
              </div>
              <div>
                <div className="font-semibold text-gray-800 mb-0.5">Người nhận</div>
                <div className="text-xs text-gray-500 mb-12">(Ký, ghi rõ họ tên)</div>
                <div className="border-t border-gray-400 pt-1.5 text-gray-600 text-sm">{emp?.full_name || '___________________'}</div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-gray-200 text-[10px] text-gray-400 text-center">
            Biên bản được lập thành 02 bản, mỗi bên giữ 01 bản · Hệ thống ITAsset · {today}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 15mm 18mm; }
          body { margin: 0 !important; padding: 0 !important; background: white; }
          .print-area {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          img { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </>
  )
}

function TCell({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <td className="py-1 pr-6 align-top w-1/2">
      <span className="text-gray-500 text-xs mr-1">{label}:</span>
      <span className={`text-sm ${bold ? 'font-bold' : 'font-medium text-gray-800'}`}>{value}</span>
    </td>
  )
}
