import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ success: true })
  res.cookies.set('itasset_logged_in', '', { maxAge: 0, path: '/' })
  return res
}
