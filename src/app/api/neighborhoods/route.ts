import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const cityId = sp.get("cityId");
  const where: any = {};
  if (cityId) where.cityId = cityId;
  const items = await db.neighborhood.findMany({
    where,
    orderBy: { name: "asc" },
    include: { _count: { select: { properties: { where: { published: true } } } } },
  });
  return NextResponse.json({
    items: items.map((n) => ({
      id: n.id,
      name: n.name,
      zone: n.zone,
      cityId: n.cityId,
      propertyCount: n._count.properties,
    })),
  });
}
