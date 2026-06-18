import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await req.json();

    // Validate
    if (!body.name || !body.email || !body.phone) {
      return NextResponse.json(
        { error: "Nombre, email y teléfono son obligatorios" },
        { status: 400 }
      );
    }

    const property = await db.property.findUnique({ where: { code } });

    const lead = await db.lead.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        message: body.message || null,
        source: body.source || "WEB",
        status: "NUEVO",
        propertyId: property?.id || null,
        propertyCode: code,
        agentId: property?.agentId || null,
        notes: null,
      },
    });

    return NextResponse.json({ ok: true, leadId: lead.id });
  } catch (e: any) {
    console.error("POST contact error", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
