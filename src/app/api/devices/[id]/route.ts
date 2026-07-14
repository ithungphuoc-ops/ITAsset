import { NextRequest, NextResponse } from 'next/server'
import {
  getDeviceById,
  updateDevice,
  deleteDevice,
  toDeviceJson,
} from '@/lib/firestore/devices'
import {
  getActiveAssignmentForDevice,
  deleteAllAssignmentsForDevice,
  listAssignmentsForDevice,
  toAssignmentJson,
} from '@/lib/firestore/assignments'
import { requireSession, requireWriteAccess } from '@/lib/session'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession()
    const { id } = await params
    const device = await getDeviceById(id)
    if (!device) return NextResponse.json({ error: 'Không tìm thấy thiết bị' }, { status: 404 })

    const [active, history] = await Promise.all([
      getActiveAssignmentForDevice(id),
      listAssignmentsForDevice(id),
    ])
    return NextResponse.json({
      data: toDeviceJson(device),
      active_assignment: active ? await toAssignmentJson(active) : null,
      assignments: await Promise.all(history.map((a) => toAssignmentJson(a))),
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireWriteAccess()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const { laptop_specs, monitor_specs, asset_code, serial_number, purchase_date, purchase_price, warranty_expiry, image_url, ...rest } = body

    await updateDevice(id, {
      ...rest,
      ...(serial_number !== undefined ? { serialNumber: serial_number } : {}),
      ...(purchase_date !== undefined ? { purchaseDate: purchase_date } : {}),
      ...(purchase_price !== undefined ? { purchasePrice: purchase_price } : {}),
      ...(warranty_expiry !== undefined ? { warrantyExpiry: warranty_expiry } : {}),
      ...(image_url !== undefined ? { imageUrl: image_url } : {}),
      ...(laptop_specs ? { laptopSpecs: laptop_specs } : {}),
      ...(monitor_specs ? { monitorSpecs: monitor_specs } : {}),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireWriteAccess()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 })
  }

  try {
    const { id } = await params
    const active = await getActiveAssignmentForDevice(id)
    if (active) return NextResponse.json({ error: 'Thiết bị đang được cấp phát, không thể xóa' }, { status: 400 })

    await deleteAllAssignmentsForDevice(id)
    await deleteDevice(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
