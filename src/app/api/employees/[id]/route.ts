import { NextRequest, NextResponse } from 'next/server'
import { getEmployeeById, updateEmployee, deactivateEmployee, toEmployeeJson } from '@/lib/firestore/employees'
import { listAssignmentsForEmployee, toAssignmentJson } from '@/lib/firestore/assignments'
import { requireSession, requireWriteAccess } from '@/lib/session'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession()
    const { id } = await params
    const employee = await getEmployeeById(id)
    if (!employee) return NextResponse.json({ error: 'Không tìm thấy nhân viên' }, { status: 404 })

    const assignments = await listAssignmentsForEmployee(id)
    return NextResponse.json({
      data: await toEmployeeJson(employee),
      assignments: await Promise.all(assignments.map((a) => toAssignmentJson(a, { withDevice: true }))),
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
    await updateEmployee(id, {
      fullName: body.full_name,
      email: body.email,
      phone: body.phone,
      departmentId: body.department_id,
      employeeCode: body.employee_code,
    })
    const employee = await getEmployeeById(id)
    return NextResponse.json({ data: employee ? await toEmployeeJson(employee) : null })
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
    await deactivateEmployee(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
