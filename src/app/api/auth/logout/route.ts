import { NextResponse } from 'next/server'

// Đăng xuất SSO: xoá cookie phiên dùng chung (.hpcore.vn) → đăng xuất khỏi mọi app.
export async function POST() {
  const res = NextResponse.json({ success: true })
  for (const opts of [{ domain: '.hpcore.vn' }, {}] as const) {
    res.cookies.set('session', '', { path: '/', maxAge: 0, ...opts })
  }
  return res
}
