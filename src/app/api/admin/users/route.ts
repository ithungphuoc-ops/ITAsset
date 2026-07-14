import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { requireAdmin } from '@/lib/session'
import type { UserRole } from '@/lib/firestore/types'

const DASHBOARD_ROLES: UserRole[] = ['admin', 'it_staff', 'viewer']

// Danh sách người có quyền dashboard (profiles khoá theo email).
// Tài khoản đăng nhập do app tổng quản; đây chỉ quản VAI TRÒ trong ITAsset.
export async function GET() {
  try {
    await requireAdmin()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 })
  }
  const snap = await adminDb.collection('profiles').get()
  const list = snap.docs
    .filter((d) => d.id.includes('@'))
    .map((d) => ({ email: d.id, role: d.data().role as UserRole, name: d.data().fullName ?? '' }))
    .sort((a, b) => a.email.localeCompare(b.email))
  return NextResponse.json({ data: list })
}

// Cấp / cập nhật vai trò dashboard cho 1 email
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 })
  }
  const { email, role, name } = await req.json()
  const em = String(email || '').trim().toLowerCase()
  if (!em || !em.includes('@')) return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 })
  if (!DASHBOARD_ROLES.includes(role)) return NextResponse.json({ error: 'Vai trò không hợp lệ' }, { status: 400 })

  await adminDb.collection('profiles').doc(em).set(
    { email: em, role, fullName: name || '', createdAt: new Date().toISOString() },
    { merge: true },
  )
  return NextResponse.json({ data: { email: em, role, name: name || '' } })
}
