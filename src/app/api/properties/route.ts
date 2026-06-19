import { NextRequest, NextResponse } from "next/server";
import { searchProperties, getFeaturedProperties, getRecentProperties } from "@/lib/queries";
import { requireAdmin } from "@/lib/admin-auth";
import type { SearchFilters } from "@/lib/store";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const filters: SearchFilters = {
    q: sp.get("q") || undefined,
    operation: sp.get("operation") || undefined,
    propertyType: sp.get("propertyType") || undefined,
    cityId: sp.get("cityId") || undefined,
    neighborhoodId: sp.get("neighborhoodId") || undefined,
    priceMin: sp.get("priceMin") ? Number(sp.get("priceMin")) : undefined,
    priceMax: sp.get("priceMax") ? Number(sp.get("priceMax")) : undefined,
    areaMin: sp.get("areaMin") ? Number(sp.get("areaMin")) : undefined,
    areaMax: sp.get("areaMax") ? Number(sp.get("areaMax")) : undefined,
    bedrooms: sp.get("bedrooms") ? Number(sp.get("bedrooms")) : undefined,
    bathrooms: sp.get("bathrooms") ? Number(sp.get("bathrooms")) : undefined,
    parking: sp.get("parking") ? Number(sp.get("parking")) : undefined,
    stratum: sp.get("stratum") ? Number(sp.get("stratum")) : undefined,
    furnished: sp.get("furnished") === "1",
    petFriendly: sp.get("petFriendly") === "1",
    amenities: sp.get("amenities")?.split(",").filter(Boolean),
    sort: sp.get("sort") || "recientes",
    page: sp.get("page") ? Number(sp.get("page")) : 1,
  };

  const mode = sp.get("mode");
  if (mode === "featured") {
    const items = await getFeaturedProperties(8);
    return NextResponse.json({ items });
  }
  if (mode === "recent") {
    const items = await getRecentProperties(8);
    return NextResponse.json({ items });
  }

  const result = await searchProperties(filters);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await req.json();
    const { db } = await import("@/lib/db");
    const { generatePropertyCode, slugify } = await import("@/lib/queries");

    const city = body.cityId ? await db.city.findUnique({ where: { id: body.cityId } }) : null;
    // cityCode para generar el INV-YYYY-{CITY}-NNNNNN:
    //  - si la ciudad está en el catálogo → usamos su code (ej "MED")
    //  - si es "Otro" → derivamos un code del nombre manual (ej "Soledad" → "SOL")
    let cityCode: string;
    if (city) {
      cityCode = city.code;
    } else if (body.customCityName && typeof body.customCityName === "string") {
      // Tomar primeras 3 letras en mayúsculas, sin acentos
      cityCode = body.customCityName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z]/g, "")
        .slice(0, 3)
        .padEnd(3, "X");
      if (cityCode.length < 3) cityCode = "OTR";
    } else {
      return NextResponse.json({ error: "Ciudad requerida" }, { status: 400 });
    }

    const code = await generatePropertyCode(cityCode);
    const baseSlug = slugify(body.title || "inmueble");
    const slug = `${baseSlug}-${code.split("-").slice(-1)[0]}`;

    const property = await db.property.create({
      data: {
        code,
        slug,
        title: body.title,
        shortDesc: body.shortDesc || body.title,
        description: body.description || body.shortDesc || "",
        operation: body.operation,
        propertyType: body.propertyType,
        status: body.status || "DISPONIBLE",
        published: body.published ?? true,
        featured: body.featured ?? false,
        price: Number(body.price),
        currency: body.currency || "COP",
        adminFee: body.adminFee ? Number(body.adminFee) : null,
        cityId: body.cityId,
        neighborhoodId: body.neighborhoodId,
        // Nombres manuales cuando la ciudad/barrio es "Otro"
        customCityName: body.customCityName || null,
        customNeighborhoodName: body.customNeighborhoodName || null,
        address: body.address || "",
        latitude: body.latitude ? Number(body.latitude) : null,
        longitude: body.longitude ? Number(body.longitude) : null,
        area: Number(body.area),
        builtArea: body.builtArea ? Number(body.builtArea) : null,
        bedrooms: body.bedrooms ? Number(body.bedrooms) : null,
        bathrooms: body.bathrooms ? Number(body.bathrooms) : null,
        parking: body.parking ? Number(body.parking) : null,
        stratum: body.stratum ? Number(body.stratum) : null,
        ageYears: body.ageYears ? Number(body.ageYears) : null,
        floor: body.floor ? Number(body.floor) : null,
        floorsTotal: body.floorsTotal ? Number(body.floorsTotal) : null,
        furnished: body.furnished ?? false,
        petFriendly: body.petFriendly ?? false,
        amenities: JSON.stringify(body.amenities || []),
        images: JSON.stringify(body.images || []),
        agencyId: body.agencyId,
        agentId: body.agentId,
        metaTitle: body.title,
        metaDescription: body.shortDesc || body.title,
      },
    });

    await db.auditLog.create({
      data: {
        action: "CREATE",
        entity: "Property",
        entityId: property.id,
        userId: body.agentId,
        metadata: JSON.stringify({ code }),
      },
    });

    return NextResponse.json({ ok: true, code: property.code, id: property.id });
  } catch (e: any) {
    console.error("POST /api/properties error", e);
    return NextResponse.json({ error: e.message || "Error interno" }, { status: 500 });
  }
}
