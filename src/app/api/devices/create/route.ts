import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    asset_code, category, brand, model,
    serial_number, purchase_date, purchase_price,
    warranty_expiry, notes, laptopSpecs, monitorSpecs, pcSpecs,
  } = body

  if (!asset_code || !category || !brand || !model) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
  }

  const qr_code = `ITASSET-${asset_code}-${Date.now()}`

  const { data: device, error: devErr } = await supabase
    .from('devices')
    .insert({
      asset_code,
      category,
      brand,
      model,
      serial_number: serial_number || null,
      purchase_date: purchase_date || null,
      purchase_price: purchase_price ? parseInt(purchase_price) : null,
      warranty_expiry: warranty_expiry || null,
      notes: notes || null,
      qr_code,
      status: 'in_stock',
    })
    .select()
    .single()

  if (devErr) return NextResponse.json({ error: devErr.message }, { status: 400 })

  if (laptopSpecs && Object.values(laptopSpecs).some(v => v)) {
    await supabase.from('device_laptop_specs').insert({ device_id: device.id, ...laptopSpecs })
  }
  if (monitorSpecs && Object.values(monitorSpecs).some(v => v)) {
    await supabase.from('device_monitor_specs').insert({ device_id: device.id, ...monitorSpecs })
  }
  if (pcSpecs && Object.values(pcSpecs).some(v => v)) {
    await supabase.from('device_laptop_specs').insert({ device_id: device.id, ...pcSpecs })
  }

  return NextResponse.json({ data: device })
}
