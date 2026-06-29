'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, RotateCcw, AlertTriangle, User, Calendar } from 'lucide-react'
import Link from 'next/link'

interface Assignment {
  id: string; assigned_date: string
  employee?: { full_name: string; department?: { name: string } }
}

export default function ReturnDevicePage() {
  const { id } = useParams()
  const router = useRouter()
  const [deviceName, setDeviceName] = useState('')
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [notes, setNotes] = useState('')
  const [newStatus, setNewStatus] = useState<'in_stock' | 'broken'>('in_stock')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/devices/${id}`)
      const json = await res.json()
      if (json.data) {
        setDeviceName(`${json.data.brand} ${json.data.model}`)
        setAssignment(json.active_assignment || null)
      }
      setFetching(false)
    }
    load()
  }, [id])

  async function handleReturn() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/assignments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: id, new_status: newStatus, notes }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.push(`/dashboard/devices/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <div className="p-8 text-gray-400">Đang tải...</div>

  return (
    <div className="p-8 max-w-xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/dashboard/devices/${id}`} className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Thu hồi thiết bị</h1>
          {deviceName && <p className="text-gray-400 text-sm mt-0.5">{deviceName}</p>}
        </div>
      </div>

      {!assignment ? (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5 flex gap-3">
          <AlertTriangle className="text-yellow-400 shrink-0 mt-0.5" size={18} />
          <p className="text-yellow-300 text-sm">Thiết bị này chưa được cấp phát cho ai.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Người đang dùng */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Thu hồi từ</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center shrink-0 text-orange-400 font-bold">
                {assignment.employee?.full_name.charAt(0)}
              </div>
              <div>
                <div className="font-semibold">{assignment.employee?.full_name}</div>
                <div className="text-sm text-gray-400">{assignment.employee?.department?.name}</div>
                <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                  <Calendar size={11} />
                  Cấp từ {new Date(assignment.assigned_date).toLocaleDateString('vi-VN')}
                </div>
              </div>
            </div>
          </div>

          {/* Trạng thái sau thu hồi */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-sm font-medium mb-3">Trạng thái sau khi thu hồi</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setNewStatus('in_stock')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  newStatus === 'in_stock'
                    ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                    : 'border-gray-700 text-gray-400 hover:border-gray-500'
                }`}>
                Về kho
              </button>
              <button type="button" onClick={() => setNewStatus('broken')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  newStatus === 'broken'
                    ? 'bg-red-600/20 border-red-500/50 text-red-400'
                    : 'border-gray-700 text-gray-400 hover:border-gray-500'
                }`}>
                Báo hỏng
              </button>
            </div>
          </div>

          {/* Ghi chú */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <label className="block text-sm text-gray-400 mb-1.5">Ghi chú (tuỳ chọn)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="VD: Máy trả lại nguyên vẹn / bị vỡ màn hình..."
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none" />
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</div>}

          <div className="flex gap-3">
            <button onClick={handleReturn} disabled={loading}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
              <RotateCcw size={15} />
              {loading ? 'Đang xử lý...' : 'Xác nhận thu hồi'}
            </button>
            <Link href={`/dashboard/devices/${id}`} className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white border border-gray-700 transition-colors">
              Hủy
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
