import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * SSO với app tổng (account.hpcore.vn).
 * ITAsset không tự đăng nhập nữa: nhận cookie phiên chung "session" (domain
 * .hpcore.vn) do app tổng phát, XÁC MINH bằng service account của project
 * hpcons-portal (env HPCORE_FIREBASE_SERVICE_ACCOUNT), lấy email rồi ánh xạ
 * sang hồ sơ quyền của ITAsset (collection profiles, khoá theo email).
 * App admin riêng tên "hpcore" — KHÔNG đụng app mặc định (Firestore hpcons-itasset).
 */

const APP_NAME = "hpcore";
export const HPCORE_LOGIN_URL = "https://account.hpcore.vn/login";
export const SSO_COOKIE_NAME = "session";

function loadCred(): object {
  const raw = process.env.HPCORE_FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("Thiếu HPCORE_FIREBASE_SERVICE_ACCOUNT (service account project hpcons-portal).");
  return JSON.parse(raw);
}

function getHpcoreApp(): App {
  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) return existing;
  return initializeApp({ credential: cert(loadCred() as Parameters<typeof cert>[0]) }, APP_NAME);
}

const g = globalThis as unknown as { __hpcoreAuth?: Auth; __hpcoreDb?: Firestore };
export function getHpcoreAuth(): Auth {
  return (g.__hpcoreAuth ??= getAuth(getHpcoreApp()));
}

/** Firestore của app tổng — đọc app_permissions/{uid}.itasset (vai trò do app tổng gán) */
export function getHpcoreDb(): Firestore {
  return (g.__hpcoreDb ??= getFirestore(getHpcoreApp()));
}

/** URL đăng nhập app tổng kèm đường quay lại (chỉ *.hpcore.vn) */
export function hpcoreLoginUrl(returnTo: string): string {
  return `${HPCORE_LOGIN_URL}?next=${encodeURIComponent(returnTo)}`;
}

/** Xác minh cookie phiên app tổng → { uid, email } hoặc null */
export async function verifyHpcore(cookie: string | undefined): Promise<{ uid: string; email: string } | null> {
  if (!cookie) return null;
  try {
    const d = await getHpcoreAuth().verifySessionCookie(cookie, true);
    const email = (d.email ?? "").trim().toLowerCase();
    if (!email) return null;
    return { uid: d.uid, email };
  } catch {
    return null;
  }
}
