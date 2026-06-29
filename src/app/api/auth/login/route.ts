import { NextRequest, NextResponse } from 'next/server'

const PASSWORD = process.env.ADMIN_PASSWORD || 'Hpcons@2024'
const COOKIE_TOKEN = 'itasset_logged_in'
const COOKIE_VALUE = 'yes'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  if (password !== PASSWORD) {
    return NextResponse.json({ error: 'Mật khẩu không đúng' }, { status: 401 })
  }
  const res = NextResponse.json({ success: true })
  res.cookies.set(COOKIE_TOKEN, COOKIE_VALUE, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
