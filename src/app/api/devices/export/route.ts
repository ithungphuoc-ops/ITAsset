import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { listAllDevices } from '@/lib/firestore/devices'
import { listAllActiveAssignments } from '@/lib/firestore/assignments'
import { getEmployeeById, toEmployeeJson } from '@/lib/firestore/employees'
import { requireSession } from '@/lib/session'

const CATEGORY: Record<string, string> = {
  laptop: 'Laptop', monitor: 'Màn hình', pc: 'PC', peripheral: 'Phụ kiện',
  printer: 'Máy in', networking: 'Mạng', component: 'Linh kiện', ups: 'UPS', other: 'Khác',
}
const STATUS: Record<string, string> = {
  in_use: 'Đang dùng', in_stock: 'Trong kho', broken: 'Hỏng', liquidated: 'Thanh lý',
}

export async function GET() {
  try {
    await requireSession()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 })
  }

  const devices = await listAllDevices()
  const activeAssignments = await listAllActiveAssignments()
  const activeByDevice = new Map(activeAssignments.map((a) => [a.deviceId, a]))

  const rows = await Promise.all(
    devices.map(async (d) => {
      const active = activeByDevice.get(d.id)
      const employee = active ? await getEmployeeById(active.employeeId) : null
      const employeeJson = employee ? await toEmployeeJson(employee) : null
      const ls = d.laptopSpecs
      const ms = d.monitorSpecs

      return {
        'Mã tài sản': d.assetCode,
        'Loại': CATEGORY[d.category] || d.category,
        'Hãng': d.brand,
        'Model': d.model,
        'Serial': d.serialNumber || '',
        'Trạng thái': STATUS[d.status] || d.status,
        'Ngày mua': d.purchaseDate ? new Date(d.purchaseDate).toLocaleDateString('vi-VN') : '',
        'Giá mua (VNĐ)': d.purchasePrice || '',
        'Bảo hành đến': d.warrantyExpiry ? new Date(d.warrantyExpiry).toLocaleDateString('vi-VN') : '',
        'Người sử dụng': employeeJson?.full_name || '',
        'Mã NV': employeeJson?.employee_code || '',
        'Phòng ban': employeeJson?.department?.name || '',
        'Ngày cấp': active?.assignedDate ? new Date(active.assignedDate).toLocaleDateString('vi-VN') : '',
        'CPU': ls?.cpu || '',
        'RAM': ls?.ram || '',
        'Ổ cứng': ls?.storage || '',
        'Màn hình': ls?.display || ms?.screenSize || '',
        'HĐH': ls?.os || '',
        'GPU': ls?.gpu || '',
        'Ghi chú': d.notes || '',
      }
    }),
  )

  const ws = XLSX.utils.json_to_sheet(rows)
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
