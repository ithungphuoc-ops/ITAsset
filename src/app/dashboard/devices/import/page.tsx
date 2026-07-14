'use client'
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Sparkles, FileText, Building2, Calendar, DollarSign, User, Search, X } from 'lucide-react'
import Link from 'next/link'

// ────── Types ──────
interface ExcelRow {
  ma_tai_san: string; loai_thiet_bi: string; hang: string; model: string
  serial_number?: string; ngay_mua?: string; gia_mua_vnd?: string
  bao_hanh_den?: string; ghi_chu?: string; so_luong?: string
  cpu?: string; ram?: string; o_cung?: string; man_hinh_laptop?: string
  he_dieu_hanh?: string; gpu?: string
  kich_thuoc_man_hinh?: string; do_phan_giai?: string; tam_nen?: string; tan_so_quet?: string
}
interface ImportResult { row: number; asset_code: string; status: 'success' | 'error' | 'skip'; message: string }
interface PdfDevice {
  ten_thiet_bi: string; hang: string; model: string; so_luong: number; don_gia: number
  loai_thiet_bi: string; cpu?: string; ram?: string; o_cung?: string
  man_hinh?: string; he_dieu_hanh?: string; kich_thuoc_man_hinh?: string; do_phan_giai?: string
  selected: boolean; asset_codes: string[]
  // smart assign
  assignee?: Employee | null
  assigneeSearch?: string
}
interface PdfData {
  nha_cung_cap: { ten: string; dia_chi: string; ma_so_thue: string }
  thong_tin_mua: { so_bao_gia: string; ngay_bao_gia: string; don_vi_mua: string }
  thiet_bi: PdfDevice[]; tong_cong: number
}
interface Employee { id: string; full_name: string; employee_code?: string; department?: { name: string } }

// ────── Normalize tiếng Việt ──────
function normalizeVi(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, m => m === 'đ' ? 'd' : 'D').toLowerCase()
}

// ────── Auto classify ──────
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  laptop: ['laptop', 'notebook', 'macbook', 'thinkpad', 'latitude', 'elitebook', 'vivobook', 'inspiron', 'zenbook'],
  monitor: ['monitor', 'màn hình', 'man hinh', 'display', 'screen', 'lcd', 'led'],
  pc: ['pc', 'desktop', 'bộ pc', 'bo pc', 'workstation', 'mini pc', 'nuc'],
  printer: ['printer', 'máy in', 'may in', 'laserjet', 'inkjet', 'scanner', 'máy scan', 'photocopy'],
  networking: ['switch', 'router', 'access point', 'wifi', 'nas', 'firewall', 'modem', 'sfp', 'cisco', 'ubiquiti'],
  component: ['ram', 'ssd', 'hdd', 'cpu', 'gpu', 'vga', 'nguồn', 'mainboard', 'case', 'tản nhiệt', 'linh kiện'],
  ups: ['ups', 'lưu điện', 'luu dien', 'bộ lưu điện', 'apc'],
  peripheral: ['chuột', 'bàn phím', 'ban phim', 'mouse', 'keyboard', 'headset', 'tai nghe', 'webcam', 'hub', 'cáp', 'cap'],
}

function autoClassify(name: string, model: string): string {
  const text = `${name} ${model}`.toLowerCase()
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => text.includes(k))) return cat
  }
  return 'other'
}

const CATEGORY_MAP: Record<string, string> = {
  laptop: 'laptop', monitor: 'monitor', 'màn hình': 'monitor', 'man hinh': 'monitor',
  pc: 'pc', 'bộ pc': 'pc', 'bo pc': 'pc',
  printer: 'printer', 'máy in': 'printer', 'may in': 'printer',
  networking: 'networking', 'thiết bị mạng': 'networking',
  component: 'component', 'linh kiện': 'component', 'linh kien': 'component',
  ups: 'ups', 'lưu điện': 'ups',
  peripheral: 'peripheral', 'phụ kiện': 'peripheral', 'phu kien': 'peripheral',
  other: 'other',
}

