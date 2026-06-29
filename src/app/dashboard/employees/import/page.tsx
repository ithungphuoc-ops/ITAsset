'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface ImportRow {
  full_name: string
  employee_code?: string
  department_name?: string
  email?: string
  phone?: string
  position?: string
}

interface ImportResult {
  row: number
  name: string
  status: 'success' | 'error' | 'skip'
  message: string
}

export default function ImportEmployeesPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<ImportResult[]>([])
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)

    const XLSX = await import('xlsx')
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const raw = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })

    const mapped: ImportRow[] = raw.map(r => ({
      full_name: (r['HO_TEN'] || r['ho_ten'] || r['Họ tên'] || r['HỌ TÊN'] || '').toString().trim(),
      employee_code: (r['MA_NV'] || r['ma_nv'] || r['Mã NV'] || r['MÃ NV'] || '').toString().trim(),
      department_name: (r['PHONG_BAN'] || r['phong_ban'] || r['Phòng ban'] || r['PHÒNG BAN'] || '').toString().trim(),
      email: (r['EMAIL'] || r['email'] || r['Email'] || '').toString().trim(),
      phone: (r['SDT'] || r['sdt'] || r['Số ĐT'] || r['PHONE'] || r['phone'] || '').toString().trim(),
      position: (r['CHUC_VU'] || r['chuc_vu'] || r['Chức vụ'] || r['CHỨC VỤ'] || '').toString().trim(),
    })).filter(r => r.full_name)

    setRows(mapped)
    setStep('preview')
  }

  async function handleImport() {
    setImporting(true)
    const results: ImportResult[] = []

    // Lấy danh sách phòng ban hiện có
    const deptRes = await fetch('/api/departments')
    const deptJson = await deptRes.json()
    const deptMap: Record<string, string> = {}
    for (const d of (deptJson.data || [])) {
      deptMap[d.name.toLowerCase().trim()] = d.id
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        // Tìm hoặc tạo phòng ban
        let department_id: string | null = null
        if (row.department_name) {
          const key = row.department_name.toLowerCase().trim()
          if (deptMap[key]) {
            department_id = deptMap[key]
          } else {
            // Tạo phòng ban mới
            const newDept = await fetch('/api/departments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: row.department_name }),
            }).then(r => r.json())
            if (newDept.data) {
              deptMap[key] = newDept.data.id
              department_id = newDept.data.id
            }
          }
        }

        const res = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: row.full_name,
            employee_code: row.employee_code || null,
            email: row.email || null,
            phone: row.phone || null,
            department_id,
            is_active: true,
          }),
        })
        const json = await res.json()
        if (!res.ok) {
          const isDup = json.error?.includes('duplicate') || json.error?.includes('unique')
          results.push({ row: i + 1, name: row.full_name, status: isDup ? 'skip' : 'error', message: isDup ? 'Đã tồn tại' : json.error })
        } else {
          results.push({ row: i + 1, name: row.full_name, status: 'success', message: 'Thành công' })
        }
      } catch (err) {
        results.push({ row: i + 1, name: row.full_name, status: 'error', message: err instanceof Error ? err.message : 'Lỗi' })
      }
    }

    setResults(results)
    setStep('done')
    setImporting(false)
  }

  const success = results.filter(r => r.status === 'success').length
  const errors = results.filter(r => r.status === 'error').length
  const skipped = results.filter(r => r.status === 'skip').length

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/employees" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Import nhân viên từ Excel</h1>
          <p className="text-gray-400 text-sm mt-0.5">Nhập hàng loạt từ file .xlsx</p>
        </div>
      </div>

      {/* Hướng dẫn cột */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6 text-sm">
        <p className="text-blue-300 font-medium mb-2">Cột Excel cần có (dòng đầu là tiêu đề):</p>
        <div className="grid grid-cols-3 gap-1 text-blue-200/70 text-xs font-mono">
          <span>HO_TEN <span className="text-red-400">*</span></span>
          <span>MA_NV</span>
          <span>PHONG_BAN</span>
          <span>EMAIL</span>
          <span>SDT</span>
          <span>CHUC_VU</span>
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-xl p-16 text-center cursor-pointer transition-colors group">
          <FileSpreadsheet size={48} className="mx-auto text-gray-600 group-hover:text-blue-400 mb-4 transition-colors" />
          <p className="text-lg font-medium text-gray-300 mb-2">Kéo thả hoặc click để chọn file</p>
          <p className="text-sm text-gray-500">Hỗ trợ file .xlsx</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && (
        <div className="space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-center gap-3">
            <FileSpreadsheet size={20} className="text-blue-400 shrink-0" />
            <div>
              <div className="font-medium text-blue-300">{fileName}</div>
              <div className="text-sm text-blue-400/70">Tìm thấy <strong>{rows.length}</strong> nhân viên hợp lệ</div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="px-4 py-3 text-left font-medium">#</th>
                  <th className="px-4 py-3 text-left font-medium">Họ tên</th>
                  <th className="px-4 py-3 text-left font-medium">Mã NV</th>
                  <th className="px-4 py-3 text-left font-medium">Phòng ban</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">SĐT</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-800/50">
                    <td className="px-4 py-2.5 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-white">{row.full_name}</td>
                    <td className="px-4 py-2.5 font-mono text-blue-400 text-xs">{row.employee_code || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-300">{row.department_name || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{row.email || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{row.phone || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button onClick={handleImport} disabled={importing}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
              <Upload size={16} />
              {importing ? 'Đang nhập...' : `Nhập ${rows.length} nhân viên`}
            </button>
            <button onClick={() => { setStep('upload'); setRows([]); setFileName('') }}
              className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-400 border border-gray-700 hover:border-gray-500 transition-colors">
              Chọn file khác
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 'done' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 text-center">
              <CheckCircle size={28} className="mx-auto text-green-400 mb-2" />
              <div className="text-2xl font-bold text-green-400">{success}</div>
              <div className="text-sm text-gray-400">Nhập thành công</div>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5 text-center">
              <AlertTriangle size={28} className="mx-auto text-yellow-400 mb-2" />
              <div className="text-2xl font-bold text-yellow-400">{skipped}</div>
              <div className="text-sm text-gray-400">Bỏ qua (trùng)</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 text-center">
              <XCircle size={28} className="mx-auto text-red-400 mb-2" />
              <div className="text-2xl font-bold text-red-400">{errors}</div>
              <div className="text-sm text-gray-400">Lỗi</div>
            </div>
          </div>

          {results.filter(r => r.status !== 'success').length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 text-sm font-medium text-gray-400">Chi tiết lỗi</div>
              {results.filter(r => r.status !== 'success').map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-800/50">
                  {r.status === 'skip'
                    ? <AlertTriangle size={14} className="text-yellow-400 shrink-0" />
                    : <XCircle size={14} className="text-red-400 shrink-0" />}
                  <span className="text-sm text-gray-300">Dòng {r.row} — {r.name}</span>
                  <span className="text-xs text-gray-500 ml-auto">{r.message}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => router.push('/dashboard/employees')}
              className="bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
              Xem danh sách nhân viên
            </button>
            <button onClick={() => { setStep('upload'); setRows([]); setResults([]); setFileName('') }}
              className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-400 border border-gray-700 hover:border-gray-500 transition-colors">
              Import thêm
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
