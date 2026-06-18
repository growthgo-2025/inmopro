import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") || undefined;

  const where: any = {};
  if (status) where.status = status;

  const leads = await db.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { property: { select: { code: true, title: true, price: true, operation: true } } },
    take: 200,
  });

  return NextResponse.json({ items: leads, total: leads.length });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const lead = await db.lead.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        message: body.message || null,
        source: body.source || "CRM",
        status: body.status || "NUEVO",
        propertyCode: body.propertyCode || null,
        propertyId: body.propertyId || null,
        agentId: body.agentId || null,
        notes: body.notes || null,
      },
    });
    await db.auditLog.create({
      data: { action: "CREATE", entity: "Lead", entityId: lead.id },
    });
    return NextResponse.json({ ok: true, id: lead.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
