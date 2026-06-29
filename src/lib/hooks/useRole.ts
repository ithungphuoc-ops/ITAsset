'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useRole() {
  const [role, setRole] = useState<'admin' | 'employee' | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setRole((user?.user_metadata?.role as 'admin' | 'employee') || 'employee')
    })
  }, [])

  return { role, isAdmin: role === 'admin', isEmployee: role === 'employee' }
}
