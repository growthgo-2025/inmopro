import { NextRequest, NextResponse } from "next/server";
import { checkPassword, setAdminCookie } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const password = typeof body.password === "string" ? body.password : "";

    if (!checkPassword(password)) {
      // small artificial delay to slow brute-force attempts
      await new Promise((r) => setTimeout(r, 600));
      return NextResponse.json(
        { error: "Contraseña incorrecta", code: "BAD_PASSWORD" },
        { status: 401 }
      );
    }

    const res = NextResponse.json({ ok: true });
    setAdminCookie(res);
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
