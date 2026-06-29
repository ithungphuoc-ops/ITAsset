import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET() {
  const { data: devices } = await supabase
    .from('devices')
    .select('*, laptop_specs:device_laptop_specs(*), monitor_specs:device_monitor_specs(*), assignments!inner(is_active, employee:employees(full_name, employee_code, department:departments(name)))')
    .order('asset_code')

  const { data: allDevices } = await supabase
    .from('devices')
    .select(`
      asset_code, category, brand, model, serial_number, status,
      purchase_date, purchase_price, warranty_expiry, notes,
      laptop_specs:device_laptop_specs(cpu, ram, storage, os, gpu, display),
      monitor_specs:device_monitor_specs(screen_size, resolution, panel_type, refresh_rate),
      assignments(is_active, assigned_date, employee:employees(full_name, employee_code, department:departments(name)))
    `)
    .order('asset_code')

  const CATEGORY: Record<string, string> = {
    laptop: 'Laptop', monitor: 'Màn hình', pc: 'PC', peripheral: 'Phụ kiện',
    printer: 'Máy in', networking: 'Mạng', component: 'Linh kiện', ups: 'UPS', other: 'Khác',
  }
  const STATUS: Record<string, string> = {
    in_use: 'Đang dùng', in_stock: 'Trong kho', broken: 'Hỏng', liquidated: 'Thanh lý',
  }

  type SpecRow = Record<string, string>
  type DeviceRow = {
    asset_code: string; category: string; brand: string; model: string
    serial_number?: string; status: string; purchase_date?: string
    purchase_price?: number; warranty_expiry?: string; notes?: string
    laptop_specs?: SpecRow[] | SpecRow | null
    monitor_specs?: SpecRow[] | SpecRow | null
    assignments?: Array<{ is_active: boolean; assigned_date: string; employee?: { full_name: string; employee_code: string; department?: { name: string } } }>
  }

  const rows = ((allDevices || []) as unknown as DeviceRow[]).map(d => {
    const active = d.assignments?.find(a => a.is_active)
    const ls = (Array.isArray(d.laptop_specs) ? d.laptop_specs[0] : d.laptop_specs) as SpecRow | null
    const ms = (Array.isArray(d.monitor_specs) ? d.monitor_specs[0] : d.monitor_specs) as SpecRow | null
    return {
      'Mã tài sản': d.asset_code,
      'Loại': CATEGORY[d.category] || d.category,
      'Hãng': d.brand,
      'Model': d.model,
      'Serial': d.serial_number || '',
      'Trạng thái': STATUS[d.status] || d.status,
      'Ngày mua': d.purchase_date ? new Date(d.purchase_date).toLocaleDateString('vi-VN') : '',
      'Giá mua (VNĐ)': d.purchase_price || '',
      'Bảo hành đến': d.warranty_expiry ? new Date(d.warranty_expiry).toLocaleDateString('vi-VN') : '',
      'Người sử dụng': active?.employee?.full_name || '',
      'Mã NV': active?.employee?.employee_code || '',
      'Phòng ban': active?.employee?.department?.name || '',
      'Ngày cấp': active?.assigned_date ? new Date(active.assigned_date).toLocaleDateString('vi-VN') : '',
      'CPU': ls?.cpu || '',
      'RAM': ls?.ram || '',
      'Ổ cứng': ls?.storage || '',
      'Màn hình': ls?.display || ms?.screen_size || '',
      'HĐH': ls?.os || '',
      'GPU': ls?.gpu || '',
      'Ghi chú': d.notes || '',
    }
  })

  const ws = XLSX.utils.json_to_sheet(rows)

  // Column widths
  ws['!cols'] = [
    { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 16 },
    { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 22 },
    { wch: 10 }, { wch: 24 }, { wch: 12 }, { wch: 22 }, { wch: 10 },
    { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 20 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Danh sách thiết bị')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const today = new Date().toISOString().split('T')[0]

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="ThietBi_ITAsset_${today}.xlsx"`,
    },
  })
}
