import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Dùng service_role để quản lý user (admin only)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Lấy danh sách tất cả users
export async function GET() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const list = users.map(u => ({
    id: u.id,
    email: u.email,
    role: u.user_metadata?.role || 'employee',
    name: u.user_metadata?.name || '',
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    banned: u.banned_until ? new Date(u.banned_until) > new Date() : false,
  }))
  return NextResponse.json({ data: list })
}

// Tạo user mới
export async function POST(req: NextRequest) {
  const { email, password, role, name } = await req.json()
  if (!email || !password) return NextResponse.json({ error: 'Thiếu email hoặc mật khẩu' }, { status: 400 })

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: role || 'employee', name: name || '' },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data: data.user })
}
