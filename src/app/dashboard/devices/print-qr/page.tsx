'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'
import Link from 'next/link'

interface Device { id: string; asset_code: string; brand: string; model: string; category: string }

function PrintQRContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [items, setItems] = useState<{ device: Device; qrUrl: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ids = searchParams.get('ids')?.split(',').filter(Boolean) || []
    if (!ids.length) { router.push('/dashboard/devices'); return }

    async function load() {
      const QRCode = (await import('qrcode')).default
      const results = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`/api/devices/${id}`)
          const json = await res.json()
          if (!json.data) return null
          const url = `${window.location.origin}/device/${id}`
          const qrUrl = await QRCode.toDataURL(url, {
            width: 200, margin: 1, color: { dark: '#000000', light: '#ffffff' }
          })
          return { device: json.data as Device, qrUrl }
        })
      )
      setItems(results.filter(Boolean) as { device: Device; qrUrl: string }[])
      setLoading(false)
    }
    load()
  }, [searchParams, router])

  if (loading) return <div className="p-8 text-gray-400">Đang tạo QR codes...</div>

  return (
    <>
      <div className="print:hidden p-4 border-b border-gray-800 flex items-center gap-4 bg-gray-950">
        <Link href="/dashboard/devices" className="text-gray-400 hover:text-white">
          <ArrowLeft size={20} />
        </Link>
        <span className="text-sm text-gray-300 flex-1">In QR hàng loạt — {items.length} thiết bị</span>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-lg text-sm font-medium transition-colors">
          <Printer size={15} /> In tất cả
        </button>
      </div>

      <div className="print:p-0 p-8 bg-gray-100 min-h-screen print:bg-white">
        <div className="qr-grid">
          {items.map(({ device, qrUrl }) => (
            <div key={device.id} className="qr-card">
              <img src={qrUrl} alt={device.asset_code} className="qr-img" />
              <div className="qr-code">{device.asset_code}</div>
              <div className="qr-name">{device.brand} {device.model}</div>
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
        .qr-name { font-size: 10px; color: #6b7280; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
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

export default function PrintQRPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">Đang tải...</div>}>
      <PrintQRContent />
    </Suspense>
  )
}
