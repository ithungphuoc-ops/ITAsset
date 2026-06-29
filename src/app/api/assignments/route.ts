import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendAssignmentEmail } from '@/lib/mailer'
import QRCode from 'qrcode'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { device_id, employee_id, notes, quantity = 1 } = await req.json()

    // Thu hồi assignment cũ nếu có
    await supabase.from('assignments')
      .update({ is_active: false, returned_date: new Date().toISOString().split('T')[0] })
      .eq('device_id', device_id).eq('is_active', true)

    // Tạo assignment mới
    const { error } = await supabase.from('assignments').insert({
      device_id, employee_id,
      assigned_date: new Date().toISOString().split('T')[0],
      is_active: true,
      notes: notes || null,
      quantity: quantity || 1,
    })
    if (error) throw error

    // Cập nhật trạng thái thiết bị
    await supabase.from('devices').update({ status: 'in_use' }).eq('id', device_id)

    // Gửi email nếu nhân viên có email
    try {
      const [{ data: device }, { data: employee }] = await Promise.all([
        supabase.from('devices').select('*').eq('id', device_id).single(),
        supabase.from('employees').select('*, department:departments(name)').eq('id', employee_id).single(),
      ])

      if (device && employee?.email) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const qrUrl = `${baseUrl}/device/${device.qr_code}`
        const qrImageBase64 = await QRCode.toDataURL(qrUrl, {
          width: 300, margin: 2,
          color: { dark: '#1d4ed8', light: '#ffffff' },
        })

        await sendAssignmentEmail({
          toEmail: employee.email,
          toName: employee.full_name,
          deviceBrand: device.brand,
          deviceModel: device.model,
          deviceCategory: device.category,
          assetCode: device.asset_code,
          assignedDate: new Date().toLocaleDateString('vi-VN'),
          qrImageBase64,
          notes: notes || undefined,
        })
      }
    } catch (mailErr) {
      // Không block nếu gửi mail lỗi, chỉ log
      console.error('Email error:', mailErr)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { device_id, new_status, notes } = await req.json()

    await supabase.from('assignments')
      .update({ is_active: false, returned_date: new Date().toISOString().split('T')[0], notes: notes || null })
      .eq('device_id', device_id).eq('is_active', true)

    await supabase.from('devices').update({ status: new_status }).eq('id', device_id)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
