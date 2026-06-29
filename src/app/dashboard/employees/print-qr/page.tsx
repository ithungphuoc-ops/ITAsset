'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'
import Link from 'next/link'

interface Employee { id: string; full_name: string; employee_code?: string; department?: { name: string } }

function PrintQRContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [items, setItems] = useState<{ employee: Employee; qrUrl: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ids = searchParams.get('ids')?.split(',').filter(Boolean) || []
    if (!ids.length) { router.push('/dashboard/employees'); return }

    async function load() {
      const QRCode = (await import('qrcode')).default
      const results = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`/api/employees/${id}`)
          const json = await res.json()
          if (!json.data) return null
          const url = `${window.location.origin}/employee/${json.data.employee_code || id}`
          const qrUrl = await QRCode.toDataURL(url, {
            width: 200, margin: 1, color: { dark: '#000000', light: '#ffffff' }
          })
          return { employee: json.data as Employee, qrUrl }
        })
      )
      setItems(results.filter(Boolean) as { employee: Employee; qrUrl: string }[])
      setLoading(false)
    }
    load()
  }, [searchParams, router])

  if (loading) return <div className="p-8 text-gray-400">Đang tạo QR codes...</div>

  return (
    <>
      <div className="print:hidden p-4 border-b border-gray-800 flex items-center gap-4 bg-gray-950">
        <Link href="/dashboard/employees" className="text-gray-400 hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <span className="text-sm text-gray-300 flex-1">In QR nhân viên — {items.length} người</span>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-lg text-sm font-medium transition-colors">
          <Printer size={15} /> In tất cả
        </button>
      </div>

      <div className="print:p-0 p-8 bg-gray-100 min-h-screen print:bg-white">
        <div className="qr-grid">
          {items.map(({ employee, qrUrl }) => (
            <div key={employee.id} className="qr-card">
              <img src={qrUrl} alt={employee.full_name} className="qr-img" />
              <div className="qr-code">{employee.employee_code || employee.id.slice(0, 8)}</div>
              <div className="qr-name">{employee.full_name}</div>
              {employee.department?.name && (
                <div className="qr-dept">{employee.department.name}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .qr-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          max-width: 900px;
          margin: 0 auto;
        }
        .qr-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px 8px 8px;
          text-align: center;
        }
        .qr-img { width: 140px; height: 140px; margin: 0 auto 6px; display: block; }
        .qr-code { font-family: monospace; font-size: 11px; font-weight: 700; color: #111; }
        .qr-name { font-size: 11px; color: #111; margin-top: 2px; font-weight: 600; }
        .qr-dept { font-size: 10px; color: #6b7280; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        @media print {
          @page { size: A4; margin: 10mm; }
          body { margin: 0; background: white; }
          .qr-grid { max-width: 100%; gap: 8px; }
          .qr-card { border: 1px solid #ccc; break-inside: avoid; }
          .qr-img { width: 120px; height: 120px; }
        }
      `}</style>
    </>
  )
}

export default function EmployeePrintQRPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">Đang tải...</div>}>
      <PrintQRContent />
    </Suspense>
  )
}
