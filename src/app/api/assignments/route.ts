import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { sendAssignmentEmail } from '@/lib/mailer'
import { assignDevice, closeActiveAssignment } from '@/lib/firestore/assignments'
import { getDeviceById } from '@/lib/firestore/devices'
import { getEmployeeById, toEmployeeJson } from '@/lib/firestore/employees'
import { requireWriteAccess } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    await requireWriteAccess()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 })
  }

  try {
    const { device_id, employee_id, notes, quantity = 1 } = await req.json()

    await assignDevice({ deviceId: device_id, employeeId: employee_id, notes, quantity })

    // Gửi email nếu nhân viên có email (không chặn nếu gửi lỗi, chỉ log)
    try {
      const device = await getDeviceById(device_id)
      const employee = await getEmployeeById(employee_id)
      const employeeJson = employee ? await toEmployeeJson(employee) : null

      if (device && employeeJson?.email) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.startsWith('http://localhost')
          ? 'https://it-asset-pi.vercel.app'
          : (process.env.NEXT_PUBLIC_APP_URL || 'https://it-asset-pi.vercel.app')
        const qrUrl = `${baseUrl}/device/${device.qrCode}`
        const qrImageBase64 = await QRCode.toDataURL(qrUrl, {
          width: 300, margin: 2,
          color: { dark: '#1d4ed8', light: '#ffffff' },
        })

        await sendAssignmentEmail({
          toEmail: employeeJson.email,
          toName: employeeJson.full_name,
          deviceBrand: device.brand,
          deviceModel: device.model,
          deviceCategory: device.category,
          assetCode: device.assetCode,
          assignedDate: new Date().toLocaleDateString('vi-VN'),
          qrImageBase64,
          notes: notes || undefined,
        })
      }
    } catch (mailErr) {
      console.error('Email error:', mailErr)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireWriteAccess()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 })
  }

  try {
    const { device_id, new_status, notes } = await req.json()
    await closeActiveAssignment({
      deviceId: device_id,
      newStatus: new_status,
      notes: notes || null,
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
