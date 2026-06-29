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
interface Assignment { assigned_date: string; notes?: string; employee?: Employee }

const CATEGORY_LABEL: Record<string, string> = {
  laptop: 'Máy tính xách tay (Laptop)', monitor: 'Màn hình máy tính',
  pc: 'Máy tính để bàn (PC)', peripheral: 'Thiết bị ngoại vi', other: 'Thiết bị khác',
}

const S: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: "'Times New Roman', Times, serif",
    fontSize: 13,
    color: '#000',
    background: '#fff',
    lineHeight: 1.8,
    position: 'relative',
  },
  bold: { fontWeight: 'bold' },
  center: { textAlign: 'center' },
  p: { margin: '3px 0' },
  underline: { textDecoration: 'underline', fontWeight: 'bold' },
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
      setDocNumber(`${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}-BBGTTB`)
      const QRCode = (await import('qrcode')).default
      const dataUrl = await QRCode.toDataURL(`${window.location.origin}/device/${json.data.id}`, {
        width: 100, margin: 1, color: { dark: '#000', light: '#fff' }
      })
      setQrDataUrl(dataUrl)
      setLoading(false)
    }
    load()
  }, [id, router])

  if (loading) return <div className="p-8 text-gray-400">Đang tải...</div>
  if (!device) return null

  const now = new Date()
  const day = now.getDate(), month = now.getMonth() + 1, year = now.getFullYear()
  const emp = assignment?.employee
  const assignDate = assignment ? new Date(assignment.assigned_date) : now

  const deviceRows: { label: string; value: string }[] = [
    { label: 'Loại thiết bị', value: CATEGORY_LABEL[device.category] || device.category },
    { label: 'Mã tài sản', value: device.asset_code },
    { label: 'Hãng sản xuất', value: device.brand },
    { label: 'Model/Tên thiết bị', value: device.model },
    { label: 'Số Serial (S/N)', value: device.serial_number || '—' },
    { label: 'Ngày mua', value: device.purchase_date ? new Date(device.purchase_date).toLocaleDateString('vi-VN') : '—' },
    { label: 'Bảo hành đến', value: device.warranty_expiry ? new Date(device.warranty_expiry).toLocaleDateString('vi-VN') : '—' },
    { label: 'Tình trạng bàn giao', value: 'Hoạt động bình thường' },
  ]
  if (device.laptop_specs) {
    const s = device.laptop_specs
    if (s.cpu) deviceRows.push({ label: 'CPU', value: s.cpu })
    if (s.ram) deviceRows.push({ label: 'RAM', value: s.ram })
    if (s.storage) deviceRows.push({ label: 'Ổ cứng', value: s.storage })
    if (s.display) deviceRows.push({ label: 'Màn hình', value: s.display })
    if (s.os) deviceRows.push({ label: 'Hệ điều hành', value: s.os })
  }
  if (device.monitor_specs) {
    const s = device.monitor_specs
    if (s.screen_size) deviceRows.push({ label: 'Kích thước', value: s.screen_size })
    if (s.resolution) deviceRows.push({ label: 'Độ phân giải', value: s.resolution })
  }

  return (
    <>
      {/* Toolbar */}
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

      {/* Preview */}
      <div className="print:p-0 py-10 px-4 bg-gray-200 min-h-screen print:bg-white">
        <div className="doc-page bg-white mx-auto" style={{ maxWidth: 740, ...S.page }}>
          <div style={{ padding: '20mm 20mm 20mm 25mm' }}>

            {/* HEADER */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 2, color: '#000' }}>
              <tbody><tr>

                {/* Góc trái */}
                <td style={{ width: '50%', verticalAlign: 'top', textAlign: 'center', paddingRight: 10, borderRight: '1px solid #000' }}>
                  <p style={{ ...S.p, ...S.bold, fontSize: 12, textTransform: 'uppercase' }}>CÔNG TY CP XÂY DỰNG CN HƯNG PHƯỚC</p>
                  <p style={{ ...S.p, ...S.bold, fontSize: 12, textTransform: 'uppercase' }}>PHÒNG CÔNG NGHỆ THÔNG TIN</p>
                  <div style={{ width: 120, borderBottom: '2px solid #000', margin: '4px auto' }} />
                  <p style={{ ...S.p, fontSize: 12 }}>Số: <strong>{docNumber}</strong></p>
                </td>

                {/* Góc phải */}
                <td style={{ width: '50%', verticalAlign: 'top', textAlign: 'center', paddingLeft: 10 }}>
                  <p style={{ ...S.p, ...S.bold, fontSize: 12, textTransform: 'uppercase' }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                  <p style={{ ...S.p, ...S.bold, fontSize: 12 }}>Độc lập – Tự do – Hạnh phúc</p>
                  <div style={{ width: 160, borderBottom: '2px solid #000', margin: '4px auto' }} />
                  <p style={{ ...S.p, fontSize: 12, fontStyle: 'italic' }}>
                    TP. Hồ Chí Minh, ngày {day} tháng {month} năm {year}
                  </p>
                </td>

              </tr></tbody>
            </table>

            {/* TIÊU ĐỀ */}
            <div style={{ textAlign: 'center', margin: '14px 0 10px', color: '#000' }}>
              <p style={{ ...S.bold, fontSize: 16, textTransform: 'uppercase', margin: 0, letterSpacing: 0.5 }}>
                BIÊN BẢN BÀN GIAO THIẾT BỊ
              </p>
              <p style={{ fontSize: 12, fontStyle: 'italic', margin: '3px 0 0' }}>
                (Bàn giao thiết bị công nghệ thông tin)
              </p>
            </div>

            {/* CĂN CỨ */}
            <p style={{ ...S.p, color: '#000' }}>
              Hôm nay, ngày <strong>{day}</strong> tháng <strong>{month}</strong> năm <strong>{year}</strong>,
              tại Công ty Cổ phần Xây dựng Công nghiệp Hưng Phước, chúng tôi gồm có:
            </p>

            {/* BÊN GIAO */}
            <p style={{ ...S.p, ...S.underline, marginTop: 8, color: '#000' }}>BÊN GIAO (Bên A): Phòng Công nghệ Thông tin</p>
            <p style={{ ...S.p, paddingLeft: 20, color: '#000' }}>- Đại diện: Trưởng phòng CNTT &emsp; Chức vụ: Trưởng phòng CNTT</p>
            <p style={{ ...S.p, paddingLeft: 20, color: '#000' }}>- Đơn vị: Công ty Cổ phần Xây dựng Công nghiệp Hưng Phước</p>

            {/* BÊN NHẬN */}
            <p style={{ ...S.p, ...S.underline, marginTop: 6, color: '#000' }}>BÊN NHẬN (Bên B):</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#000', fontSize: 13 }}>
              <tbody>
                <tr>
                  <td style={{ padding: '1px 0 1px 20px', width: '50%' }}>
                    - Họ và tên: <strong>{emp?.full_name || '......................................'}</strong>
                  </td>
                  <td style={{ padding: '1px 0' }}>
                    - Mã NV: <strong>{emp?.employee_code || '..................'}</strong>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '1px 0 1px 20px' }}>
                    - Phòng/Ban: {emp?.department?.name || '......................................'}
                  </td>
                  <td style={{ padding: '1px 0' }}>
                    - Chức vụ: {emp?.position || '......................................'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '1px 0 1px 20px' }}>
                    - Email: {emp?.email || '......................................'}
                  </td>
                  <td style={{ padding: '1px 0' }}>
                    - Điện thoại: {emp?.phone || '......................................'}
                  </td>
                </tr>
              </tbody>
            </table>

            <p style={{ ...S.p, marginTop: 6, color: '#000' }}>
              Hai bên thống nhất lập biên bản bàn giao thiết bị với nội dung như sau:
            </p>

            {/* ĐIỀU 1 */}
            <p style={{ ...S.p, ...S.bold, marginTop: 8, color: '#000' }}>Điều 1. Thông tin thiết bị bàn giao</p>
            <p style={{ ...S.p, paddingLeft: 20, color: '#000' }}>
              Bên A bàn giao cho Bên B thiết bị với thông tin cụ thể như sau:
            </p>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, color: '#000', marginTop: 6 }}>
              <thead>
                <tr style={{ background: '#d9d9d9' }}>
                  <th style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'center', width: 36 }}>STT</th>
                  <th style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'center', width: '30%' }}>Thông tin</th>
                  <th style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'center' }}>Nội dung</th>
                  <th style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'center', width: 72 }}>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {deviceRows.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                    <td style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center' }}>{i + 1}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 8px' }}>{row.label}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 8px', fontWeight: i < 5 ? 'bold' : 'normal' }}>{row.value}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 8px' }}></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p style={{ ...S.p, paddingLeft: 20, marginTop: 4, color: '#000' }}>
              - Ngày bàn giao: <strong>{assignDate.toLocaleDateString('vi-VN')}</strong>
              {assignment?.notes ? <span> &nbsp;– Ghi chú: {assignment.notes}</span> : null}
            </p>

            {/* ĐIỀU 2 */}
            <p style={{ ...S.p, ...S.bold, marginTop: 8, color: '#000' }}>Điều 2. Trách nhiệm của bên nhận</p>
            {[
              'Sử dụng thiết bị đúng mục đích công việc, không sử dụng cho mục đích cá nhân.',
              'Bảo quản thiết bị cẩn thận, tránh để hư hỏng, mất mát do nguyên nhân chủ quan.',
              'Chịu trách nhiệm bồi thường theo quy định của Công ty nếu thiết bị hư hỏng do lỗi chủ quan.',
              'Bàn giao lại thiết bị cho Phòng CNTT khi thôi việc, chuyển công tác hoặc khi có yêu cầu.',
              'Thông báo ngay cho Phòng CNTT khi có sự cố liên quan đến thiết bị được giao.',
            ].map((text, i) => (
              <p key={i} style={{ ...S.p, paddingLeft: 20, color: '#000' }}>{i + 1}. {text}</p>
            ))}

            {/* ĐIỀU 3 */}
            <p style={{ ...S.p, ...S.bold, marginTop: 8, color: '#000' }}>Điều 3. Điều khoản chung</p>
            <p style={{ ...S.p, paddingLeft: 20, color: '#000' }}>
              Biên bản này được lập thành <strong>02 (hai) bản</strong> có giá trị pháp lý như nhau;
              Bên A giữ 01 bản, Bên B giữ 01 bản. Biên bản có hiệu lực kể từ ngày hai bên ký tên.
            </p>

            {/* KÝ TÊN */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20, color: '#000', fontSize: 13 }}>
              <tbody>
                <tr>
                  <td style={{ width: '50%', textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase' }}>Bên giao</td>
                  <td style={{ width: '50%', textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase' }}>Bên nhận</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'center', fontStyle: 'italic', fontSize: 12, paddingBottom: 4 }}>(Ký, ghi rõ họ tên)</td>
                  <td style={{ textAlign: 'center', fontStyle: 'italic', fontSize: 12, paddingBottom: 4 }}>(Ký, ghi rõ họ tên)</td>
                </tr>
                <tr><td style={{ height: 60 }}></td><td></td></tr>
                <tr>
                  <td style={{ textAlign: 'center', borderTop: '1px solid #555', paddingTop: 6 }}>
                    <div style={{ fontWeight: 'bold' }}>Đại diện Phòng CNTT</div>
                  </td>
                  <td style={{ textAlign: 'center', borderTop: '1px solid #555', paddingTop: 6 }}>
                    <div style={{ fontWeight: 'bold' }}>{emp?.full_name || '......................................'}</div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* QR code */}
            {qrDataUrl && (
              <div style={{ position: 'absolute', bottom: 20, right: 20, textAlign: 'center' }}>
                <img src={qrDataUrl} alt="QR" style={{ width: 60, height: 60, display: 'block' }} />
                <p style={{ fontSize: 9, margin: '2px 0 0', fontFamily: 'monospace', color: '#666' }}>{device.asset_code}</p>
              </div>
            )}

          </div>{/* end padding */}
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 20mm 20mm 20mm 25mm; }
          html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
          body > * { display: none !important; }
          body > div:last-of-type { display: block !important; }
          .print\\:p-0 { padding: 0 !important; }
          .doc-page {
            max-width: none !important;
            width: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            background: white !important;
          }
          .doc-page > div { padding: 0 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </>
  )
}
