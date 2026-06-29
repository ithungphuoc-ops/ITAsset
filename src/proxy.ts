import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl
  const role = user?.user_metadata?.role || 'employee'

  // Bảo vệ tất cả /dashboard/*
  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
    // Nhân viên không được vào dashboard, chỉ admin
    if (role === 'employee') {
      const url = request.nextUrl.clone()
      url.pathname = '/my-devices'
      return NextResponse.redirect(url)
    }
  }

  // Đã login rồi mà vào /login → redirect theo role
  if (pathname === '/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = role === 'admin' ? '/dashboard' : '/my-devices'
    return NextResponse.redirect(url)
  }

  // Bảo vệ /my-devices — phải login
  if (pathname.startsWith('/my-devices') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/my-devices/:path*'],
}
