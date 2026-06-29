import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const status = searchParams.get('status') || ''

    let query = supabase
      .from('devices')
      .select('*, laptop_specs:device_laptop_specs(*), monitor_specs:device_monitor_specs(*), assignments(quantity, is_active, employee:employees(id, full_name))')
      .order('created_at', { ascending: false })

    if (category) query = query.eq('category', category)
    if (status) query = query.eq('status', status)
    if (search) query = query.or(`asset_code.ilike.%${search}%,serial_number.ilike.%${search}%,brand.ilike.%${search}%,model.ilike.%${search}%`)

    const { data, error } = await query
    if (error) throw error

    // Tính quantity_in_use và quantity_in_stock cho mỗi thiết bị
    const enriched = (data || []).map((d: Record<string, unknown>) => {
      const assignments = (d.assignments as { quantity: number; is_active: boolean; employee: { id: string; full_name: string } | null }[]) || []
      const activeAssignments = assignments.filter(a => a.is_active)
      const in_use = activeAssignments.reduce((s, a) => s + (a.quantity || 1), 0)
      const total = (d.quantity as number) || 1
      const assignees = activeAssignments.map(a => a.employee).filter(Boolean)
      return {
        ...d,
        assignments: undefined,
        quantity_in_use: in_use,
        quantity_in_stock: Math.max(0, total - in_use),
        assignees,
      }
    })

    return NextResponse.json({ data: enriched })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Lỗi không xác định'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
