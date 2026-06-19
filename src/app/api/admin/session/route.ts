import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";

/** Client uses this to hydrate `isAdmin` on mount (cookie is httpOnly so JS can't read it directly). */
export async function GET() {
  const isAdmin = await isAdminAuthenticated();
  return NextResponse.json({ isAdmin });
}
