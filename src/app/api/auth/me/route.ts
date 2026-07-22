import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { adminAuth } from "@/lib/firebase/admin";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ role: null, email: null, name: null, avatar: null });

  const authUser = await adminAuth.getUser(session.uid).catch(() => null);
  return NextResponse.json({
    role: session.profile?.role ?? null,
    email: session.email,
    name: session.profile?.fullName || authUser?.displayName || session.email,
    avatar: session.profile?.avatar ?? authUser?.photoURL ?? null,
  });
}
