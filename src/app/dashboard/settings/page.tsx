'use client'
import { useState, useEffect } from 'react'
import { User, Lock, Shield, Eye, EyeOff, Plus, Trash2, RefreshCw, Users, Check, Ban } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Tab = 'account' | 'users'
interface AppUser {
  id: string; email: string; role: string; name: string
  created_at: string; last_sign_in_at: string; banned: boolean
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('account')

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Cài đặt</h1>
        <p className="text-gray-400 text-sm mt-1">Quản lý tài khoản và bảo mật</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6 w-fit">
        {([['account', 'Tài khoản của tôi'], ['users', 'Quản lý người dùng']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'account' ? <AccountTab /> : <UsersTab />}
    </div>
  )
}

function AccountTab() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) { setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp' }); return }
    if (newPassword.length < 6) { setMessage({ type: 'error', text: 'Mật khẩu phải ít nhất 6 ký tự' }); return }
    setLoading(true); setMessage(null)
    try {
      const { error } = await createClient().auth.updateUser({ password: newPassword })
      if (error) throw error
      setMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' })
      setNewPassword(''); setConfirmPassword('')
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Lỗi' })
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4"><User size={16} className="text-blue-400" /><h2 className="font-semibold">Tài khoản</h2></div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center text-blue-400 font-bold text-lg">IT</div>
          <div>
            <p className="font-medium">HPCONS IT Admin</p>
            <p className="text-sm text-gray-400">ithungphuoc@hpcons.com.vn</p>
          </div>
          <span className="ml-auto text-xs bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded-full">Admin</span>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5"><Lock size={16} className="text-blue-400" /><h2 className="font-semibold">Đổi mật khẩu</h2></div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Mật khẩu mới</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự" required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
              <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Xác nhận mật khẩu mới</label>
            <input type={showPw ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới" required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
          </div>
          {message && (
            <div className={`rounded-lg px-3 py-2 text-sm ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
              {message.text}
            </div>
          )}
          <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
            {loading ? 'Đang lưu...' : 'Đổi mật khẩu'}
          </button>
        </form>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4"><Shield size={16} className="text-blue-400" /><h2 className="font-semibold">Bảo mật</h2></div>
        <div className="space-y-3 text-sm text-gray-400">
          <div className="flex items-center justify-between py-2 border-b border-gray-800"><span>Xác thực</span><span className="text-green-400">Email + Mật khẩu</span></div>
          <div className="flex items-center justify-between py-2 border-b border-gray-800"><span>Session</span><span className="text-gray-300">Tự động hết hạn sau 30 ngày</span></div>
          <div className="flex items-center justify-between py-2"><span>Phân quyền</span><span className="text-blue-400">Admin toàn quyền</span></div>
        </div>
      </div>
    </div>
  )
}

function UsersTab() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'employee' })
  const [resetId, setResetId] = useState<string | null>(null)
  const [resetPw, setResetPw] = useState('')
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadUsers() {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    const json = await res.json()
    setUsers(json.data || [])
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true); setError('')
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error); setCreating(false); return }
    setSuccess('Tạo tài khoản thành công!')
    setShowCreate(false); setForm({ email: '', password: '', name: '', role: 'employee' })
    setCreating(false); loadUsers()
    setTimeout(() => setSuccess(''), 3000)
  }

  async function handleBan(id: string, banned: boolean) {
    await fetch(`/api/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ banned: !banned }) })
    loadUsers()
  }

  async function handleDelete(id: string, email: string) {
    if (!confirm(`Xóa tài khoản ${email}?`)) return
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    loadUsers()
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (!resetId) return
    setResetting(true)
    await fetch(`/api/admin/users/${resetId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: resetPw }) })
    setResetting(false); setResetId(null); setResetPw('')
    setSuccess('Đặt lại mật khẩu thành công!')
    setTimeout(() => setSuccess(''), 3000)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><Users size={16} className="text-blue-400" /><span className="font-semibold">Danh sách tài khoản</span><span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{users.length}</span></div>
        <button onClick={() => setShowCreate(s => !s)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={14} /> Tạo tài khoản
        </button>
      </div>

      {success && <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 text-green-400 text-sm mb-4 flex items-center gap-2"><Check size={14} />{success}</div>}

      {/* Form tạo mới */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-gray-900 border border-blue-500/30 rounded-xl p-5 mb-4 space-y-3">
          <p className="text-sm font-medium text-blue-400 mb-3">Tạo tài khoản mới</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Họ tên</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nguyễn Văn A"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Vai trò</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                <option value="employee">Nhân viên (chỉ xem)</option>
                <option value="admin">Admin (toàn quyền)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Email *</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@hpcons.com.vn" required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Mật khẩu *</label>
            <input type="text" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Tối thiểu 6 ký tự" required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={creating} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              {creating ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="border border-gray-700 hover:border-gray-500 px-4 py-2 rounded-lg text-sm transition-colors">Hủy</button>
          </div>
        </form>
      )}

      {/* Reset password modal */}
      {resetId && (
        <form onSubmit={handleReset} className="bg-gray-900 border border-yellow-500/30 rounded-xl p-5 mb-4 space-y-3">
          <p className="text-sm font-medium text-yellow-400 mb-1">Đặt lại mật khẩu</p>
          <input type="text" value={resetPw} onChange={e => setResetPw(e.target.value)} placeholder="Mật khẩu mới" required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500" />
          <div className="flex gap-2">
            <button type="submit" disabled={resetting} className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              {resetting ? 'Đang lưu...' : 'Xác nhận'}
            </button>
            <button type="button" onClick={() => setResetId(null)} className="border border-gray-700 px-4 py-2 rounded-lg text-sm transition-colors">Hủy</button>
          </div>
        </form>
      )}

      {/* Danh sách */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-10 text-center text-gray-500 text-sm">Đang tải...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-left">
                <th className="px-4 py-3 font-medium">Người dùng</th>
                <th className="px-4 py-3 font-medium">Vai trò</th>
                <th className="px-4 py-3 font-medium">Đăng nhập lần cuối</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium w-32"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{u.name || '—'}</div>
                    <div className="text-xs text-gray-400">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${u.role === 'admin' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700 text-gray-300'}`}>
                      {u.role === 'admin' ? 'Admin' : 'Nhân viên'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('vi-VN') : 'Chưa đăng nhập'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${u.banned ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                      {u.banned ? 'Đã khóa' : 'Hoạt động'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => { setResetId(u.id); setResetPw('') }} title="Reset mật khẩu"
                        className="p-1.5 text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors">
                        <RefreshCw size={13} />
                      </button>
                      <button onClick={() => handleBan(u.id, u.banned)} title={u.banned ? 'Mở khóa' : 'Khóa tài khoản'}
                        className="p-1.5 text-gray-500 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors">
                        <Ban size={13} />
                      </button>
                      <button onClick={() => handleDelete(u.id, u.email || '')} title="Xóa tài khoản"
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
