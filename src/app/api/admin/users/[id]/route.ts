import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Reset password hoặc đổi role/tên
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  if (body.password) {
    const { error } = await supabase.auth.admin.updateUserById(id, { password: body.password })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }
  if (body.role || body.name) {
    const { error } = await supabase.auth.admin.updateUserById(id, {
      user_metadata: { role: body.role, name: body.name },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }
  if (typeof body.banned === 'boolean') {
    const { error } = await supabase.auth.admin.updateUserById(id, {
      ban_duration: body.banned ? '876600h' : 'none',
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}

// Xóa user
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await supabase.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
