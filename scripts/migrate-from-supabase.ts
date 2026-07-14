import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env.migration' })

import { createClient } from '@supabase/supabase-js'
import { adminDb } from '../src/lib/firebase/admin'
import type {
  FirestoreDepartment, FirestoreEmployee, FirestoreDevice, FirestoreAssignment,
} from '../src/lib/firestore/types'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})

const DRY_RUN = process.argv.includes('--dry-run')

async function fetchAll(table: string) {
  const { data, error } = await supabase.from(table).select('*')
  if (error) throw new Error(`Lỗi đọc bảng ${table}: ${error.message}`)
  return data ?? []
}

async function migrateDepartments() {
  const rows = await fetchAll('departments')
  console.log(`\n[departments] ${rows.length} bản ghi`)
  if (DRY_RUN) return rows.length

  const batch = adminDb.batch()
  for (const r of rows) {
    const doc: FirestoreDepartment = { id: r.id, name: r.name, createdAt: r.created_at }
    batch.set(adminDb.collection('departments').doc(r.id), doc)
  }
  await batch.commit()
  return rows.length
}

async function migrateEmployees() {
  const rows = await fetchAll('employees')
  console.log(`[employees] ${rows.length} bản ghi`)
  if (DRY_RUN) return rows.length

  let count = 0
  for (const chunk of chunkArray(rows, 400)) {
    const batch = adminDb.batch()
    for (const r of chunk) {
      const doc: FirestoreEmployee = {
        id: r.id, fullName: r.full_name, email: r.email, phone: r.phone,
        departmentId: r.department_id, employeeCode: r.employee_code,
        isActive: r.is_active, createdAt: r.created_at,
      }
      batch.set(adminDb.collection('employees').doc(r.id), doc)
    }
    await batch.commit()
    count += chunk.length
  }
  return count
}

async function migrateDevices() {
  const [devices, laptopSpecsRows, monitorSpecsRows] = await Promise.all([
    fetchAll('devices'),
    fetchAll('device_laptop_specs'),
    fetchAll('device_monitor_specs'),
  ])
  console.log(`[devices] ${devices.length} bản ghi (laptop_specs: ${laptopSpecsRows.length}, monitor_specs: ${monitorSpecsRows.length})`)
  if (DRY_RUN) return devices.length

  const laptopByDevice = new Map(laptopSpecsRows.map((r: any) => [r.device_id, r]))
  const monitorByDevice = new Map(monitorSpecsRows.map((r: any) => [r.device_id, r]))

  let count = 0
  for (const chunk of chunkArray(devices, 400)) {
    const batch = adminDb.batch()
    for (const r of chunk) {
      const ls = laptopByDevice.get(r.id)
      const ms = monitorByDevice.get(r.id)
      const doc: FirestoreDevice = {
        id: r.id, assetCode: r.asset_code, category: r.category, brand: r.brand, model: r.model,
        serialNumber: r.serial_number, status: r.status, purchaseDate: r.purchase_date,
        purchasePrice: r.purchase_price, warrantyExpiry: r.warranty_expiry, notes: r.notes,
        imageUrl: r.image_url, qrCode: r.qr_code, quantity: r.quantity ?? 1,
        createdAt: r.created_at, updatedAt: r.updated_at,
        laptopSpecs: ls ? {
          cpu: ls.cpu, ram: ls.ram, storage: ls.storage, display: ls.display, os: ls.os,
          gpu: ls.gpu, mainBoard: ls.main_board, powerSupply: ls.power_supply,
        } : null,
        monitorSpecs: ms ? {
          screenSize: ms.screen_size, resolution: ms.resolution, panelType: ms.panel_type,
          refreshRate: ms.refresh_rate,
        } : null,
      }
      batch.set(adminDb.collection('devices').doc(r.id), doc)
    }
    await batch.commit()
    count += chunk.length
  }
  return count
}

async function migrateAssignments() {
  const rows = await fetchAll('assignments')
  console.log(`[assignments] ${rows.length} bản ghi`)
  if (DRY_RUN) return rows.length

  let count = 0
  for (const chunk of chunkArray(rows, 400)) {
    const batch = adminDb.batch()
    for (const r of chunk) {
      const doc: FirestoreAssignment = {
        id: r.id, deviceId: r.device_id, employeeId: r.employee_id,
        assignedDate: r.assigned_date, returnedDate: r.returned_date,
        assignedBy: r.assigned_by, returnedBy: r.returned_by, notes: r.notes,
        isActive: r.is_active, quantity: r.quantity ?? 1, createdAt: r.created_at,
      }
      batch.set(adminDb.collection('assignments').doc(r.id), doc)
    }
    await batch.commit()
    count += chunk.length
  }
  return count
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function verifyCounts() {
  console.log('\n=== Đối chiếu số lượng Firestore sau migrate ===')
  for (const col of ['departments', 'employees', 'devices', 'assignments']) {
    const snap = await adminDb.collection(col).count().get()
    console.log(`  ${col}: ${snap.data().count}`)
  }
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (không ghi Firestore, chỉ đếm) ===' : '=== MIGRATE THẬT — ghi vào Firestore ===')
  const results = {
    departments: await migrateDepartments(),
    employees: await migrateEmployees(),
    devices: await migrateDevices(),
    assignments: await migrateAssignments(),
  }
  console.log('\n=== Tổng kết đọc từ Supabase ===')
  console.log(results)

  if (!DRY_RUN) await verifyCounts()
  process.exit(0)
}

main().catch((err) => {
  console.error('MIGRATE THẤT BẠI:', err)
  process.exit(1)
})
