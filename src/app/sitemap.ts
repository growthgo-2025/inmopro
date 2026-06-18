import { MetadataRoute } from "next";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://inmopro.co";

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
  ];

  const properties = await db.property.findMany({
    where: { published: true },
    select: { slug: true, code: true, updatedAt: true },
  });

  const propertyEntries: MetadataRoute.Sitemap = properties.map((p) => ({
    url: `${baseUrl}/?view=property&code=${p.code}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const cities = await db.city.findMany({
    where: { properties: { some: { published: true } } },
    select: { id: true, name: true },
  });
  const cityEntries: MetadataRoute.Sitemap = cities.map((c) => ({
    url: `${baseUrl}/?view=results&city=${c.id}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticEntries, ...cityEntries, ...propertyEntries];
}
