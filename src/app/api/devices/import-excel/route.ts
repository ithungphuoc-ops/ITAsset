import { NextRequest, NextResponse } from 'next/server'
import { listAllDevices, createDevice, updateDevice } from '@/lib/firestore/devices'
import { requireWriteAccess } from '@/lib/session'

interface ExcelRow {
  ma_tai_san: string
  hang: string
  model: string
  serial_number?: string
  ngay_mua?: string
  gia_mua_vnd?: string
  bao_hanh_den?: string
  ghi_chu?: string
  so_luong?: string
  loai_thiet_bi?: string
  cpu?: string
  ram?: string
  o_cung?: string
  man_hinh_laptop?: string
  he_dieu_hanh?: string
  gpu?: string
  kich_thuoc_man_hinh?: string
  do_phan_giai?: string
  tam_nen?: string
  tan_so_quet?: string
}

interface ImportResult {
  row: number
  asset_code: string
  status: 'success' | 'skip' | 'error'
  message: string
}

export async function POST(req: NextRequest) {
  try {
    await requireWriteAccess()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 })
  }

  const { rows, category: resolvedCategories } = (await req.json()) as {
    rows: ExcelRow[]
    category: string[] // category đã resolve sẵn phía client (autoClassify/resolveCategory), cùng thứ tự với rows
  }

  const existingDevices = await listAllDevices()
  const byBrandModel = new Map(
    existingDevices.map((d) => [`${d.brand.toLowerCase()}|${d.model.toLowerCase()}`, d]),
  )

  const results: ImportResult[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const category = (resolvedCategories?.[i] || 'other') as import('@/lib/firestore/types').DeviceCategory
    const qty = parseInt(row.so_luong || '1') || 1

    try {
      const key = `${row.hang.toLowerCase()}|${row.model.toLowerCase()}`
      const existing = byBrandModel.get(key)

      if (existing) {
        await updateDevice(existing.id, { quantity: (existing.quantity || 1) + qty })
        existing.quantity = (existing.quantity || 1) + qty
        results.push({ row: i + 1, asset_code: row.ma_tai_san, status: 'skip', message: `Trùng sản phẩm — đã cộng thêm x${qty} vào tồn kho` })
        continue
      }

      const laptopSpecs = category === 'laptop' && (row.cpu || row.ram || row.o_cung)
        ? { cpu: row.cpu || null, ram: row.ram || null, storage: row.o_cung || null, display: row.man_hinh_laptop || null, os: row.he_dieu_hanh || null, gpu: row.gpu || null, mainBoard: null, powerSupply: null }
        : null
      const monitorSpecs = category === 'monitor' && (row.kich_thuoc_man_hinh || row.do_phan_giai)
        ? { screenSize: row.kich_thuoc_man_hinh || null, resolution: row.do_phan_giai || null, panelType: row.tam_nen || null, refreshRate: row.tan_so_quet || null }
        : null

      const device = await createDevice({
        assetCode: row.ma_tai_san,
        category,
        brand: row.hang,
        model: row.model,
        serialNumber: row.serial_number || null,
        purchaseDate: row.ngay_mua || null,
        purchasePrice: row.gia_mua_vnd ? parseInt(row.gia_mua_vnd.replace(/\D/g, '')) : null,
        warrantyExpiry: row.bao_hanh_den || null,
        notes: row.ghi_chu || null,
        quantity: qty,
        laptopSpecs,
        monitorSpecs,
      })
      byBrandModel.set(key, device)

      results.push({ row: i + 1, asset_code: row.ma_tai_san, status: 'success', message: `Nhập thành công (x${qty})` })
    } catch (err) {
      results.push({ row: i + 1, asset_code: row.ma_tai_san, status: 'error', message: err instanceof Error ? err.message : 'Lỗi' })
    }
  }

  return NextResponse.json({ results })
}
