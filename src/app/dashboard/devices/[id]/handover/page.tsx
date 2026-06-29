'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'
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
  laptop: 'Máy tính xách tay (Laptop)', monitor: 'Màn hình máy tính',
  pc: 'Máy tính để bàn (PC)', peripheral: 'Thiết bị ngoại vi', other: 'Thiết bị khác',
}

export default function HandoverPrintPage() {
  const { id } = useParams()
  const router = useRouter()
  const [device, setDevice] = useState<Device | null>(null)
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [docNumber, setDocNumber] = useState('')

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/devices/${id}`)
      const json = await res.json()
      if (!json.data) { router.push(`/dashboard/devices/${id}`); return }
      setDevice(json.data)
      setAssignment(json.active_assignment || null)

      const now = new Date()
      setDocNumber(`${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-BBGTTB`)

      const QRCode = (await import('qrcode')).default
      const url = `${window.location.origin}/device/${json.data.id}`
      const dataUrl = await QRCode.toDataURL(url, { width: 120, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      setQrDataUrl(dataUrl)
      setLoading(false)
    }
    load()
  }, [id, router])

  if (loading) return <div className="p-8 text-gray-400">Đang tải...</div>
  if (!device) return null

  const now = new Date()
  const day = now.getDate()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const emp = assignment?.employee
  const assignDate = assignment ? new Date(assignment.assigned_date) : now

  const specs: { label: string; value: string }[] = []
  if (device.category === 'laptop' && device.laptop_specs) {
    const s = device.laptop_specs
    if (s.cpu) specs.push({ label: 'CPU', value: s.cpu })
    if (s.ram) specs.push({ label: 'RAM', value: s.ram })
    if (s.storage) specs.push({ label: 'Ổ cứng', value: s.storage })
    if (s.display) specs.push({ label: 'Màn hình', value: s.display })
    if (s.os) specs.push({ label: 'Hệ điều hành', value: s.os })
    if (s.gpu) specs.push({ label: 'Card đồ họa', value: s.gpu })
  }
  if (device.category === 'monitor' && device.monitor_specs) {
    const s = device.monitor_specs
    if (s.screen_size) specs.push({ label: 'Kích thước', value: s.screen_size })
    if (s.resolution) specs.push({ label: 'Độ phân giải', value: s.resolution })
    if (s.panel_type) specs.push({ label: 'Tấm nền', value: s.panel_type })
    if (s.refresh_rate) specs.push({ label: 'Tần số quét', value: s.refresh_rate })
  }

  return (
    <>
      {/* Toolbar - ẩn khi in */}
      <div className="print:hidden p-4 border-b border-gray-800 flex items-center gap-4 bg-gray-950">
        <Link href={`/dashboard/devices/${id}`} className="text-gray-400 hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <span className="text-sm text-gray-300 flex-1">Xem trước biên bản bàn giao</span>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-lg text-sm font-medium transition-colors">
          <Printer size={15} /> In biên bản
        </button>
      </div>

      {/* Preview bg */}
      <div className="print:p-0 p-8 bg-gray-100 min-h-screen print:bg-white print:min-h-0">
        <div className="doc-page bg-white mx-auto" style={{ maxWidth: 794, fontFamily: "'Times New Roman', Times, serif" }}>

          {/* ===== HEADER ===== */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
            <tbody>
              <tr>
                <td style={{ width: '60%', verticalAlign: 'top' }}>
                  <div style={{ textAlign: 'center', borderRight: '1px solid #000', paddingRight: 16, paddingBottom: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>
                      CÔNG TY CP XÂY DỰNG CN HƯNG PHƯỚC
                    </p>
                    <p style={{ fontSize: 11, fontWeight: 'bold', margin: '2px 0 0', textTransform: 'uppercase' }}>
                      PHÒNG CÔNG NGHỆ THÔNG TIN
                    </p>
                    <div style={{ borderBottom: '2px solid #000', width: 120, margin: '4px auto 4px' }} />
                    <p style={{ fontSize: 11, margin: 0 }}>Số: <span style={{ fontWeight: 'bold' }}>{docNumber}</span></p>
                  </div>
                </td>
                <td style={{ width: '40%', verticalAlign: 'top', textAlign: 'center', paddingLeft: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                  <p style={{ fontSize: 11, fontWeight: 'bold', margin: '2px 0' }}>Độc lập - Tự do - Hạnh phúc</p>
                  <div style={{ borderBottom: '2px solid #000', width: 160, margin: '4px auto 4px' }} />
                  <p style={{ fontSize: 11, fontStyle: 'italic', margin: 0 }}>
                    TP. Hồ Chí Minh, ngày {day} tháng {month} năm {year}
                  </p>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ===== TITLE ===== */}
          <div style={{ textAlign: 'center', margin: '12px 0 8px' }}>
            <p style={{ fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase', margin: 0, letterSpacing: 1 }}>
              BIÊN BẢN BÀN GIAO THIẾT BỊ
            </p>
            <p style={{ fontSize: 12, fontStyle: 'italic', margin: '3px 0 0' }}>
              (Kèm theo Quyết định bàn giao thiết bị công nghệ thông tin)
            </p>
          </div>

          {/* ===== CĂN CỨ ===== */}
          <div style={{ fontSize: 13, margin: '8px 0', lineHeight: 1.8 }}>
            <p style={{ margin: '2px 0' }}>
              Hôm nay, ngày <strong>{day}</strong> tháng <strong>{month}</strong> năm <strong>{year}</strong>, chúng tôi gồm có:
            </p>
          </div>

          {/* ===== BÊN GIAO ===== */}
          <div style={{ fontSize: 13, lineHeight: 1.8, margin: '6px 0' }}>
            <p style={{ fontWeight: 'bold', margin: '0 0 2px', textDecoration: 'underline' }}>BÊN GIAO (Bên A): Phòng Công nghệ Thông tin</p>
            <p style={{ margin: '2px 0', paddingLeft: 16 }}>- Đại diện: Trưởng phòng CNTT &nbsp;&nbsp; Chức vụ: Trưởng phòng</p>
            <p style={{ margin: '2px 0', paddingLeft: 16 }}>- Đơn vị: Công ty Cổ phần Xây dựng Công nghiệp Hưng Phước</p>
          </div>

          {/* ===== BÊN NHẬN ===== */}
          <div style={{ fontSize: 13, lineHeight: 1.8, margin: '6px 0' }}>
            <p style={{ fontWeight: 'bold', margin: '0 0 2px', textDecoration: 'underline' }}>BÊN NHẬN (Bên B):</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                <tr>
                  <td style={{ paddingLeft: 16, paddingBottom: 2, width: '50%' }}>
                    - Họ và tên: <strong>{emp?.full_name || '..............................'}</strong>
                  </td>
                  <td style={{ paddingBottom: 2 }}>
                    - Mã NV: <strong>{emp?.employee_code || '................'}</strong>
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: 16, paddingBottom: 2 }}>
                    - Phòng/Ban: {emp?.department?.name || '..............................'}
                  </td>
                  <td style={{ paddingBottom: 2 }}>
                    - Chức vụ: {emp?.position || '..............................'}
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: 16, paddingBottom: 2 }}>
                    - Email: {emp?.email || '..............................'}
                  </td>
                  <td style={{ paddingBottom: 2 }}>
                    - Điện thoại: {emp?.phone || '..............................'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: 13, margin: '6px 0', lineHeight: 1.8 }}>
            Hai bên thống nhất lập biên bản bàn giao thiết bị với nội dung như sau:
          </p>

          {/* ===== ĐIỀU 1 ===== */}
          <div style={{ fontSize: 13, margin: '6px 0', lineHeight: 1.8 }}>
            <p style={{ fontWeight: 'bold', margin: '4px 0 2px' }}>Điều 1. Thông tin thiết bị bàn giao</p>

            {/* Bảng thiết bị */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 6 }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0' }}>
                  <th style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center', width: 30 }}>STT</th>
                  <th style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center' }}>Thông tin</th>
                  <th style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center' }}>Nội dung</th>
                  <th style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center', width: 80 }}>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Loại thiết bị', value: CATEGORY_LABEL[device.category] || device.category },
                  { label: 'Mã tài sản', value: device.asset_code },
                  { label: 'Hãng sản xuất', value: device.brand },
                  { label: 'Model', value: device.model },
                  { label: 'Số Serial', value: device.serial_number || '—' },
                  { label: 'Ngày mua', value: device.purchase_date ? new Date(device.purchase_date).toLocaleDateString('vi-VN') : '—' },
                  { label: 'Bảo hành đến', value: device.warranty_expiry ? new Date(device.warranty_expiry).toLocaleDateString('vi-VN') : '—' },
                  ...specs.map(s => ({ label: s.label, value: s.value })),
                ].map((row, i) => (
                  <tr key={i}>
                    <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center' }}>{i + 1}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 8px' }}>{row.label}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 8px', fontWeight: i <= 4 ? 'bold' : 'normal' }}>{row.value}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 8px' }}></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p style={{ margin: '6px 0 2px', paddingLeft: 8 }}>
              - Ngày bàn giao: <strong>{assignDate.toLocaleDateString('vi-VN')}</strong>
              {assignment?.notes && <span> &nbsp;— Ghi chú: {assignment.notes}</span>}
            </p>
            <p style={{ margin: '2px 0', paddingLeft: 8 }}>
              - Tình trạng thiết bị tại thời điểm bàn giao: <strong>Hoạt động bình thường</strong>
            </p>
          </div>

          {/* ===== ĐIỀU 2 ===== */}
          <div style={{ fontSize: 13, margin: '6px 0', lineHeight: 1.8 }}>
            <p style={{ fontWeight: 'bold', margin: '4px 0 2px' }}>Điều 2. Trách nhiệm của bên nhận</p>
            <p style={{ margin: '2px 0', paddingLeft: 16 }}>1. Sử dụng thiết bị đúng mục đích công việc, không dùng cho mục đích cá nhân.</p>
            <p style={{ margin: '2px 0', paddingLeft: 16 }}>2. Bảo quản thiết bị cẩn thận, tránh để hư hỏng, mất mát do lỗi chủ quan.</p>
            <p style={{ margin: '2px 0', paddingLeft: 16 }}>3. Chịu trách nhiệm bồi thường theo quy định công ty nếu hư hỏng do lỗi chủ quan.</p>
            <p style={{ margin: '2px 0', paddingLeft: 16 }}>4. Bàn giao lại thiết bị nguyên vẹn cho Phòng CNTT khi nghỉ việc hoặc chuyển công tác.</p>
            <p style={{ margin: '2px 0', paddingLeft: 16 }}>5. Thông báo ngay cho Phòng CNTT khi có sự cố liên quan đến thiết bị.</p>
          </div>

          {/* ===== ĐIỀU 3 ===== */}
          <div style={{ fontSize: 13, margin: '4px 0', lineHeight: 1.8 }}>
            <p style={{ fontWeight: 'bold', margin: '4px 0 2px' }}>Điều 3. Điều khoản chung</p>
            <p style={{ margin: '2px 0', paddingLeft: 16 }}>
              Biên bản được lập thành <strong>02 (hai) bản</strong>, có giá trị pháp lý như nhau. Bên A giữ 01 bản, Bên B giữ 01 bản.
              Biên bản có hiệu lực kể từ ngày ký.
            </p>
          </div>

          {/* ===== KÝ TÊN ===== */}
          <table style={{ width: '100%', marginTop: 16, fontSize: 13, borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', paddingBottom: 4 }}>
                  <p style={{ fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>Bên giao</p>
                  <p style={{ fontStyle: 'italic', margin: '2px 0 0', fontSize: 12 }}>(Ký, ghi rõ họ tên)</p>
                </td>
                <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', paddingBottom: 4 }}>
                  <p style={{ fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>Bên nhận</p>
                  <p style={{ fontStyle: 'italic', margin: '2px 0 0', fontSize: 12 }}>(Ký, ghi rõ họ tên)</p>
                </td>
              </tr>
              <tr>
                <td style={{ height: 70 }}></td>
                <td></td>
              </tr>
              <tr>
                <td style={{ textAlign: 'center', borderTop: '1px solid #555', paddingTop: 6 }}>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>Đại diện Phòng CNTT</p>
                </td>
                <td style={{ textAlign: 'center', borderTop: '1px solid #555', paddingTop: 6 }}>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{emp?.full_name || '..............................'}</p>
                </td>
              </tr>
            </tbody>
          </table>

          {/* QR nhỏ góc dưới */}
          {qrDataUrl && (
            <div style={{ position: 'absolute', bottom: 20, right: 24, textAlign: 'center', opacity: 0.8 }}>
              <img src={qrDataUrl} alt="QR" style={{ width: 64, height: 64 }} />
              <p style={{ fontSize: 9, margin: '2px 0 0', fontFamily: 'monospace' }}>{device.asset_code}</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 20mm 20mm 20mm 25mm; }
          body { margin: 0 !important; padding: 0 !important; background: white; }
          .doc-page {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            position: relative;
          }
          img { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        @media screen {
          .doc-page { padding: 25mm 20mm 20mm; box-shadow: 0 4px 24px rgba(0,0,0,0.15); }
        }
      `}</style>
    </>
  )
}
