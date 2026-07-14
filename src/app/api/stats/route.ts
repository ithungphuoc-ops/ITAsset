import { NextResponse } from 'next/server'
import { listAllDevices } from '@/lib/firestore/devices'
import { listActiveEmployees } from '@/lib/firestore/employees'
import { listRecentAssignments, toAssignmentJson } from '@/lib/firestore/assignments'
import { requireSession } from '@/lib/session'

export async function GET() {
  try {
    await requireSession()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 })
  }

  const [devices, employees, recentAssignments] = await Promise.all([
    listAllDevices(),
    listActiveEmployees(),
    listRecentAssignments(8),
  ])

  const byCategory = (cat: string) => devices.filter((d) => d.category === cat).length

  const stats = {
    total: devices.length,
    in_use: devices.filter((d) => d.status === 'in_use').length,
    in_stock: devices.filter((d) => d.status === 'in_stock').length,
    broken: devices.filter((d) => d.status === 'broken').length,
    employees: employees.length,
    laptop: byCategory('laptop'), monitor: byCategory('monitor'), pc: byCategory('pc'),
    printer: byCategory('printer'), networking: byCategory('networking'),
    component: byCategory('component'), ups: byCategory('ups'),
    peripheral: byCategory('peripheral'), other: byCategory('other'),
  }

  const assignments = await Promise.all(
    recentAssignments.map((a) => toAssignmentJson(a, { withDevice: true })),
  )

  return NextResponse.json({ stats, assignments })
}
