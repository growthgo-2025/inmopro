import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Admin property listing - includes drafts & all statuses */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") || "";
  const status = sp.get("status");
  const operation = sp.get("operation");
  const published = sp.get("published");

  const where: any = {};
  if (status) where.status = status;
  if (operation) where.operation = operation;
  if (published === "true") where.published = true;
  if (published === "false") where.published = false;
  if (q) {
    where.OR = [{ title: { contains: q } }, { code: { contains: q } }];
  }

  const items = await db.property.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { city: true, neighborhood: true, agent: true },
  });

  return NextResponse.json({
    items: items.map((p) => ({
      id: p.id,
      code: p.code,
      title: p.title,
      operation: p.operation,
      propertyType: p.propertyType,
      status: p.status,
      published: p.published,
      featured: p.featured,
      price: p.price,
      currency: p.currency,
      cityName: p.city?.name,
      neighborhoodName: p.neighborhood?.name,
      agentName: p.agent?.name,
      createdAt: p.createdAt,
      views: p.views,
    })),
  });
}
