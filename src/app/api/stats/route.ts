import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const [{ data: devices }, { count: employees }, { data: assignments }] = await Promise.all([
    supabase.from('devices').select('status, category'),
    supabase.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('assignments')
      .select('id, assigned_date, is_active, device:devices(brand,model,asset_code,category), employee:employees(full_name,department:departments(name))')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const byCategory = (cat: string) => (devices || []).filter(d => d.category === cat).length

  const stats = {
    total: devices?.length || 0,
    in_use: (devices || []).filter(d => d.status === 'in_use').length,
    in_stock: (devices || []).filter(d => d.status === 'in_stock').length,
    broken: (devices || []).filter(d => d.status === 'broken').length,
    employees: employees || 0,
    laptop: byCategory('laptop'), monitor: byCategory('monitor'), pc: byCategory('pc'),
    printer: byCategory('printer'), networking: byCategory('networking'),
    component: byCategory('component'), ups: byCategory('ups'),
    peripheral: byCategory('peripheral'), other: byCategory('other'),
  }

  return NextResponse.json({ stats, assignments: assignments || [] })
}
