import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const cities = await db.city.findMany({
    orderBy: { name: "asc" },
    include: { state: true, _count: { select: { properties: { where: { published: true } } } } },
  });
  return NextResponse.json({
    items: cities.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      stateName: c.state.name,
      propertyCount: c._count.properties,
    })),
  });
}
