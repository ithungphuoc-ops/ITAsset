import { NextRequest, NextResponse } from 'next/server'
import { findEmployeeByEmail } from '@/lib/firestore/employees'
import { listActiveAssignmentsForEmployee } from '@/lib/firestore/assignments'
import { getDeviceById } from '@/lib/firestore/devices'
import { getSession, hasDashboardAccess } from '@/lib/session'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ devices: [] })

  // Chỉ cho xem thiết bị của chính mình, trừ khi có quyền dashboard (admin/it_staff/viewer).
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  if (session.email !== email && !hasDashboardAccess(session)) {
    return NextResponse.json({ error: 'Không có quyền xem dữ liệu này' }, { status: 403 })
  }

  const employee = await findEmployeeByEmail(email)
  if (!employee) return NextResponse.json({ devices: [], employee_code: null })

  const assignments = await listActiveAssignmentsForEmployee(employee.id)
  const devices = (
    await Promise.all(
      assignments.map(async (a) => {
        const device = await getDeviceById(a.deviceId)
        if (!device) return null
        return {
          id: device.id,
          brand: device.brand,
          model: device.model,
          asset_code: device.assetCode,
          category: device.category,
          serial_number: device.serialNumber,
          status: device.status,
          assigned_date: a.assignedDate,
        }
      }),
    )
  ).filter(Boolean)

  return NextResponse.json({ devices, employee_code: employee.employeeCode })
}
