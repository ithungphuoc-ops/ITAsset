import nodemailer from 'nodemailer'

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER!,
    pass: process.env.GMAIL_APP_PASSWORD!,
  },
})

export async function sendAssignmentEmail({
  toEmail, toName, deviceBrand, deviceModel, deviceCategory,
  assetCode, assignedDate, qrImageBase64, notes,
}: {
  toEmail: string
  toName: string
  deviceBrand: string
  deviceModel: string
  deviceCategory: string
  assetCode: string
  assignedDate: string
  qrImageBase64: string
  notes?: string
}) {
  const categoryLabel: Record<string, string> = {
    laptop: 'Laptop', monitor: 'Màn hình', pc: 'Máy tính bàn',
    peripheral: 'Phụ kiện', other: 'Thiết bị khác',
  }

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#1d4ed8;padding:28px 32px;">
      <div style="color:#93c5fd;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">ITAsset System</div>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Thông báo cấp phát thiết bị</h1>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px;">
      <p style="margin:0 0 20px;color:#374151;font-size:15px;">Xin chào <strong>${toName}</strong>,</p>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
        Bạn vừa được cấp phát thiết bị IT. Vui lòng kiểm tra thông tin bên dưới và giữ gìn thiết bị cẩn thận.
      </p>

      <!-- Device info -->
      <div style="background:#f8faff;border:1px solid #e0e7ff;border-radius:10px;padding:20px;margin-bottom:24px;">
        <div style="font-size:12px;color:#6366f1;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:14px;">Thông tin thiết bị</div>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;width:120px;">Thiết bị</td><td style="padding:5px 0;color:#111827;font-size:13px;font-weight:600;">${deviceBrand} ${deviceModel}</td></tr>
          <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">Loại</td><td style="padding:5px 0;color:#111827;font-size:13px;">${categoryLabel[deviceCategory] || deviceCategory}</td></tr>
          <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">Mã tài sản</td><td style="padding:5px 0;color:#1d4ed8;font-size:13px;font-family:monospace;font-weight:600;">${assetCode}</td></tr>
          <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">Ngày cấp</td><td style="padding:5px 0;color:#111827;font-size:13px;">${assignedDate}</td></tr>
          ${notes ? `<tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">Ghi chú</td><td style="padding:5px 0;color:#111827;font-size:13px;">${notes}</td></tr>` : ''}
        </table>
      </div>

      <!-- QR Code -->
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:13px;color:#6b7280;margin-bottom:12px;">Quét mã QR để xem thông tin thiết bị bất kỳ lúc nào</div>
        <img src="cid:qrcode" alt="QR Code" style="width:160px;height:160px;border:1px solid #e5e7eb;border-radius:8px;padding:8px;" />
        <div style="font-size:11px;color:#9ca3af;margin-top:8px;font-family:monospace;">${assetCode}</div>
      </div>

      <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;border-top:1px solid #f3f4f6;padding-top:16px;">
        Email này được gửi tự động từ hệ thống ITAsset. Vui lòng không reply email này.<br/>
        Mọi thắc mắc liên hệ phòng IT.
      </p>
    </div>
  </div>
</body>
</html>`

  await transporter.sendMail({
    from: `"ITAsset System" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: `[ITAsset] Bạn được cấp phát thiết bị: ${deviceBrand} ${deviceModel}`,
    html,
    attachments: [{
      filename: `QR-${assetCode}.png`,
      content: qrImageBase64.replace(/^data:image\/png;base64,/, ''),
      encoding: 'base64',
      cid: 'qrcode',
    }],
  })
}
