import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { devices, thong_tin_mua, nha_cung_cap } = await req.json()
    const saved: string[] = []
    const errors: string[] = []

    for (let idx = 0; idx < devices.length; idx++) {
      const dev = devices[idx]
      const { category, hang, model, don_gia, cpu, ram, o_cung, man_hinh, he_dieu_hanh, kich_thuoc_man_hinh, do_phan_giai, employee_id } = dev

      const asset_code = (dev.asset_code && !saved.includes(dev.asset_code))
        ? dev.asset_code
        : `IT-${Date.now()}-${idx}`
      const qr_code = `ITASSET-${asset_code}-${Date.now()}`

      let purchase_date: string | null = null
      if (thong_tin_mua?.ngay_bao_gia) {
        const parts = thong_tin_mua.ngay_bao_gia.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
        if (parts) purchase_date = `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
      }

      const { data: device, error } = await supabase.from('devices').insert({
        asset_code,
        category: category || 'other',
        brand: hang || 'N/A',
        model: model || 'N/A',
        purchase_date,
        purchase_price: don_gia || null,
        notes: `Nhập từ báo giá ${thong_tin_mua?.so_bao_gia || ''} - NCC: ${nha_cung_cap?.ten || ''}`,
        qr_code,
        status: employee_id ? 'in_use' : 'in_stock',
      }).select().single()

      if (error) {
        errors.push(`${asset_code}: ${error.message}`)
        continue
      }

      if (device) {
        if (category === 'laptop' && (cpu || ram || o_cung)) {
          await supabase.from('device_laptop_specs').insert({
            device_id: device.id,
            cpu: cpu || null, ram: ram || null,
            storage: o_cung || null, display: man_hinh || null,
            os: he_dieu_hanh || null,
          })
        }
        if (category === 'monitor' && (kich_thuoc_man_hinh || do_phan_giai)) {
          await supabase.from('device_monitor_specs').insert({
            device_id: device.id,
            screen_size: kich_thuoc_man_hinh || null,
            resolution: do_phan_giai || null,
          })
        }

        // Tạo assignment nếu có employee_id
        if (employee_id) {
          await supabase.from('assignments').insert({
            device_id: device.id,
            employee_id,
            assigned_date: new Date().toISOString().split('T')[0],
            is_active: true,
            quantity: 1,
          })
        }

        saved.push(asset_code)
      }
    }

    return NextResponse.json({ success: true, saved: saved.length, errors })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Lỗi không xác định'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