function resolveCategory(raw: string, brand: string, model: string): string {
  const mapped = CATEGORY_MAP[raw.toLowerCase()]
  if (mapped) return mapped
  return autoClassify(`${raw} ${brand}`, model)
}

const CATEGORY_LABEL: Record<string, string> = {
  laptop: 'Laptop', monitor: 'Màn hình', pc: 'PC', printer: 'Máy in',
  networking: 'Thiết bị mạng', component: 'Linh kiện', ups: 'UPS',
  peripheral: 'Phụ kiện', other: 'Khác',
}

// ────── Employee Assign Component ──────
function EmployeeAssign({
  allEmployees,
  value,
  onChange,
}: {
  allEmployees: Employee[]
  value: Employee | null | undefined
  onChange: (emp: Employee | null) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [conflictList, setConflictList] = useState<Employee[]>([])
  const ref = useRef<HTMLDivElement>(null)

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return []
    const q = normalizeVi(query)
    return allEmployees.filter(e =>
      normalizeVi(e.full_name).includes(q) ||
      normalizeVi(e.employee_code || '').includes(q)
    ).slice(0, 8)
  }, [allEmployees, query])

  function handleSelect(emp: Employee) {
    onChange(emp)
    setQuery('')
    setOpen(false)
    setConflictList([])
  }

  if (value) {
    return (
      <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-1.5">
        <User size={13} className="text-green-400 shrink-0" />
        <span className="text-green-300 text-xs font-medium">{value.full_name}</span>
        {value.department && <span className="text-green-600 text-xs">· {(value.department as { name: string }).name}</span>}
        <button onClick={() => onChange(null)} className="ml-auto text-green-600 hover:text-red-400 transition-colors">
          <X size={12} />
        </button>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      {/* Conflict picker */}
      {conflictList.length > 0 && (
        <div className="mb-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2">
          <p className="text-yellow-400 text-xs mb-1.5">Tìm thấy {conflictList.length} người — chọn đúng người:</p>
          <div className="flex flex-wrap gap-1.5">
            {conflictList.map(e => (
              <button key={e.id} onClick={() => { handleSelect(e); setConflictList([]) }}
                className="text-xs bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-200 px-2 py-1 rounded border border-yellow-500/20 transition-colors">
                {e.full_name} {e.department ? `· ${(e.department as { name: string }).name}` : ''}
              </button>
            ))}
            <button onClick={() => setConflictList([])} className="text-xs text-gray-500 hover:text-white px-2 py-1">
              Bỏ qua
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Tìm tên nhân viên... (không cần dấu)"
          className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-xl overflow-hidden">
          {filtered.map(e => (
            <button key={e.id} onClick={() => handleSelect(e)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700 transition-colors text-left">
              <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 text-blue-400 text-xs">
                {e.full_name.charAt(0)}
              </div>
              <div>
                <div className="text-xs text-white font-medium">{e.full_name}</div>
                {e.department && <div className="text-xs text-gray-500">{(e.department as { name: string }).name}</div>}
              </div>
              {e.employee_code && <span className="ml-auto text-xs text-gray-500 font-mono">{e.employee_code}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ────── Main component ──────
type Mode = 'idle' | 'excel-preview' | 'excel-done' | 'pdf-loading' | 'pdf-review' | 'pdf-done'

export default function ImportPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<Mode>('idle')
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])

  // Excel state
  const [excelRows, setExcelRows] = useState<ExcelRow[]>([])
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<ImportResult[]>([])

  // PDF state
  const [pdfData, setPdfData] = useState<PdfData | null>(null)
  const [pdfSaving, setPdfSaving] = useState(false)
  const [error, setError] = useState('')

  // Load employees khi vào trang
  useEffect(() => {
    fetch('/api/employees')
      .then(r => r.json())
      .then(json => setAllEmployees((json.data as Employee[]) || []))
  }, [])

  // Smart-match tên nhân viên từ text
  function smartMatchEmployee(name: string): Employee[] {
    if (!name?.trim()) return []
    const q = normalizeVi(name.trim())
    // Lấy tên cuối (thường là tên riêng trong tiếng Việt)
    const parts = q.split(/\s+/)
    const lastName = parts[parts.length - 1]
    return allEmployees.filter(e => {
      const norm = normalizeVi(e.full_name)
      return norm.includes(q) || (lastName.length >= 2 && norm.includes(lastName))
    })
  }

  // ── Drag & drop ──
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true) }, [])
  const onDragLeave = useCallback(() => setDragging(false), [])
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  async function processFile(file: File) {
    setFileName(file.name)
    setError('')
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'xlsx' || ext === 'xls') {
      await processExcel(file)
    } else if (ext === 'pdf' || file.type.startsWith('image/')) {
      await processPdf(file)
    } else {
      setError('Chỉ hỗ trợ file .xlsx, .xls, .pdf, hoặc ảnh')
    }
  }

  // ── Excel ──
  async function processExcel(file: File) {
    const XLSX = await import('xlsx')
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const raw = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { range: 2, defval: '' })

    const mapped: ExcelRow[] = raw.map(r => ({
      ma_tai_san: (r['MA_TAI_SAN*'] || r['ma_tai_san*'] || '').toString().trim(),
      loai_thiet_bi: (r['LOAI_THIET_BI*'] || r['loai_thiet_bi*'] || '').toString().trim().toLowerCase(),
      hang: (r['HANG*'] || r['hang*'] || '').toString().trim(),
      model: (r['MODEL*'] || r['model*'] || '').toString().trim(),
      serial_number: (r['SERIAL_NUMBER'] || r['serial_number'] || '').toString().trim(),
      ngay_mua: (r['NGAY_MUA'] || r['ngay_mua'] || '').toString().trim(),
      gia_mua_vnd: (r['GIA_MUA_VND'] || r['gia_mua_vnd'] || '').toString().trim(),
      bao_hanh_den: (r['BAO_HANH_DEN'] || r['bao_hanh_den'] || '').toString().trim(),
      ghi_chu: (r['GHI_CHU'] || r['ghi_chu'] || '').toString().trim(),
      so_luong: (r['SO_LUONG'] || r['so_luong'] || '1').toString().trim(),
      cpu: (r['CPU'] || r['cpu'] || '').toString().trim(),
      ram: (r['RAM'] || r['ram'] || '').toString().trim(),
      o_cung: (r['O_CUNG'] || r['o_cung'] || '').toString().trim(),
      man_hinh_laptop: (r['MAN_HINH_LAPTOP'] || r['man_hinh_laptop'] || '').toString().trim(),
      he_dieu_hanh: (r['HE_DIEU_HANH'] || r['he_dieu_hanh'] || '').toString().trim(),
      gpu: (r['GPU'] || r['gpu'] || '').toString().trim(),
      kich_thuoc_man_hinh: (r['KICH_THUOC_MAN_HINH'] || r['kich_thuoc_man_hinh'] || '').toString().trim(),
      do_phan_giai: (r['DO_PHAN_GIAI'] || r['do_phan_giai'] || '').toString().trim(),
      tam_nen: (r['TAM_NEN'] || r['tam_nen'] || '').toString().trim(),
      tan_so_quet: (r['TAN_SO_QUET'] || r['tan_so_quet'] || '').toString().trim(),
    })).filter(r => r.ma_tai_san && r.hang && r.model)

    mapped.forEach(r => {
      if (!r.loai_thiet_bi) r.loai_thiet_bi = autoClassify(r.hang, r.model)
    })

    setExcelRows(mapped)
    setMode('excel-preview')
  }

  async function handleExcelImport() {
    setImporting(true)
    const category = excelRows.map(row => resolveCategory(row.loai_thiet_bi, row.hang, row.model))
    const res = await fetch('/api/devices/import-excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: excelRows, category }),
    })
    const json = await res.json()
    setResults(json.results || [])
    setMode('excel-done')
    setImporting(false)
  }

  // ── PDF ──
  async function processPdf(file: File) {
    setMode('pdf-loading')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/ai-extract-pdf', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Lỗi đọc file')
      const ts = Date.now()
      const devices: PdfDevice[] = json.data.thiet_bi.map((d: PdfDevice, idx: number) => {
        const cat = resolveCategory(d.loai_thiet_bi || '', d.hang, d.model)
        // Smart-match từ nguoi_nhan hoặc nguoi_mua nếu AI trích xuất được
        const candidateName = json.data.thong_tin_mua?.nguoi_nhan || json.data.thong_tin_mua?.nguoi_mua || ''
        const matches = candidateName ? smartMatchEmployee(candidateName) : []
        return {
          ...d,
          loai_thiet_bi: cat,
          selected: true,
          asset_codes: Array.from({ length: d.so_luong || 1 }, (_, i) => `IT-${ts}-${idx}${i > 0 ? `-${i}` : ''}`),
          assignee: matches.length === 1 ? matches[0] : null,
          assigneeConflict: matches.length > 1 ? matches : [],
        }
      })
      setPdfData({ ...json.data, thiet_bi: devices })
      setMode('pdf-review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
      setMode('idle')
    }
  }

  function togglePdfDevice(i: number) {
    if (!pdfData) return
    const d = [...pdfData.thiet_bi]; d[i] = { ...d[i], selected: !d[i].selected }
    setPdfData({ ...pdfData, thiet_bi: d })
  }

  function updateAssetCode(di: number, ci: number, val: string) {
    if (!pdfData) return
    const d = [...pdfData.thiet_bi]; const codes = [...d[di].asset_codes]; codes[ci] = val
    d[di] = { ...d[di], asset_codes: codes }; setPdfData({ ...pdfData, thiet_bi: d })
  }

  function setDeviceAssignee(di: number, emp: Employee | null) {
    if (!pdfData) return
    const d = [...pdfData.thiet_bi]
    d[di] = { ...d[di], assignee: emp }
    setPdfData({ ...pdfData, thiet_bi: d })
  }

  async function handlePdfSave() {
    if (!pdfData) return
    setPdfSaving(true)
    try {
      const devices: object[] = []
      for (const dev of pdfData.thiet_bi.filter(d => d.selected)) {
        for (let i = 0; i < (dev.so_luong || 1); i++) {
          devices.push({
            asset_code: dev.asset_codes[i] || `IT-${Date.now()}-${i}`,
            category: dev.loai_thiet_bi || 'other',
            hang: dev.hang, model: dev.model, don_gia: dev.don_gia,
            cpu: dev.cpu, ram: dev.ram, o_cung: dev.o_cung,
            man_hinh: dev.man_hinh, he_dieu_hanh: dev.he_dieu_hanh,
            kich_thuoc_man_hinh: dev.kich_thuoc_man_hinh, do_phan_giai: dev.do_phan_giai,
            employee_id: dev.assignee?.id || null,
          })
        }
      }
      const res = await fetch('/api/save-devices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices, thong_tin_mua: pdfData.thong_tin_mua, nha_cung_cap: pdfData.nha_cung_cap }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Lỗi lưu dữ liệu')
      if (json.saved === 0) throw new Error(json.errors?.[0] || 'Không lưu được')
      setMode('pdf-done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi lưu dữ liệu')
    } finally {
      setPdfSaving(false)
    }
  }

  function reset() { setMode('idle'); setExcelRows([]); setResults([]); setPdfData(null); setError(''); setFileName('') }

  const successCount = results.filter(r => r.status === 'success').length
  const skipCount = results.filter(r => r.status === 'skip').length
  const errorCount = results.filter(r => r.status === 'error').length

  const assignedCount = pdfData?.thiet_bi.filter(d => d.selected && d.assignee).length || 0

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/devices" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Import thiết bị</h1>
          <p className="text-gray-400 text-sm mt-0.5">Kéo thả file Excel (.xlsx) hoặc PDF báo giá vào đây</p>
        </div>
      </div>

      {/* ── Drop zone (idle) ── */}
      {mode === 'idle' && (
        <div>
          <div
            onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all ${
              dragging ? 'border-blue-400 bg-blue-500/10 scale-[1.01]' : 'border-gray-700 hover:border-gray-500'
            }`}
          >
            <div className="flex items-center justify-center gap-6 mb-5">
              <div className="text-center">
                <FileSpreadsheet size={44} className="mx-auto text-green-400 mb-2" />
                <div className="text-xs text-gray-500">Excel .xlsx</div>
              </div>
              <div className="text-gray-700 text-2xl font-thin">|</div>
              <div className="text-center">
                <FileText size={44} className="mx-auto text-purple-400 mb-2" />
                <div className="text-xs text-gray-500">PDF báo giá</div>
              </div>
            </div>
            <p className="text-lg font-medium text-gray-300 mb-2">
              {dragging ? 'Thả file vào đây...' : 'Kéo thả file vào đây'}
            </p>
            <p className="text-sm text-gray-500">hoặc click để chọn · Excel nhập trực tiếp · PDF dùng AI đọc tự động</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.pdf,image/*" onChange={onFileChange} className="hidden" />
          </div>

          {error && <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</div>}

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2 text-green-400 font-medium text-sm">
                <FileSpreadsheet size={15} /> Excel template
              </div>
              <p className="text-xs text-gray-500">Cột bắt buộc: MA_TAI_SAN*, HANG*, MODEL*<br/>Cột tự nhận diện: LOAI_THIET_BI, SO_LUONG</p>
              <p className="text-xs text-blue-400 mt-2">Nếu không có LOAI_THIET_BI — AI tự phân loại theo tên</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2 text-purple-400 font-medium text-sm">
                <Sparkles size={15} /> PDF báo giá / biên bản
              </div>
              <p className="text-xs text-gray-500">AI tự đọc: nhà cung cấp, danh sách thiết bị,<br/>số lượng, đơn giá, người nhận (nếu có)</p>
              <p className="text-xs text-blue-400 mt-2">Tự tìm nhân viên từ tên trong tài liệu</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Excel preview ── */}
      {mode === 'excel-preview' && (
        <div className="space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-center gap-3">
            <FileSpreadsheet size={20} className="text-blue-400 shrink-0" />
            <div className="flex-1">
              <div className="font-medium text-blue-300">{fileName}</div>
              <div className="text-sm text-blue-400/70">Tìm thấy <strong>{excelRows.length}</strong> thiết bị hợp lệ</div>
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="px-4 py-3 text-left font-medium">#</th>
                  <th className="px-4 py-3 text-left font-medium">Mã tài sản</th>
                  <th className="px-4 py-3 text-left font-medium">Loại</th>
                  <th className="px-4 py-3 text-left font-medium">Hãng / Model</th>
                  <th className="px-4 py-3 text-left font-medium">SL</th>
                  <th className="px-4 py-3 text-left font-medium">Giá</th>
                </tr>
              </thead>
              <tbody>
                {excelRows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-800/50">
                    <td className="px-4 py-2.5 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-2.5 font-mono text-blue-400">{row.ma_tai_san}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-300">
                        {CATEGORY_LABEL[resolveCategory(row.loai_thiet_bi, row.hang, row.model)] || 'Khác'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-white">{row.hang}</span>
                      <span className="text-gray-400 ml-1 text-xs">{row.model}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-300">{row.so_luong || 1}</td>
                    <td className="px-4 py-2.5 text-gray-300 text-xs">
                      {row.gia_mua_vnd ? parseInt(row.gia_mua_vnd.replace(/\D/g, '')).toLocaleString('vi-VN') + ' ₫' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3">
            <button onClick={handleExcelImport} disabled={importing}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
              <Upload size={16} />
              {importing ? 'Đang nhập...' : `Nhập ${excelRows.length} thiết bị`}
            </button>
            <button onClick={reset} className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-400 border border-gray-700 hover:border-gray-500 transition-colors">
              Chọn file khác
            </button>
          </div>
        </div>
      )}

      {/* ── Excel done ── */}
      {mode === 'excel-done' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <StatCard icon={<CheckCircle size={28} />} color="green" value={successCount} label="Nhập thành công" />
            <StatCard icon={<AlertTriangle size={28} />} color="yellow" value={skipCount} label="Cộng vào tồn kho" />
            <StatCard icon={<XCircle size={28} />} color="red" value={errorCount} label="Lỗi" />
          </div>
          {results.filter(r => r.status !== 'success').length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 text-sm font-medium text-gray-400">Chi tiết</div>
              {results.filter(r => r.status !== 'success').map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-800/50">
                  {r.status === 'skip' ? <AlertTriangle size={14} className="text-yellow-400 shrink-0" /> : <XCircle size={14} className="text-red-400 shrink-0" />}
                  <span className="font-mono text-xs text-gray-300">Dòng {r.row} — {r.asset_code}</span>
                  <span className="text-xs text-gray-500 ml-auto">{r.message}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => router.push('/dashboard/devices')} className="bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
              Xem danh sách thiết bị
            </button>
            <button onClick={reset} className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-400 border border-gray-700 hover:border-gray-500 transition-colors">
              Import thêm
            </button>
          </div>
        </div>
      )}

      {/* ── PDF loading ── */}
      {mode === 'pdf-loading' && (
        <div className="text-center py-20">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-300 font-medium">AI đang đọc báo giá...</p>
          <p className="text-gray-500 text-sm mt-1">{fileName}</p>
        </div>
      )}

      {/* ── PDF review ── */}
      {mode === 'pdf-review' && pdfData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-semibold mb-3 flex items-center gap-2 text-sm"><Building2 size={15} className="text-blue-400" /> Nhà cung cấp</h2>
              <div className="text-sm space-y-1">
                <div className="text-white font-medium">{pdfData.nha_cung_cap.ten || '—'}</div>
                <div className="text-gray-400 text-xs">{pdfData.nha_cung_cap.dia_chi}</div>
                {pdfData.nha_cung_cap.ma_so_thue && <div className="text-gray-500 font-mono text-xs">MST: {pdfData.nha_cung_cap.ma_so_thue}</div>}
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-semibold mb-3 flex items-center gap-2 text-sm"><Calendar size={15} className="text-purple-400" /> Thông tin mua</h2>
              <div className="text-sm space-y-1">
                {pdfData.thong_tin_mua.so_bao_gia && <div className="text-gray-300">Số BG: <span className="font-mono">{pdfData.thong_tin_mua.so_bao_gia}</span></div>}
                {pdfData.thong_tin_mua.ngay_bao_gia && <div className="text-gray-400 text-xs">Ngày: {pdfData.thong_tin_mua.ngay_bao_gia}</div>}
                {pdfData.thong_tin_mua.don_vi_mua && <div className="text-gray-400 text-xs">Đơn vị: {pdfData.thong_tin_mua.don_vi_mua}</div>}
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Sparkles size={15} className="text-yellow-400" /> Thiết bị ({pdfData.thiet_bi.length} loại)
              </h2>
              {assignedCount > 0 && (
                <span className="text-xs bg-green-500/20 text-green-400 px-2.5 py-1 rounded-full">
                  {assignedCount} thiết bị đã gán nhân viên
                </span>
              )}
            </div>
            <div className="space-y-3">
              {pdfData.thiet_bi.map((dev, i) => (
                <div key={i} className={`border rounded-xl p-4 transition-colors ${dev.selected ? 'border-blue-500/40 bg-blue-500/5' : 'border-gray-700 opacity-50'}`}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={dev.selected} onChange={() => togglePdfDevice(i)} className="mt-1 w-4 h-4 accent-blue-500 cursor-pointer" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium">{dev.hang} {dev.model}</span>
                        <span className="text-xs bg-blue-600/20 text-blue-300 px-2 py-0.5 rounded">{CATEGORY_LABEL[dev.loai_thiet_bi] || dev.loai_thiet_bi}</span>
                        <span className="text-xs text-gray-400">x{dev.so_luong}</span>
                        {dev.don_gia > 0 && <span className="text-xs text-green-400 ml-auto">{dev.don_gia.toLocaleString('vi-VN')} ₫/cái</span>}
                      </div>
                      <div className="text-xs text-gray-400 space-x-3 mb-2">
                        {dev.cpu && <span>CPU: {dev.cpu}</span>}
                        {dev.ram && <span>RAM: {dev.ram}</span>}
                        {dev.o_cung && <span>SSD: {dev.o_cung}</span>}
                        {dev.kich_thuoc_man_hinh && <span>Size: {dev.kich_thuoc_man_hinh}</span>}
                      </div>

                      {/* ── Smart Assign ── */}
                      {dev.selected && (
                        <div className="mt-2 border-t border-gray-700/50 pt-2">
                          <div className="flex items-center gap-2 mb-1.5">
                            <User size={12} className="text-gray-500" />
                            <span className="text-xs text-gray-500">Cấp cho nhân viên:</span>
                          </div>
                          <EmployeeAssign
                            allEmployees={allEmployees}
                            value={dev.assignee}
                            onChange={emp => setDeviceAssignee(i, emp)}
                          />
                        </div>
                      )}

                      {dev.selected && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {dev.asset_codes.map((code, ci) => (
                            <input key={ci} type="text" value={code}
                              onChange={e => updateAssetCode(i, ci, e.target.value)}
                              placeholder={`Mã #${ci + 1}`}
                              className="w-40 bg-gray-800 border border-gray-600 rounded px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500" />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {pdfData.tong_cong > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-2">
              <DollarSign size={16} className="text-green-400" />
              <span className="text-gray-400 text-sm">Tổng cộng:</span>
              <span className="font-bold text-green-400 ml-auto">{pdfData.tong_cong.toLocaleString('vi-VN')} ₫</span>
            </div>
          )}

          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</div>}

          <div className="flex gap-3">
            <button onClick={handlePdfSave} disabled={pdfSaving || !pdfData.thiet_bi.some(d => d.selected)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
              <CheckCircle size={16} />
              {pdfSaving ? 'Đang lưu...' : `Lưu ${pdfData.thiet_bi.filter(d => d.selected).reduce((s, d) => s + d.so_luong, 0)} thiết bị${assignedCount > 0 ? ` (${assignedCount} có gán NV)` : ''}`}
            </button>
            <button onClick={reset} className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-400 border border-gray-700 hover:border-gray-500 transition-colors">
              Upload lại
            </button>
          </div>
        </div>
      )}

      {/* ── PDF done ── */}
      {mode === 'pdf-done' && (
        <div className="text-center py-16">
          <CheckCircle size={56} className="mx-auto text-green-400 mb-4" />
          <h2 className="text-xl font-bold mb-2">Nhập thành công!</h2>
          <div className="flex gap-3 justify-center mt-6">
            <button onClick={() => router.push('/dashboard/devices')} className="bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-lg text-sm font-medium">
              Xem danh sách thiết bị
            </button>
            <button onClick={reset} className="border border-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white">
              Import thêm
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, color, value, label }: { icon: React.ReactNode; color: string; value: number; label: string }) {
  const cls: Record<string, string> = {
    green: 'bg-green-500/10 border-green-500/30 text-green-400',
    yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    red: 'bg-red-500/10 border-red-500/30 text-red-400',
  }
  return (
    <div className={`border rounded-xl p-5 text-center ${cls[color]}`}>
      <div className="mx-auto mb-2 w-fit">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  )
}
