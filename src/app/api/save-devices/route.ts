import { NextRequest, NextResponse } from 'next/server'
import { createDevice, findDeviceByAssetCode } from '@/lib/firestore/devices'
import { assignDevice } from '@/lib/firestore/assignments'
import { requireWriteAccess } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    await requireWriteAccess()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 })
  }

  try {
    const { devices, thong_tin_mua, nha_cung_cap } = await req.json()
    const saved: string[] = []
    const errors: string[] = []

    for (let idx = 0; idx < devices.length; idx++) {
      const dev = devices[idx]
      const { category, hang, model, don_gia, cpu, ram, o_cung, man_hinh, he_dieu_hanh, kich_thuoc_man_hinh, do_phan_giai, employee_id } = dev

      const wantedCode = dev.asset_code
      const asset_code = (wantedCode && !saved.includes(wantedCode) && !(await findDeviceByAssetCode(wantedCode)))
        ? wantedCode
        : `IT-${Date.now()}-${idx}`

      let purchase_date: string | null = null
      if (thong_tin_mua?.ngay_bao_gia) {
        const parts = thong_tin_mua.ngay_bao_gia.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
        if (parts) purchase_date = `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
      }

      try {
        const laptopSpecs = category === 'laptop' && (cpu || ram || o_cung)
          ? { cpu: cpu || null, ram: ram || null, storage: o_cung || null, display: man_hinh || null, os: he_dieu_hanh || null, gpu: null, mainBoard: null, powerSupply: null }
          : null
        const monitorSpecs = category === 'monitor' && (kich_thuoc_man_hinh || do_phan_giai)
          ? { screenSize: kich_thuoc_man_hinh || null, resolution: do_phan_giai || null, panelType: null, refreshRate: null }
          : null

        const device = await createDevice({
          assetCode: asset_code,
          category: category || 'other',
          brand: hang || 'N/A',
          model: model || 'N/A',
          purchaseDate: purchase_date,
          purchasePrice: don_gia || null,
          notes: `Nhập từ báo giá ${thong_tin_mua?.so_bao_gia || ''} - NCC: ${nha_cung_cap?.ten || ''}`,
          status: employee_id ? 'in_use' : 'in_stock',
          laptopSpecs,
          monitorSpecs,
        })

        if (employee_id) {
          await assignDevice({ deviceId: device.id, employeeId: employee_id, quantity: 1 })
        }

        saved.push(asset_code)
      } catch (e) {
        errors.push(`${asset_code}: ${(e as Error).message}`)
      }
    }

    return NextResponse.json({ success: true, saved: saved.length, errors })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Lỗi không xác định'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
