import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { requireAdmin } from '@/lib/session'
import type { UserRole } from '@/lib/firestore/types'

const DASHBOARD_ROLES: UserRole[] = ['admin', 'it_staff', 'viewer']

// [id] = email. Đổi vai trò (hoặc gỡ quyền dashboard nếu role không thuộc nhóm dashboard).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 })
  }
  const { id } = await params
  const email = decodeURIComponent(id).trim().toLowerCase()
  const body = await req.json()

  if (body.role) {
    if (DASHBOARD_ROLES.includes(body.role as UserRole)) {
      await adminDb.collection('profiles').doc(email).set(
        { email, role: body.role, ...(body.name ? { fullName: body.name } : {}) },
        { merge: true },
      )
    } else {
      // Không thuộc nhóm dashboard → gỡ quyền (trở lại nhân viên thường)
      await adminDb.collection('profiles').doc(email).delete()
    }
  }
  return NextResponse.json({ success: true })
}

// Gỡ quyền dashboard của email (trở lại nhân viên thường)
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 })
  }
  const { id } = await params
  await adminDb.collection('profiles').doc(decodeURIComponent(id).trim().toLowerCase()).delete()
  return NextResponse.json({ success: true })
}
