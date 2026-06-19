import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPropertyByCode, getSimilarProperties, slugify } from "@/lib/queries";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const property = await getPropertyByCode(code);
  if (!property) {
    return NextResponse.json({ error: "Inmueble no encontrado" }, { status: 404 });
  }

  // Increment views (fire-and-forget)
  db.property
    .update({ where: { code: property.code }, data: { views: { increment: 1 } } })
    .catch(() => {});

  const similar = await getSimilarProperties(
    property.code,
    property.cityId,
    property.propertyType,
    property.operation,
    4
  );

  return NextResponse.json({ property, similar });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { code } = await params;
    const body = await req.json();
    const existing = await db.property.findUnique({
      where: { code },
      include: { agent: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    // Extract agent fields (not Property columns — they belong to the User/agent)
    const { agentName, agentPhone, agentEmail, agentWhatsapp, ...rest } = body;

    // Sync agent info if provided and an agent exists
    if (existing.agentId && (agentName || agentPhone || agentEmail)) {
      await db.user.update({
        where: { id: existing.agentId },
        data: {
          ...(agentName && { name: agentName }),
          ...(agentPhone && { phone: agentPhone }),
          ...(agentEmail && { email: agentEmail }),
        },
      }).catch(() => { /* ignore agent update errors */ });
    }

    const data: any = { ...rest };
    if (body.amenities) data.amenities = JSON.stringify(body.amenities);
    if (body.images) data.images = JSON.stringify(body.images);
    if (body.title) {
      data.slug = `${slugify(body.title)}-${code.split("-").slice(-1)[0]}`;
      data.metaTitle = body.title;
      data.metaDescription = body.shortDesc || body.title;
    }
    // Ensure numeric fields are numbers
    if (body.price !== undefined) data.price = Number(body.price);
    if (body.area !== undefined) data.area = Number(body.area);
    if (body.builtArea !== undefined) data.builtArea = body.builtArea ? Number(body.builtArea) : null;
    if (body.bedrooms !== undefined) data.bedrooms = body.bedrooms ? Number(body.bedrooms) : null;
    if (body.bathrooms !== undefined) data.bathrooms = body.bathrooms ? Number(body.bathrooms) : null;
    if (body.parking !== undefined) data.parking = body.parking ? Number(body.parking) : null;
    if (body.stratum !== undefined) data.stratum = body.stratum ? Number(body.stratum) : null;
    if (body.ageYears !== undefined) data.ageYears = body.ageYears ? Number(body.ageYears) : null;
    if (body.floor !== undefined) data.floor = body.floor ? Number(body.floor) : null;
    if (body.floorsTotal !== undefined) data.floorsTotal = body.floorsTotal ? Number(body.floorsTotal) : null;
    if (body.adminFee !== undefined) data.adminFee = body.adminFee ? Number(body.adminFee) : null;
    delete data.id;
    delete data.code;
    delete data.agentId;
    delete data.agencyId;

    const updated = await db.property.update({ where: { code }, data });

    await db.auditLog.create({
      data: {
        action: "UPDATE",
        entity: "Property",
        entityId: updated.id,
        metadata: JSON.stringify({ code }),
      },
    });

    return NextResponse.json({ ok: true, code: updated.code });
  } catch (e: any) {
    console.error("PUT /api/properties/[code] error", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { code } = await params;
    const existing = await db.property.findUnique({ where: { code } });
    if (!existing) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    await db.property.delete({ where: { code } });
    await db.auditLog.create({
      data: { action: "DELETE", entity: "Property", entityId: existing.id, metadata: JSON.stringify({ code }) },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
