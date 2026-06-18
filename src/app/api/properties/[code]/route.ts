import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPropertyByCode, getSimilarProperties, slugify } from "@/lib/queries";

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
  try {
    const { code } = await params;
    const body = await req.json();
    const existing = await db.property.findUnique({ where: { code } });
    if (!existing) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const data: any = { ...body };
    if (body.amenities) data.amenities = JSON.stringify(body.amenities);
    if (body.images) data.images = JSON.stringify(body.images);
    if (body.title) {
      data.slug = `${slugify(body.title)}-${code.split("-").slice(-1)[0]}`;
      data.metaTitle = body.title;
    }
    delete data.id;
    delete data.code;

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
