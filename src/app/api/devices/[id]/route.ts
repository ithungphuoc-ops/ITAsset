import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const { data: device, error } = await supabase
      .from('devices')
      .select('*, laptop_specs:device_laptop_specs(*), monitor_specs:device_monitor_specs(*)')
      .eq('id', id)
      .single()
    if (error) throw error

    const { data: active_assignment } = await supabase
      .from('assignments')
      .select('*, employee:employees(*, department:departments(*))')
      .eq('device_id', id)
      .eq('is_active', true)
      .maybeSingle()

    return NextResponse.json({ data: device, active_assignment: active_assignment || null })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { laptop_specs, monitor_specs, ...deviceFields } = body

    const { error } = await supabase.from('devices').update(deviceFields).eq('id', id)
    if (error) throw error

    if (laptop_specs) {
      const { data: existing } = await supabase.from('device_laptop_specs').select('id').eq('device_id', id).maybeSingle()
      if (existing) {
        await supabase.from('device_laptop_specs').update(laptop_specs).eq('device_id', id)
      } else {
        await supabase.from('device_laptop_specs').insert({ device_id: id, ...laptop_specs })
      }
    }

    if (monitor_specs) {
      const { data: existing } = await supabase.from('device_monitor_specs').select('id').eq('device_id', id).maybeSingle()
      if (existing) {
        await supabase.from('device_monitor_specs').update(monitor_specs).eq('device_id', id)
      } else {
        await supabase.from('device_monitor_specs').insert({ device_id: id, ...monitor_specs })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const { data: active } = await supabase.from('assignments').select('id').eq('device_id', id).eq('is_active', true).maybeSingle()
    if (active) return NextResponse.json({ error: 'Thiết bị đang được cấp phát, không thể xóa' }, { status: 400 })

    await supabase.from('assignments').delete().eq('device_id', id)
    await supabase.from('device_laptop_specs').delete().eq('device_id', id)
    await supabase.from('device_monitor_specs').delete().eq('device_id', id)
    const { error } = await supabase.from('devices').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
