'use client'
import { useState, useEffect, useMemo } from 'react'
import { Search, Plus, Upload, User, Building2 } from 'lucide-react'
import Link from 'next/link'
import type { Employee } from '@/lib/types'
import { useRole } from '@/lib/hooks/useRole'

// Chuẩn hóa tiếng Việt — bỏ dấu, lowercase
function normalizeVi(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, m => m === 'đ' ? 'd' : 'D').toLowerCase()
}

export default function EmployeesPage() {
  const { isAdmin } = useRole()
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/employees')
      .then(r => r.json())
      .then(json => { setAllEmployees((json.data as Employee[]) || []); setLoading(false) })
  }, [])

  // Filter client-side với normalize — gõ "hau" ra "Hậu"
  const employees = useMemo(() => {
    if (!search.trim()) return allEmployees
    const q = normalizeVi(search)
    return allEmployees.filter(e =>
      normalizeVi(e.full_name).includes(q) ||
      normalizeVi(e.employee_code || '').includes(q) ||
      normalizeVi((e.department as { name: string } | undefined)?.name || '').includes(q)
    )
  }, [allEmployees, search])

  const grouped = employees.reduce<Record<string, Employee[]>>((acc, emp) => {
    const dept = (emp.department as { name: string } | undefined)?.name || 'Chưa phân phòng ban'
    if (!acc[dept]) acc[dept] = []
    acc[dept].push(emp)
    return acc
  }, {})

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Nhân viên</h1>
          <p className="text-gray-400 text-sm mt-1">
            {loading ? '...' : `${employees.length} nhân viên · ${Object.keys(grouped).length} phòng ban`}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Link href="/dashboard/employees/import"
              className="flex items-center gap-2 border border-gray-700 hover:border-gray-500 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-300 transition-colors">
              <Upload size={15} />
              Import Excel
            </Link>
            <Link href="/dashboard/employees/new"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
              <Plus size={15} />
              Thêm nhân viên
            </Link>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-6">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Tìm tên, họ, phòng ban... (không cần dấu)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-900 rounded-lg animate-pulse" />)}
        </div>
      )}

      {!loading && employees.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <User size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Không tìm thấy nhân viên nào</p>
        </div>
      )}

      {!loading && employees.length > 0 && (
        <div className="space-y-6">
          {search ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-left">
                    <th className="px-4 py-3 font-medium">Nhân viên</th>
                    <th className="px-4 py-3 font-medium">Mã NV</th>
                    <th className="px-4 py-3 font-medium">Phòng ban</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => <EmployeeRow key={emp.id} emp={emp} />)}
                </tbody>
              </table>
            </div>
          ) : (
            Object.entries(grouped).map(([dept, emps]) => (
              <div key={dept} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 bg-gray-800/40">
                  <Building2 size={14} className="text-blue-400 shrink-0" />
                  <span className="font-medium text-sm text-gray-200">{dept}</span>
                  <span className="ml-auto text-xs text-gray-500 bg-gray-700/60 px-2 py-0.5 rounded-full">{emps.length} người</span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {emps.map(emp => <EmployeeRow key={emp.id} emp={emp} />)}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function EmployeeRow({ emp }: { emp: Employee }) {
  const dept = emp.department as { name: string } | undefined
  return (
    <tr className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 text-blue-400 text-xs font-medium">
            {emp.full_name.charAt(0)}
          </div>
          <span className="font-medium text-white">{emp.full_name}</span>
        </div>
      </td>
      <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{emp.employee_code || '—'}</td>
      <td className="px-4 py-2.5 text-xs text-gray-400">{dept?.name || '—'}</td>
      <td className="px-4 py-2.5 text-xs text-gray-500">{emp.email || '—'}</td>
      <td className="px-4 py-2.5 text-right">
        <Link href={`/dashboard/employees/${emp.id}`} className="text-xs text-gray-500 hover:text-blue-400 transition-colors">
          Chi tiết →
        </Link>
      </td>
    </tr>
  )
}
