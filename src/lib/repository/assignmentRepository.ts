import { createClient } from '@/lib/supabase/client'
import type { Assignment } from '@/lib/types'

export async function assignDevice(deviceId: string, employeeId: string, assignedBy: string, notes?: string): Promise<Assignment> {
  const supabase = createClient()

  // Đảm bảo không có assignment active nào trước
  await supabase
    .from('assignments')
    .update({ is_active: false, returned_date: new Date().toISOString().split('T')[0] })
    .eq('device_id', deviceId)
    .eq('is_active', true)

  // Cập nhật trạng thái thiết bị
  await supabase
    .from('devices')
    .update({ status: 'in_use', updated_at: new Date().toISOString() })
    .eq('id', deviceId)

  // Tạo assignment mới
  const { data, error } = await supabase
    .from('assignments')
    .insert({
      device_id: deviceId,
      employee_id: employeeId,
      assigned_by: assignedBy,
      assigned_date: new Date().toISOString().split('T')[0],
      is_active: true,
      notes,
    })
    .select('*, employee:employees(*), device:devices(*)')
    .single()

  if (error) throw error
  return data as Assignment
}

export async function returnDevice(deviceId: string, returnedBy: string, notes?: string): Promise<void> {
  const supabase = createClient()

  await supabase
    .from('assignments')
    .update({
      is_active: false,
      returned_date: new Date().toISOString().split('T')[0],
      returned_by: returnedBy,
      notes,
    })
    .eq('device_id', deviceId)
    .eq('is_active', true)

  await supabase
    .from('devices')
    .update({ status: 'in_stock', updated_at: new Date().toISOString() })
    .eq('id', deviceId)
}

export async function getAssignmentHistory(deviceId: string): Promise<Assignment[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('assignments')
    .select('*, employee:employees(*, department:departments(*))')
    .eq('device_id', deviceId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Assignment[]
}

export async function getEmployeeDevices(employeeId: string): Promise<Assignment[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('assignments')
    .select('*, device:devices(*, laptop_specs:device_laptop_specs(*), monitor_specs:device_monitor_specs(*))')
    .eq('employee_id', employeeId)
    .eq('is_active', true)

  if (error) throw error
  return data as Assignment[]
}
