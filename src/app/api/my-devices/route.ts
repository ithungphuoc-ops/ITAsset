import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ devices: [] })

  // Tìm nhân viên theo email
  const { data: employee } = await supabase
    .from('employees')
    .select('id, employee_code')
    .eq('email', email)
    .single()

  if (!employee) return NextResponse.json({ devices: [], employee_code: null })

  // Lấy thiết bị đang cấp phát cho nhân viên này
  const { data: assignments } = await supabase
    .from('assignments')
    .select('assigned_date, device:devices(id, brand, model, asset_code, category, serial_number, status)')
    .eq('employee_id', employee.id)
    .eq('is_active', true)

  const devices = (assignments || []).map((a: any) => ({
    ...a.device,
    assigned_date: a.assigned_date,
  }))

  return NextResponse.json({ devices, employee_code: employee.employee_code })
}
