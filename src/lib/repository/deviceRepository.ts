import { createClient } from '@/lib/supabase/client'
import type { Device, DeviceCategory, DeviceStatus } from '@/lib/types'

export interface DeviceFilter {
  search?: string
  category?: DeviceCategory
  status?: DeviceStatus
}

// Tầng này là nơi DUY NHẤT gọi database
// Khi đổi từ Supabase sang Firebase: chỉ cần sửa file này

export async function getDevices(filter?: DeviceFilter): Promise<Device[]> {
  const supabase = createClient()
  let query = supabase
    .from('devices')
    .select(`
      *,
      laptop_specs:device_laptop_specs(*),
      monitor_specs:device_monitor_specs(*),
      current_assignment:assignments!inner(
        *,
        employee:employees(*)
      )
    `)
    .eq('assignments.is_active', true)
    .order('created_at', { ascending: false })

  if (filter?.category) query = query.eq('category', filter.category)
  if (filter?.status) query = query.eq('status', filter.status)
  if (filter?.search) {
    query = query.or(
      `asset_code.ilike.%${filter.search}%,serial_number.ilike.%${filter.search}%,brand.ilike.%${filter.search}%,model.ilike.%${filter.search}%`
    )
  }

  const { data, error } = await query
  if (error) throw error
  return data as Device[]
}

export async function getDeviceByQR(qrCode: string): Promise<Device | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('devices')
    .select(`
      *,
      laptop_specs:device_laptop_specs(*),
      monitor_specs:device_monitor_specs(*),
      current_assignment:assignments(
        *,
        employee:employees(*, department:departments(*))
      )
    `)
    .eq('qr_code', qrCode)
    .eq('assignments.is_active', true)
    .single()

  if (error) return null
  return data as Device
}

export async function getDeviceById(id: string): Promise<Device | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('devices')
    .select(`
      *,
      laptop_specs:device_laptop_specs(*),
      monitor_specs:device_monitor_specs(*),
      assignments(*, employee:employees(*))
    `)
    .eq('id', id)
    .single()

  if (error) return null
  return data as Device
}

export async function createDevice(device: Partial<Device>): Promise<Device> {
  const supabase = createClient()
  const qr_code = `ITASSET-${device.asset_code}-${Date.now()}`
  const { data, error } = await supabase
    .from('devices')
    .insert({ ...device, qr_code })
    .select()
    .single()

  if (error) throw error
  return data as Device
}

export async function updateDevice(id: string, updates: Partial<Device>): Promise<Device> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('devices')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Device
}

export async function deleteDevice(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('devices').delete().eq('id', id)
  if (error) throw error
}

export async function getDashboardStats() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('devices')
    .select('status, category')

  if (error) throw error

  const stats = {
    total: data.length,
    in_use: data.filter(d => d.status === 'in_use').length,
    in_stock: data.filter(d => d.status === 'in_stock').length,
    broken: data.filter(d => d.status === 'broken').length,
    by_category: {
      laptop: data.filter(d => d.category === 'laptop').length,
      monitor: data.filter(d => d.category === 'monitor').length,
      pc: data.filter(d => d.category === 'pc').length,
      peripheral: data.filter(d => d.category === 'peripheral').length,
    }
  }
  return stats
}
