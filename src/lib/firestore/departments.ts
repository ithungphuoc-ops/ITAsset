import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import type { FirestoreDepartment } from "@/lib/firestore/types";

const collection = () => adminDb.collection("departments");

export function toDepartmentJson(dept: FirestoreDepartment) {
  return { id: dept.id, name: dept.name, created_at: dept.createdAt };
}

export async function listDepartments(): Promise<FirestoreDepartment[]> {
  const snap = await collection().orderBy("name").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FirestoreDepartment);
}

export async function getDepartment(id: string): Promise<FirestoreDepartment | null> {
  const doc = await collection().doc(id).get();
  return doc.exists ? ({ id: doc.id, ...doc.data() } as FirestoreDepartment) : null;
}

export async function createDepartment(name: string): Promise<FirestoreDepartment> {
  const createdAt = new Date().toISOString();
  const ref = await collection().add({ name, createdAt });
  return { id: ref.id, name, createdAt };
}
