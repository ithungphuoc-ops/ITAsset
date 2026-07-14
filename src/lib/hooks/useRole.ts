'use client'
import { useEffect, useState } from 'react'

export type DashboardRole = 'admin' | 'it_staff' | 'viewer'

export function useRole() {
  const [role, setRole] = useState<DashboardRole | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => setRole(data.role ?? null))
  }, [])

  return {
    role,
    isAdmin: role === 'admin',
    isItStaff: role === 'it_staff',
    isViewer: role === 'viewer',
    // Có quyền tạo/sửa/xoá/cấp phát/thu hồi (admin hoặc it_staff)
    canWrite: role === 'admin' || role === 'it_staff',
  }
}
