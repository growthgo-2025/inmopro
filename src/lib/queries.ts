import { db } from "@/lib/db";
import type { SearchFilters } from "@/lib/store";

export interface PropertyListItem {
  id: string;
  code: string;
  title: string;
  slug: string;
  shortDesc: string;
  operation: string;
  propertyType: string;
  status: string;
  price: number;
  currency: string;
  area: number;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  stratum: number | null;
  featured: boolean;
  cityId: string | null;
  cityName: string | null;
  neighborhoodId: string | null;
  neighborhoodName: string | null;
  mainImage: string | null;
  amenities: string[];
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
}

export interface PropertyDetail extends PropertyListItem {
  description: string;
  builtArea: number | null;
  ageYears: number | null;
  floor: number | null;
  floorsTotal: number | null;
  furnished: boolean;
  petFriendly: boolean;
  adminFee: number | null;
  pricePerM2: number | null;
  address: string;
  images: { url: string; caption: string; isMain: boolean }[];
  agentId: string | null;
  agentName: string | null;
  agentEmail: string | null;
  agentPhone: string | null;
  agentAvatar: string | null;
  agencyId: string | null;
  agencyName: string | null;
  agencyLogo: string | null;
  agencyPhone: string | null;
  stateName: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  views: number;
}

function parseImages(raw: string | null): { url: string; caption: string; isMain: boolean }[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function getMainImage(raw: string | null): string | null {
  const imgs = parseImages(raw);
  if (!imgs.length) return null;
  return (imgs.find((i) => i.isMain) || imgs[0]).url;
}

function parseAmenities(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/**
 * Apply filters + sort + pagination and return { items, total }
 */
export async function searchProperties(
  filters: SearchFilters
): Promise<{ items: PropertyListItem[]; total: number; page: number; pageSize: number }> {
  const pageSize = 12;
  const page = Math.max(1, filters.page || 1);
  const skip = (page - 1) * pageSize;

  // Build where clause
  const where: any = { published: true };

  if (filters.operation) where.operation = filters.operation;
  if (filters.propertyType) where.propertyType = filters.propertyType;
  if (filters.cityId) where.cityId = filters.cityId;
  if (filters.neighborhoodId) where.neighborhoodId = filters.neighborhoodId;
  if (filters.stratum) where.stratum = filters.stratum;
  if (filters.furnished) where.furnished = true;
  if (filters.petFriendly) where.petFriendly = true;

  if (filters.priceMin || filters.priceMax) {
    where.price = {};
    if (filters.priceMin) where.price.gte = filters.priceMin;
    if (filters.priceMax) where.price.lte = filters.priceMax;
  }
  if (filters.areaMin || filters.areaMax) {
    where.area = {};
    if (filters.areaMin) where.area.gte = filters.areaMin;
    if (filters.areaMax) where.area.lte = filters.areaMax;
  }
  if (filters.bedrooms) where.bedrooms = { gte: filters.bedrooms };
  if (filters.bathrooms) where.bathrooms = { gte: filters.bathrooms };
  if (filters.parking) where.parking = { gte: filters.parking };

  // Code search (exact) or free text
  if (filters.q) {
    const q = filters.q.trim();
    // Detect property code pattern
    if (/^INV-\d{4}-[A-Z]+-\d+$/i.test(q)) {
      where.code = { contains: q, mode: "insensitive" };
    } else {
      where.OR = [
        { title: { contains: q } },
        { shortDesc: { contains: q } },
        { code: { contains: q } },
      ];
    }
  }

  // Amenities filter (JSON contains check - SQLite: do app-side for reliability)
  let amenitySlugs: string[] = [];
  if (filters.amenities && filters.amenities.length) {
    amenitySlugs = filters.amenities;
  }

  // Sort
  let orderBy: any = { createdAt: "desc" };
  switch (filters.sort) {
    case "precio-asc":
      orderBy = { price: "asc" };
      break;
    case "precio-desc":
      orderBy = { price: "desc" };
      break;
    case "area-desc":
      orderBy = { area: "desc" };
      break;
    case "relevancia":
      orderBy = [{ featured: "desc" }, { views: "desc" }];
      break;
    default:
      orderBy = { createdAt: "desc" };
  }

  const [rows, totalRaw] = await Promise.all([
    db.property.findMany({
      where,
      orderBy,
      skip,
      take: pageSize + 50, // fetch extra to allow app-side amenity filter
      include: { city: true, neighborhood: true },
    }),
    db.property.count({ where }),
  ]);

  // App-side amenity filter
  let items: PropertyListItem[] = rows
    .filter((p) => {
      if (!amenitySlugs.length) return true;
      const have = parseAmenities(p.amenities);
      return amenitySlugs.every((s) => have.includes(s));
    })
    .map((p) => mapToListItem(p));

  // Re-truncate to pageSize after app-side filtering
  items = items.slice(0, pageSize);

  // Re-count total if amenity filter applied (approximate: keep raw total)
  const total = amenitySlugs.length
    ? items.length === pageSize
      ? totalRaw
      : skip + items.length
    : totalRaw;

  return { items, total, page, pageSize };
}

function mapToListItem(p: any): PropertyListItem {
  return {
    id: p.id,
    code: p.code,
    title: p.title,
    slug: p.slug,
    shortDesc: p.shortDesc,
    operation: p.operation,
    propertyType: p.propertyType,
    status: p.status,
    price: p.price,
    currency: p.currency,
    area: p.area,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    parking: p.parking,
    stratum: p.stratum,
    featured: p.featured,
    cityId: p.cityId,
    cityName: p.customCityName || p.city?.name || null,
    neighborhoodId: p.neighborhoodId,
    neighborhoodName: p.customNeighborhoodName || p.neighborhood?.name || null,
    mainImage: getMainImage(p.images),
    amenities: parseAmenities(p.amenities),
    latitude: p.latitude,
    longitude: p.longitude,
    createdAt: p.createdAt,
  };
}

export async function getPropertyByCode(code: string): Promise<PropertyDetail | null> {
  const p = await db.property.findFirst({
    where: { OR: [{ code: { equals: code } }, { slug: code }] },
    include: {
      city: { include: { state: true } },
      neighborhood: true,
      agent: true,
      agency: true,
    },
  });
  if (!p) return null;

  return {
    ...mapToListItem(p),
    description: p.description,
    builtArea: p.builtArea,
    ageYears: p.ageYears,
    floor: p.floor,
    floorsTotal: p.floorsTotal,
    furnished: p.furnished,
    petFriendly: p.petFriendly,
    adminFee: p.adminFee,
    pricePerM2: p.pricePerM2,
    address: p.address,
    images: parseImages(p.images),
    agentId: p.agentId,
    agentName: p.agent?.name ?? null,
    agentEmail: p.agent?.email ?? null,
    agentPhone: p.agent?.phone ?? null,
    agentAvatar: p.agent?.avatar ?? null,
    agencyId: p.agencyId,
    agencyName: p.agency?.name ?? null,
    agencyLogo: p.agency?.logoUrl ?? null,
    agencyPhone: p.agency?.phone ?? null,
    stateName: p.city?.state?.name ?? null,
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
    views: p.views,
  };
}

export async function getSimilarProperties(
  code: string,
  cityId: string | null,
  propertyType: string,
  operation: string,
  limit = 4
): Promise<PropertyListItem[]> {
  const current = await db.property.findUnique({ where: { code }, select: { id: true } });
  if (!current) return [];

  const rows = await db.property.findMany({
    where: {
      published: true,
      id: { not: current.id },
      OR: [
        { cityId },
        { propertyType },
        { operation },
      ].filter((c) => Object.values(c).some((v) => v !== undefined)),
    },
    include: { city: true, neighborhood: true },
    take: limit * 3,
    orderBy: { featured: "desc" },
  });

  // Score by match
  const scored = rows
    .map((p) => ({
      p,
      score:
        (p.cityId === cityId ? 3 : 0) +
        (p.propertyType === propertyType ? 2 : 0) +
        (p.operation === operation ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => mapToListItem(s.p));

  return scored;
}

export async function getFeaturedProperties(limit = 8): Promise<PropertyListItem[]> {
  const rows = await db.property.findMany({
    where: { published: true, featured: true },
    include: { city: true, neighborhood: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(mapToListItem);
}

export async function getRecentProperties(limit = 8): Promise<PropertyListItem[]> {
  const rows = await db.property.findMany({
    where: { published: true },
    include: { city: true, neighborhood: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(mapToListItem);
}

export async function getCityStats(): Promise<
  { id: string; name: string; code: string; imageUrl: string | null; count: number }[]
> {
  const cities = await db.city.findMany({
    include: { _count: { select: { properties: { where: { published: true } } } } },
    orderBy: { name: "asc" },
  });
  return cities
    .filter((c) => c._count.properties > 0)
    .map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      imageUrl: c.imageUrl,
      count: c._count.properties,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Generate next property code: INV-2026-{CITYCODE}-{6-digit-seq}
 */
export async function generatePropertyCode(cityCode: string): Promise<string> {
  const count = await db.property.count();
  const year = new Date().getFullYear();
  const seq = String(count + 1).padStart(6, "0");
  return `INV-${year}-${cityCode}-${seq}`;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export { parseAmenities, parseImages };
