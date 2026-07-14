import { NextResponse } from "next/server";

/**
 * Danh sách vai trò CỦA CHÍNH ITAsset — app tổng (account.hpcore.vn) gọi
 * endpoint này để dựng dropdown gán quyền, KHÔNG hard-code danh sách vai trò
 * ITAsset ở phía app tổng (xem openspec/changes/centralize-child-app-permissions
 * ở hpcons-portal). Public, CORS mở cho *.hpcore.vn — không có dữ liệu nhạy cảm.
 */
const ROLES = {
  admin: "Quản trị hệ thống",
  it_staff: "Nhân viên IT",
  viewer: "Chỉ xem",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=300",
};

export function GET() {
  const roles = Object.entries(ROLES).map(([key, label]) => ({ key, label }));
  return NextResponse.json({ roles }, { headers: CORS });
}

export function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}
