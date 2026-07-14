import { NextResponse } from 'next/server'
import { listDepartments, createDepartment, toDepartmentJson } from '@/lib/firestore/departments'
import { requireSession, requireWriteAccess } from '@/lib/session'

export async function GET() {
  try {
    await requireSession()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 })
  }

  try {
    const departments = await listDepartments()
    return NextResponse.json({ data: departments.map(toDepartmentJson) })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await requireWriteAccess()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 })
  }

  try {
    const body = await req.json()
    const department = await createDepartment(body.name)
    return NextResponse.json({ data: toDepartmentJson(department) })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
