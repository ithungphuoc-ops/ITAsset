import { NextRequest, NextResponse } from 'next/server'
import { listAllDevices, toDeviceJson } from '@/lib/firestore/devices'
import { listAllActiveAssignments } from '@/lib/firestore/assignments'
import { getEmployeeById } from '@/lib/firestore/employees'
import { requireSession } from '@/lib/session'

function normalize(s: string) {
  return s.toLowerCase()
}

export async function GET(req: NextRequest) {
  try {
    await requireSession()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const status = searchParams.get('status') || ''

    let devices = await listAllDevices()

    if (category) devices = devices.filter((d) => d.category === category)
    if (status) devices = devices.filter((d) => d.status === status)
    if (search) {
      const q = normalize(search)
      devices = devices.filter((d) =>
        normalize(d.assetCode).includes(q) ||
        normalize(d.serialNumber || '').includes(q) ||
        normalize(d.brand).includes(q) ||
        normalize(d.model).includes(q),
      )
    }

    const activeAssignments = await listAllActiveAssignments()
    const activeByDevice = new Map<string, typeof activeAssignments>()
    for (const a of activeAssignments) {
      const list = activeByDevice.get(a.deviceId) ?? []
      list.push(a)
      activeByDevice.set(a.deviceId, list)
    }

    const enriched = await Promise.all(
      devices.map(async (d) => {
        const active = activeByDevice.get(d.id) ?? []
        const in_use = active.reduce((s, a) => s + (a.quantity || 1), 0)
        const total = d.quantity || 1
        const assignees = (
          await Promise.all(active.map((a) => getEmployeeById(a.employeeId)))
        )
          .filter((e) => !!e)
          .map((e) => ({ id: e!.id, full_name: e!.fullName }))

        return {
          ...toDeviceJson(d),
          quantity_in_use: in_use,
          quantity_in_stock: Math.max(0, total - in_use),
          assignees,
        }
      }),
    )

    return NextResponse.json({ data: enriched })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
