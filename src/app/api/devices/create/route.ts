import { NextRequest, NextResponse } from 'next/server'
import { createDevice, findDeviceByAssetCode, toDeviceJson } from '@/lib/firestore/devices'
import { requireWriteAccess } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    await requireWriteAccess()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 })
  }

  const body = await req.json()
  const {
    asset_code, category, brand, model,
    serial_number, purchase_date, purchase_price,
    warranty_expiry, notes, laptopSpecs, monitorSpecs, pcSpecs,
  } = body

  if (!asset_code || !category || !brand || !model) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
  }

  if (await findDeviceByAssetCode(asset_code)) {
    return NextResponse.json({ error: `Mã tài sản "${asset_code}" đã tồn tại` }, { status: 400 })
  }

  const hasValue = (specs: Record<string, unknown> | undefined) =>
    !!specs && Object.values(specs).some((v) => v)

  const device = await createDevice({
    assetCode: asset_code,
    category,
    brand,
    model,
    serialNumber: serial_number || null,
    purchaseDate: purchase_date || null,
    purchasePrice: purchase_price ? parseInt(purchase_price) : null,
    warrantyExpiry: warranty_expiry || null,
    notes: notes || null,
    status: 'in_stock',
    laptopSpecs: hasValue(laptopSpecs) ? laptopSpecs : hasValue(pcSpecs) ? pcSpecs : null,
    monitorSpecs: hasValue(monitorSpecs) ? monitorSpecs : null,
  })

  return NextResponse.json({ data: toDeviceJson(device) })
}
