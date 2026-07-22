'use client'

// Avatar người dùng đồng bộ live từ app tổng (account.hpcore.vn). Hiện ảnh
// nếu có avatarUrl, ngược lại rơi về chữ cái đầu tên/email.
export function UserAvatar({
  avatar,
  name,
  size = 32,
  className = '',
}: {
  avatar?: string | null
  name?: string | null
  size?: number
  className?: string
}) {
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?'

  if (avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={avatar}
        alt={name || 'Avatar'}
        width={size}
        height={size}
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className={`rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-medium shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initial}
    </div>
  )
}
