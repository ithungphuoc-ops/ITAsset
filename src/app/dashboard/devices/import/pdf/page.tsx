'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Sparkles, CheckCircle, Building2, Calendar, DollarSign, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface Supplier { ten: string; dia_chi: string; ma_so_thue: string; dien_thoai: string }
interface PurchaseInfo { so_bao_gia: string; ngay_bao_gia: string; nguoi_mua: string; don_vi_mua: string }
interface ExtractedDevice {
  ten_thiet_bi: string; hang: string; model: string; so_luong: number; don_gia: number
  loai_thiet_bi: string; cpu?: string; ram?: string; o_cung?: string
  man_hinh?: string; he_dieu_hanh?: string; kich_thuoc_man_hinh?: string; do_phan_giai?: string
  selected: boolean; asset_codes: string[]
}
interface ExtractedData {
  nha_cung_cap: Supplier; thong_tin_mua: PurchaseInfo
  thiet_bi: ExtractedDevice[]; tong_tien: number; vat: number; tong_cong: number
}

export default function ImportPDFPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ExtractedData | null>(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/ai-extract-pdf', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Lỗi đọc file')
      // Init selected + asset_codes
      const ts = Date.now()
      const devices = json.data.thiet_bi.map((d: ExtractedDevice, devIdx: number) => ({
        ...d,
        selected: true,
        asset_codes: Array.from({ length: d.so_luong || 1 }, (_, i) => `IT-${ts}-${devIdx}${i > 0 ? `-${i}` : ''}`),
      }))
      setData({ ...json.data, thiet_bi: devices })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  function toggleDevice(i: number) {
    if (!data) return
    const devices = [...data.thiet_bi]
    devices[i] = { ...devices[i], selected: !devices[i].selected }
    setData({ ...data, thiet_bi: devices })
  }

  function updateAssetCode(devIdx: number, codeIdx: number, val: string) {
    if (!data) return
    const devices = [...data.thiet_bi]
    const codes = [...devices[devIdx].asset_codes]
    codes[codeIdx] = val
    devices[devIdx] = { ...devices[devIdx], asset_codes: codes }
    setData({ ...data, thiet_bi: devices })
  }

  async function handleSave() {
    if (!data) return
    setSaving(true)
    try {
      // Gom tất cả thiết bị cần lưu thành flat list
      const devices: object[] = []
      for (const dev of data.thiet_bi.filter(d => d.selected)) {
        for (let i = 0; i < (dev.so_luong || 1); i++) {
          devices.push({
            asset_code: dev.asset_codes[i] || `IT-${Date.now()}-${i}`,
            category: dev.loai_thiet_bi || 'other',
            hang: dev.hang, model: dev.model,
            don_gia: dev.don_gia,
            cpu: dev.cpu, ram: dev.ram, o_cung: dev.o_cung,
            man_hinh: dev.man_hinh, he_dieu_hanh: dev.he_dieu_hanh,
            kich_thuoc_man_hinh: dev.kich_thuoc_man_hinh,
            do_phan_giai: dev.do_phan_giai,
          })
        }
      }

      const res = await fetch('/api/save-devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices, thong_tin_mua: data.thong_tin_mua, nha_cung_cap: data.nha_cung_cap }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Lỗi lưu dữ liệu')
      if (json.saved === 0) {
        throw new Error(json.errors?.[0] || 'Không lưu được thiết bị nào')
      }
      if (json.errors?.length > 0) {
        setError(`${json.saved} thành công, ${json.errors.length} lỗi: ${json.errors[0]}`)
      }
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi lưu dữ liệu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/devices/import" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles size={22} className="text-blue-400" />
            AI đọc báo giá PDF
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Upload file PDF hoặc ảnh chụp báo giá — AI tự trích xuất thông tin</p>
        </div>
      </div>

      {/* Upload */}
      {!data && !loading && (
        <div>
          <div onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-xl p-16 text-center cursor-pointer transition-colors group">
            <FileText size={48} className="mx-auto text-gray-600 group-hover:text-blue-400 mb-4 transition-colors" />
            <p className="text-lg font-medium text-gray-300 mb-2">Upload báo giá PDF / ảnh</p>
            <p className="text-sm text-gray-500">AI sẽ tự đọc và trích xuất thông tin nhà cung cấp + thiết bị</p>
            <p className="text-xs text-gray-600 mt-2">Hỗ trợ: PDF, JPG, PNG</p>
            <input ref={fileRef} type="file" accept=".pdf,image/*" onChange={handleFile} className="hidden" />
          </div>
          {error && <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</div>}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-20">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-300 font-medium">AI đang đọc báo giá...</p>
          <p className="text-gray-500 text-sm mt-1">Thường mất 10-20 giây</p>
        </div>
      )}

      {/* Done */}
      {done && (
        <div className="text-center py-16">
          <CheckCircle size={56} className="mx-auto text-green-400 mb-4" />
          <h2 className="text-xl font-bold mb-2">Nhập thành công!</h2>
          <div className="flex gap-3 justify-center mt-6">
            <button onClick={() => router.push('/dashboard/devices')}
              className="bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-lg text-sm font-medium">
              Xem danh sách thiết bị
            </button>
            <button onClick={() => { setData(null); setDone(false) }}
              className="border border-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white">
              Import thêm
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {data && !done && (
        <div className="space-y-6">
          {/* Nhà cung cấp */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><Building2 size={16} className="text-blue-400" /> Nhà cung cấp</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Tên NCC" value={data.nha_cung_cap.ten} />
              <Info label="MST" value={data.nha_cung_cap.ma_so_thue} mono />
              <Info label="Địa chỉ" value={data.nha_cung_cap.dia_chi} className="col-span-2" />
            </div>
          </div>

          {/* Thông tin mua */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><Calendar size={16} className="text-purple-400" /> Thông tin báo giá</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Số báo giá" value={data.thong_tin_mua.so_bao_gia} mono />
              <Info label="Ngày" value={data.thong_tin_mua.ngay_bao_gia} />
              <Info label="Đơn vị mua" value={data.thong_tin_mua.don_vi_mua} />
            </div>
          </div>

          {/* Danh sách thiết bị */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Sparkles size={16} className="text-yellow-400" />
              Thiết bị ({data.thiet_bi.length} loại)
            </h2>
            <div className="space-y-4">
              {data.thiet_bi.map((dev, i) => (
                <div key={i} className={`border rounded-xl p-4 transition-colors ${dev.selected ? 'border-blue-500/40 bg-blue-500/5' : 'border-gray-700 opacity-50'}`}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={dev.selected} onChange={() => toggleDevice(i)}
                      className="mt-1 w-4 h-4 accent-blue-500 cursor-pointer" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{dev.hang} {dev.model}</span>
                        <span className="text-xs bg-gray-700 px-2 py-0.5 rounded capitalize">{dev.loai_thiet_bi}</span>
                        <span className="text-xs text-gray-400">x{dev.so_luong}</span>
                      </div>
                      <div className="text-xs text-gray-400 space-x-3">
                        {dev.cpu && <span>CPU: {dev.cpu}</span>}
                        {dev.ram && <span>RAM: {dev.ram}</span>}
                        {dev.o_cung && <span>SSD: {dev.o_cung}</span>}
                        {dev.kich_thuoc_man_hinh && <span>Size: {dev.kich_thuoc_man_hinh}</span>}
                      </div>
                      {dev.don_gia > 0 && (
                        <div className="text-xs text-green-400 mt-1">
                          {dev.don_gia.toLocaleString('vi-VN')} ₫ / cái
                        </div>
                      )}
                      {/* Mã tài sản cho từng cái */}
                      {dev.selected && (
                        <div className="mt-3 space-y-1.5">
                          <p className="text-xs text-gray-500">Mã tài sản (nhập cho từng thiết bị):</p>
                          {dev.asset_codes.map((code, ci) => (
                            <input key={ci} type="text" value={code}
                              onChange={e => updateAssetCode(i, ci, e.target.value)}
                              placeholder={`Mã tài sản #${ci + 1}`}
                              className="block w-48 bg-gray-800 border border-gray-600 rounded px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500" />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tổng tiền */}
          {data.tong_cong > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-2">
              <DollarSign size={16} className="text-green-400" />
              <span className="text-gray-400 text-sm">Tổng cộng:</span>
              <span className="font-bold text-green-400 ml-auto">{data.tong_cong.toLocaleString('vi-VN')} ₫</span>
            </div>
          )}

          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</div>}

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving || !data.thiet_bi.some(d => d.selected)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
              <CheckCircle size={16} />
              {saving ? 'Đang lưu...' : `Lưu ${data.thiet_bi.filter(d => d.selected).reduce((s, d) => s + d.so_luong, 0)} thiết bị`}
            </button>
            <button onClick={() => { setData(null); setError('') }}
              className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-400 border border-gray-700 hover:border-gray-500 transition-colors">
              Upload lại
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Info({ label, value, mono, className }: { label: string; value: string; mono?: boolean; className?: string }) {
  return (
    <div className={className}>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className={`text-white ${mono ? 'font-mono' : ''}`}>{value || '—'}</div>
    </div>
  )
}
