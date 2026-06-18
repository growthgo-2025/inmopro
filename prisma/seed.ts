// =====================================================================
// InmoPro - Seed script
// Populates DB with realistic Colombian real estate data.
// Run with: bun run prisma/seed.ts
// =====================================================================

import { db } from "../src/lib/db";

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

let globalSeq = 0;
function makeCode(cityCode: string): string {
  globalSeq++;
  return `INV-2026-${cityCode}-${String(globalSeq).padStart(6, "0")}`;
}

function imagesArr(ids: string[]): string {
  return JSON.stringify(
    ids.map((id, i) => ({
      url: `https://images.unsplash.com/photo-${id}?w=1200&q=80&auto=format&fit=crop`,
      caption: `Vista ${i + 1}`,
      isMain: i === 0,
    })),
  );
}

function amenitiesArr(slugs: string[]): string {
  return JSON.stringify(slugs);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pick<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// Round to nearest 100k for nicer pricing
function roundPrice(n: number): number {
  return Math.round(n / 100000) * 100000;
}

// ---------------------------------------------------------------------
// Image pools (real Unsplash photo IDs)
// ---------------------------------------------------------------------
const IMG = {
  houseExt: [
    "1568605114967-8130f3a36994",
    "1564013799919-ab600027ffc6",
    "1512917774080-9991f1c4c750",
    "1605276374104-dee2a0ed3cd6",
    "1613490493576-7fde63acd811",
    "1600596542815-ffad4c1539a9",
    "1583608205776-bfd35f0d9f83",
    "1502672260266-1c1ef2d93688",
  ],
  aptInt: [
    "1522708323590-d24dbb6b0267",
    "1493809842364-78817add7ffb",
    "1560448204-e02f11c3d0e2",
    "1502672023488-70e25813eb80",
    "1505873242700-f289a29e1e0f",
  ],
  modern: [
    "1600210492486-724fe5c67fb0",
    "1600210492493-09cd691fa4bf",
    "1630699464228-3b2f6b9e4f7f",
    "1616137466211-f939a420be84",
  ],
  kitchen: ["1556909114-f6e7ad7d3136", "1556911220-bff31c812dba"],
  living: ["1567767292278-a4f21aa2d36e", "1583847268964-b28dc8f51f92"],
  bedroom: ["1505693416388-ac5ce068fe85", "1540518614846-7eded433c457"],
  bath: ["1620626011761-996317b8d101"],
  pool: ["1571896349842-33c89424de2d", "1582268611958-ebfd161ef9cf"],
  office: ["1497366754035-f200968a6e72", "1497366811353-6870744d04b2"],
  land: ["1500382017468-9049fed747ef", "1500380804539-4e1e8c1e7118"],
};

// Amenity slug pools
const AMEN_GENERAL = [
  "piscina",
  "gimnasio",
  "terraza",
  "balcon",
  "bbq",
  "jardin",
  "ascensor",
  "aire-acondicionado",
  "deposito",
  "patio",
  "vista-panoramica",
  "zona-infantil",
  "cancha-deportiva",
  "jacuzzi",
  "sauna",
  "salon-social",
  "porteria",
];
const AMEN_SECURITY = ["seguridad-24h", "circuito-cerrado", "porton-electrico"];
const AMEN_SERVICES = ["agua", "gas", "internet", "tv"];

function pickAmenities(count: number, includeSecurity = true, includeServices = true): string[] {
  const pool: string[] = [...AMEN_GENERAL];
  if (includeSecurity) pool.push(...AMEN_SECURITY);
  if (includeServices) pool.push(...AMEN_SERVICES);
  return pick(pool, count);
}

// ---------------------------------------------------------------------
// Property spec type (built before DB write)
// ---------------------------------------------------------------------
type PropertySpec = {
  cityCode: string;
  neighborhoodName: string;
  operation: "VENTA" | "ARRIENDO" | "TEMPORAL";
  propertyType:
    | "CASA"
    | "APARTAMENTO"
    | "APARTAESTUDIO"
    | "OFICINA"
    | "LOCAL"
    | "BODEGA"
    | "LOTE"
    | "FINCA"
    | "CAMPESTRE"
    | "PROYECTO";
  title: string;
  shortDesc: string;
  description: string;
  price: number;
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  stratum?: number;
  ageYears?: number;
  floor?: number;
  floorsTotal?: number;
  furnished?: boolean;
  petFriendly?: boolean;
  adminFee?: number;
  featured?: boolean;
  published?: boolean;
  status?: string;
  imageIds: string[];
  amenitiesCount: number;
  agentIdx: number; // 0..5
  builtArea?: number;
};

// ---------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------
async function main() {
  console.log("🧹 Cleaning existing data...");
  // Order respects relations
  await db.auditLog.deleteMany();
  await db.savedSearch.deleteMany();
  await db.favorite.deleteMany();
  await db.lead.deleteMany();
  await db.property.deleteMany();
  await db.amenity.deleteMany();
  await db.neighborhood.deleteMany();
  await db.city.deleteMany();
  await db.state.deleteMany();
  await db.country.deleteMany();
  await db.user.deleteMany();
  await db.agency.deleteMany();
  console.log("✓ Cleaned\n");

  // ------------------------------------------------------------------
  // 1. COUNTRY
  // ------------------------------------------------------------------
  console.log("🌍 Creating country...");
  const colombia = await db.country.create({
    data: { name: "Colombia", code: "CO" },
  });

  // ------------------------------------------------------------------
  // 2. STATES
  // ------------------------------------------------------------------
  console.log("🗺️  Creating states...");
  const stateDefs = [
    { name: "Antioquia", code: "ANT" },
    { name: "Atlántico", code: "ATL" },
    { name: "Bogotá D.C.", code: "BOD" },
    { name: "Valle del Cauca", code: "VLC" },
    { name: "Bolívar", code: "BOL" },
    { name: "Santander", code: "SAN" },
    { name: "Caldas", code: "CAL" },
    { name: "Risaralda", code: "RIS" },
    { name: "Quindío", code: "QUI" },
    { name: "Magdalena", code: "MAG" },
  ];
  const states: Record<string, { id: string; name: string; code: string }> = {};
  for (const s of stateDefs) {
    const st = await db.state.create({
      data: { name: s.name, code: s.code, countryId: colombia.id },
    });
    states[s.code] = st;
  }
  console.log(`✓ Created ${stateDefs.length} states\n`);

  // ------------------------------------------------------------------
  // 3. CITIES
  // ------------------------------------------------------------------
  console.log("🏙️  Creating cities...");
  const cityDefs = [
    { name: "Medellín", code: "MED", stateCode: "ANT", lat: 6.2442, lng: -75.5812 },
    { name: "Barranquilla", code: "BQ", stateCode: "ATL", lat: 10.9685, lng: -74.7813 },
    { name: "Bogotá", code: "BOG", stateCode: "BOD", lat: 4.7110, lng: -74.0721 },
    { name: "Cali", code: "CALI", stateCode: "VLC", lat: 3.4516, lng: -76.5320 },
    { name: "Cartagena", code: "CTG", stateCode: "BOL", lat: 10.3910, lng: -75.4794 },
    { name: "Bucaramanga", code: "BGA", stateCode: "SAN", lat: 7.1193, lng: -73.1227 },
    { name: "Manizales", code: "MZL", stateCode: "CAL", lat: 5.0703, lng: -75.5138 },
    { name: "Pereira", code: "PEI", stateCode: "RIS", lat: 4.8133, lng: -75.6961 },
    { name: "Armenia", code: "ARM", stateCode: "QUI", lat: 4.5350, lng: -75.6757 },
    { name: "Santa Marta", code: "STA", stateCode: "MAG", lat: 11.2408, lng: -74.1990 },
  ];
  const cities: Record<string, { id: string; name: string; code: string; lat: number; lng: number }> = {};
  for (const c of cityDefs) {
    const city = await db.city.create({
      data: {
        name: c.name,
        code: c.code,
        stateId: states[c.stateCode].id,
        latitude: c.lat,
        longitude: c.lng,
      },
    });
    cities[c.code] = { ...city, lat: c.lat, lng: c.lng };
  }
  console.log(`✓ Created ${cityDefs.length} cities\n`);

  // ------------------------------------------------------------------
  // 4. NEIGHBORHOODS
  // ------------------------------------------------------------------
  console.log("🏘️  Creating neighborhoods...");
  const neighborhoodDefs: { cityCode: string; name: string; zone?: string }[] = [
    // Medellín
    { cityCode: "MED", name: "El Poblado", zone: "Sur" },
    { cityCode: "MED", name: "Laureles", zone: "Occidente" },
    { cityCode: "MED", name: "Belén", zone: "Occidente" },
    { cityCode: "MED", name: "Envigado", zone: "Sur" },
    { cityCode: "MED", name: "Sabaneta", zone: "Sur" },
    { cityCode: "MED", name: "Los Conquistadores", zone: "Norte" },
    { cityCode: "MED", name: "Boston", zone: "Centro" },
    { cityCode: "MED", name: "Manila", zone: "Centro" },
    { cityCode: "MED", name: "Florida Nueva", zone: "Occidente" },
    { cityCode: "MED", name: "Estadio", zone: "Occidente" },
    // Bogotá
    { cityCode: "BOG", name: "Chapinero", zone: "Centro" },
    { cityCode: "BOG", name: "Usaquén", zone: "Norte" },
    { cityCode: "BOG", name: "El Chico", zone: "Norte" },
    { cityCode: "BOG", name: "Suba", zone: "Norte" },
    { cityCode: "BOG", name: "Kennedy", zone: "Sur" },
    { cityCode: "BOG", name: "Teusaquillo", zone: "Centro" },
    { cityCode: "BOG", name: "Engativá", zone: "Occidente" },
    { cityCode: "BOG", name: "Fontibón", zone: "Occidente" },
    { cityCode: "BOG", name: "La Soledad", zone: "Centro" },
    { cityCode: "BOG", name: "Santa Bárbara", zone: "Norte" },
    // Barranquilla
    { cityCode: "BQ", name: "Alto Prado", zone: "Sur" },
    { cityCode: "BQ", name: "Villa Country", zone: "Norte" },
    { cityCode: "BQ", name: "El Country", zone: "Norte" },
    { cityCode: "BQ", name: "Boston", zone: "Centro" },
    { cityCode: "BQ", name: "Ciudad Jardín", zone: "Sur" },
    { cityCode: "BQ", name: "Norte", zone: "Norte" },
    { cityCode: "BQ", name: "Centro", zone: "Centro" },
    { cityCode: "BQ", name: "La Concepción", zone: "Centro" },
    { cityCode: "BQ", name: "Riomar", zone: "Norte" },
    { cityCode: "BQ", name: "Altos del Country", zone: "Norte" },
    // Cali
    { cityCode: "CALI", name: "Granada", zone: "Norte" },
    { cityCode: "CALI", name: "San Antonio", zone: "Occidente" },
    { cityCode: "CALI", name: "El Peñón", zone: "Occidente" },
    { cityCode: "CALI", name: "Ciudad Jardín", zone: "Sur" },
    { cityCode: "CALI", name: "Pance", zone: "Sur" },
    { cityCode: "CALI", name: "Valle del Lili", zone: "Sur" },
    { cityCode: "CALI", name: "Santa Mónica", zone: "Norte" },
    { cityCode: "CALI", name: "Normandía", zone: "Norte" },
    { cityCode: "CALI", name: "Tequendama", zone: "Sur" },
    { cityCode: "CALI", name: "Champagnat", zone: "Norte" },
    // Cartagena
    { cityCode: "CTG", name: "Bocagrande", zone: "Centro" },
    { cityCode: "CTG", name: "Castillogrande", zone: "Centro" },
    { cityCode: "CTG", name: "Manga", zone: "Occidente" },
    { cityCode: "CTG", name: "Getsemaní", zone: "Centro" },
    { cityCode: "CTG", name: "Centro Histórico", zone: "Centro" },
    { cityCode: "CTG", name: "El Laguito", zone: "Centro" },
    { cityCode: "CTG", name: "Pie de la Popa", zone: "Occidente" },
    { cityCode: "CTG", name: "La Matuna", zone: "Centro" },
    // Bucaramanga
    { cityCode: "BGA", name: "Cabecera", zone: "Norte" },
    { cityCode: "BGA", name: "Sotomayor", zone: "Norte" },
    { cityCode: "BGA", name: "San Alonso", zone: "Norte" },
    { cityCode: "BGA", name: "Provenza", zone: "Norte" },
    { cityCode: "BGA", name: "Mutis", zone: "Norte" },
    { cityCode: "BGA", name: "García Rovira", zone: "Centro" },
    // Manizales
    { cityCode: "MZL", name: "El Cable", zone: "Norte" },
    { cityCode: "MZL", name: "Batallón", zone: "Norte" },
    { cityCode: "MZL", name: "Sagrado Corazón", zone: "Centro" },
    { cityCode: "MZL", name: "Tesalia", zone: "Sur" },
    { cityCode: "MZL", name: "La Palma", zone: "Norte" },
    { cityCode: "MZL", name: "Milán", zone: "Norte" },
    // Pereira
    { cityCode: "PEI", name: "San Nicolás", zone: "Norte" },
    { cityCode: "PEI", name: "Olympica", zone: "Norte" },
    { cityCode: "PEI", name: "Pinares", zone: "Sur" },
    { cityCode: "PEI", name: "Boston", zone: "Centro" },
    { cityCode: "PEI", name: "Villavicencio", zone: "Centro" },
    { cityCode: "PEI", name: "Cuba", zone: "Occidente" },
    // Armenia
    { cityCode: "ARM", name: "La Castellana", zone: "Norte" },
    { cityCode: "ARM", name: "Centro", zone: "Centro" },
    { cityCode: "ARM", name: "El Edén", zone: "Sur" },
    { cityCode: "ARM", name: "Aviación", zone: "Norte" },
    { cityCode: "ARM", name: "Bolívar", zone: "Centro" },
    { cityCode: "ARM", name: "Suiza", zone: "Occidente" },
    // Santa Marta
    { cityCode: "STA", name: "El Rodadero", zone: "Sur" },
    { cityCode: "STA", name: "Centro", zone: "Centro" },
    { cityCode: "STA", name: "Bello Horizonte", zone: "Norte" },
    { cityCode: "STA", name: "Pozos Colorados", zone: "Sur" },
    { cityCode: "STA", name: "La Bahía", zone: "Centro" },
    { cityCode: "STA", name: "Playa Salguero", zone: "Sur" },
  ];

  // Map: cityCode + neighborhoodName -> neighborhood id
  const neighborhoodMap: Record<string, string> = {};
  for (const n of neighborhoodDefs) {
    const created = await db.neighborhood.create({
      data: { name: n.name, cityId: cities[n.cityCode].id, zone: n.zone ?? null },
    });
    neighborhoodMap[`${n.cityCode}|${n.name}`] = created.id;
  }
  console.log(`✓ Created ${neighborhoodDefs.length} neighborhoods\n`);

  // ------------------------------------------------------------------
  // 5. AMENITIES
  // ------------------------------------------------------------------
  console.log("🛠️  Creating amenities...");
  const amenityDefs: { name: string; slug: string; icon: string; category: string }[] = [
    // general
    { name: "Piscina", slug: "piscina", icon: "Waves", category: "general" },
    { name: "Gimnasio", slug: "gimnasio", icon: "Dumbbell", category: "general" },
    { name: "Terraza", slug: "terraza", icon: "Sun", category: "general" },
    { name: "Balcón", slug: "balcon", icon: "Building2", category: "general" },
    { name: "BBQ / Zona de BBQ", slug: "bbq", icon: "Flame", category: "general" },
    { name: "Jardín", slug: "jardin", icon: "Trees", category: "general" },
    { name: "Ascensor", slug: "ascensor", icon: "ArrowUpDown", category: "general" },
    { name: "Aire acondicionado", slug: "aire-acondicionado", icon: "Snowflake", category: "general" },
    { name: "Depósito / Cuarto útil", slug: "deposito", icon: "Box", category: "general" },
    { name: "Patio", slug: "patio", icon: "Flower2", category: "general" },
    { name: "Vista panorámica", slug: "vista-panoramica", icon: "Mountain", category: "general" },
    { name: "Zona infantil", slug: "zona-infantil", icon: "Baby", category: "general" },
    { name: "Cancha deportiva", slug: "cancha-deportiva", icon: "Trophy", category: "general" },
    { name: "Jacuzzi", slug: "jacuzzi", icon: "Droplets", category: "general" },
    { name: "Sauna", slug: "sauna", icon: "Thermometer", category: "general" },
    { name: "Salón social", slug: "salon-social", icon: "Users", category: "general" },
    { name: "Portería", slug: "porteria", icon: "DoorOpen", category: "general" },
    // security
    { name: "Seguridad 24h", slug: "seguridad-24h", icon: "ShieldCheck", category: "security" },
    { name: "Circuito cerrado de TV", slug: "circuito-cerrado", icon: "Cctv", category: "security" },
    { name: "Portón eléctrico", slug: "porton-electrico", icon: "Zap", category: "security" },
    // services
    { name: "Agua", slug: "agua", icon: "Droplet", category: "services" },
    { name: "Gas", slug: "gas", icon: "Flame", category: "services" },
    { name: "Internet", slug: "internet", icon: "Wifi", category: "services" },
    { name: "TV / Cable", slug: "tv", icon: "Tv", category: "services" },
  ];
  await db.amenity.createMany({ data: amenityDefs });
  console.log(`✓ Created ${amenityDefs.length} amenities\n`);

  // ------------------------------------------------------------------
  // 6. AGENCIES
  // ------------------------------------------------------------------
  console.log("🏢 Creating agencies...");
  const agencies = await Promise.all([
    db.agency.create({
      data: {
        name: "InmoPro Premium",
        email: "contacto@inmopro.co",
        phone: "+57 604 555 1234",
        website: "https://inmopro.co",
        logoUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200&q=80",
        description:
          "InmoPro Premium es una firma de bienes raíces boutique especializada en propiedades de alto valor en Colombia.",
      },
    }),
    db.agency.create({
      data: {
        name: "Metro Cuadrado Asesores",
        email: "info@metrocuadradoasesores.co",
        phone: "+57 601 555 5678",
        website: "https://metrocuadradoasesores.co",
        logoUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=200&q=80",
        description:
          "Más de 15 años asesorando a familias y empresas en la compra, venta y arriendo de inmuebles en Bogotá y el país.",
      },
    }),
    db.agency.create({
      data: {
        name: "Caribe Properties",
        email: "ventas@caribeproperties.co",
        phone: "+57 605 555 9012",
        website: "https://caribeproperties.co",
        logoUrl: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=200&q=80",
        description:
          "Especialistas en propiedades de playa y urbanizaciones premium en Cartagena, Santa Marta y Barranquilla.",
      },
    }),
  ]);
  console.log(`✓ Created ${agencies.length} agencies\n`);

  // ------------------------------------------------------------------
  // 7. AGENT USERS
  // ------------------------------------------------------------------
  console.log("👤 Creating agents...");
  const agentDefs = [
    { name: "Carlos Marín", email: "carlos.marin@inmopro.co", phone: "+57 310 555 1010", agencyIdx: 0 },
    { name: "Laura Gómez", email: "laura.gomez@inmopro.co", phone: "+57 311 555 2020", agencyIdx: 0 },
    { name: "Andrés Restrepo", email: "andres.restrepo@metrocuadradoasesores.co", phone: "+57 312 555 3030", agencyIdx: 1 },
    { name: "Valentina Torres", email: "valentina.torres@metrocuadradoasesores.co", phone: "+57 313 555 4040", agencyIdx: 1 },
    { name: "Jorge Pérez", email: "jorge.perez@caribeproperties.co", phone: "+57 314 555 5050", agencyIdx: 2 },
    { name: "Diana Quintero", email: "diana.quintero@caribeproperties.co", phone: "+57 315 555 6060", agencyIdx: 2 },
  ];
  const agents = await Promise.all(
    agentDefs.map((a) =>
      db.user.create({
        data: {
          email: a.email,
          name: a.name,
          phone: a.phone,
          role: "AGENT",
          agencyId: agencies[a.agencyIdx].id,
          password: "demo-hash",
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(a.name)}&background=0f766e&color=fff`,
          active: true,
        },
      }),
    ),
  );
  console.log(`✓ Created ${agents.length} agents\n`);

  // ------------------------------------------------------------------
  // 8. PROPERTIES — 50 properties across 10 cities
  // ------------------------------------------------------------------
  console.log("🏠 Creating properties...");

  // Build the list of property specs (50 total)
  const props: PropertySpec[] = [
    // ----- MEDELLÍN (8) -----
    {
      cityCode: "MED",
      neighborhoodName: "El Poblado",
      operation: "VENTA",
      propertyType: "APARTAMENTO",
      title: "Hermoso apartamento en El Poblado con vista a la ciudad",
      shortDesc: "Apartamento de 3 habitaciones en El Poblado con vista panorámica a Medellín.",
      description:
        "Espectacular apartamento ubicado en el corazón de El Poblado, una de las zonas más exclusivas de Medellín. Con una vista panorámica inigualable hacia la ciudad, este inmueble cuenta con acabados de alta calidad, piso en porcelanato y cocina abierta con isla.\n\nEl edificio ofrece amenities de primer nivel: piscina climatizada, gimnasio moderno, salón social y zonas verdes amplias. Su ubicación permite acceso rápido a centros comerciales, restaurantes y zonas de negocios.\n\nIdeal para familias ejecutivas que buscan comodidad, seguridad y un estilo de vida premium en el sur de la ciudad.",
      price: roundPrice(randFloat(650000000, 950000000)),
      area: randInt(110, 160),
      bedrooms: 3,
      bathrooms: 2,
      parking: 2,
      stratum: 6,
      ageYears: randInt(1, 6),
      floor: randInt(5, 18),
      floorsTotal: 22,
      furnished: false,
      petFriendly: true,
      featured: true,
      imageIds: [IMG.aptInt[0], IMG.living[0], IMG.kitchen[0], IMG.bedroom[0], IMG.modern[0]],
      amenitiesCount: 9,
      agentIdx: 0,
    },
    {
      cityCode: "MED",
      neighborhoodName: "Laureles",
      operation: "ARRIENDO",
      propertyType: "APARTAMENTO",
      title: "Apartamento moderno en Laureles, 3 habitaciones",
      shortDesc: "Cómodo apartamento amoblado en Laureles, cerca al Segundo Parque.",
      description:
        "Acogedor apartamento en arriendo en el tradicional sector de Laureles, a solo cinco minutos del Segundo Parque de Laureles y de la Avenida Nutibara. El inmueble cuenta con 3 habitaciones, 2 baños, cocina integral y balcón con vista a la zona verde interna.\n\nEl conjunto residencial ofrece portería 24 horas, ascensor, gimnasio y zona de lavandería. Es ideal para profesionales o familias que buscan tranquilidad sin alejarse del centro de la ciudad.\n\nEl contrato incluye administración y permite mascotas pequeñas.",
      price: roundPrice(randFloat(2200000, 3200000)),
      area: randInt(85, 105),
      bedrooms: 3,
      bathrooms: 2,
      parking: 1,
      stratum: 4,
      ageYears: randInt(5, 12),
      floor: randInt(2, 8),
      floorsTotal: 10,
      furnished: true,
      petFriendly: true,
      adminFee: 320000,
      imageIds: [IMG.aptInt[1], IMG.living[1], IMG.kitchen[1], IMG.bedroom[1]],
      amenitiesCount: 6,
      agentIdx: 0,
    },
    {
      cityCode: "MED",
      neighborhoodName: "Belén",
      operation: "VENTA",
      propertyType: "CASA",
      title: "Casa familiar amplia en Belén con jardín",
      shortDesc: "Casa de 4 habitaciones en Belén con patio y jardín privado.",
      description:
        "Amplia casa familiar ubicada en Belén, sector residencial consolidado con excelente conectividad. La propiedad cuenta con 4 habitaciones, 3 baños, estudio, sala-comedor amplio y cocina con barra americana.\n\nExteriormente ofrece jardín privado, garage techado para dos vehículos y zona de BBQ. Ideal para familias que disfrutan del aire libre sin salir de casa.\n\nCerca a colegios, centros comerciales como Viva Envigado y Aeropuerto Olaya Herrera.",
      price: roundPrice(randFloat(720000000, 980000000)),
      area: randInt(180, 240),
      bedrooms: 4,
      bathrooms: 3,
      parking: 2,
      stratum: 4,
      ageYears: randInt(8, 18),
      floorsTotal: 2,
      furnished: false,
      petFriendly: true,
      imageIds: [IMG.houseExt[0], IMG.living[0], IMG.kitchen[0], IMG.bedroom[0], IMG.bath[0]],
      amenitiesCount: 7,
      agentIdx: 1,
    },
    {
      cityCode: "MED",
      neighborhoodName: "Sabaneta",
      operation: "VENTA",
      propertyType: "APARTAMENTO",
      title: "Apartamento nuevo en Sabaneta con amenities",
      shortDesc: "Apartamento estreno en Sabaneta, 2 habitaciones, piso 12.",
      description:
        "Apartamento estreno en moderno edificio de Sabaneta, con excelentes acabados, cocina integral con electrodomésticos incluidos y piso en porcelanato. Cuenta con 2 habitaciones, la principal con baño privado y walk-in closet.\n\nEl edificio cuenta con piscina, gym, salón social, zona infantil y cancha deportiva. Administración incluye gas y agua.\n\nUbicado a 5 minutos del Mall Plaza Sabaneta y del Metro Sur.",
      price: roundPrice(randFloat(310000000, 420000000)),
      area: randInt(72, 88),
      bedrooms: 2,
      bathrooms: 2,
      parking: 1,
      stratum: 4,
      ageYears: 0,
      floor: randInt(4, 14),
      floorsTotal: 16,
      furnished: false,
      petFriendly: true,
      imageIds: [IMG.aptInt[2], IMG.kitchen[1], IMG.living[1], IMG.bedroom[0]],
      amenitiesCount: 8,
      agentIdx: 1,
    },
    {
      cityCode: "MED",
      neighborhoodName: "Los Conquistadores",
      operation: "ARRIENDO",
      propertyType: "APARTAESTUDIO",
      title: "Apartaestudio amoblado en Los Conquistadores",
      shortDesc: "Apartaestudio ideal para profesionales cerca al centro financiero.",
      description:
        "Bonito apartaestudio totalmente amoblado en el sector de Los Conquistadores, ideal para profesionales o estudiantes que buscan estar cerca del centro financiero de Medellín. Cuenta con cocina equipada, baño moderno y zona de trabajo.\n\nEl edificio ofrece gimnasio, lavandería comunitaria y recepción 24 horas. Incluye servicios de internet y TV.\n\nA 10 minutos a pie del Parque Lleras y de la estación Poblado del Metro.",
      price: roundPrice(randFloat(1300000, 1800000)),
      area: randInt(32, 42),
      bedrooms: 1,
      bathrooms: 1,
      parking: 0,
      stratum: 5,
      ageYears: randInt(2, 6),
      floor: randInt(3, 11),
      floorsTotal: 14,
      furnished: true,
      petFriendly: false,
      adminFee: 180000,
      imageIds: [IMG.modern[0], IMG.kitchen[0], IMG.bath[0]],
      amenitiesCount: 5,
      agentIdx: 0,
    },
    {
      cityCode: "MED",
      neighborhoodName: "Estadio",
      operation: "ARRIENDO",
      propertyType: "LOCAL",
      title: "Local comercial sobre Av. 70 en Estadio",
      shortDesc: "Local de 90 m² sobre la Avenida 70, alto tráfico peatonal.",
      description:
        "Local comercial estratégicamente ubicado sobre la Circunvalar (Av. 70), sector de alto tráfico peatonal y vehicular, ideal para restaurante, cafetería o tienda de moda. Cuenta con doble vitrina, baño privado y zona de bodegaje.\n\nEl sector de Estadio es uno de los más visitados de Medellín, con alta afluencia especialmente en horario nocturno y fines de semana.\n\nContrato mínimo de 24 meses con depósito de 2 mensualidades.",
      price: roundPrice(randFloat(6500000, 9500000)),
      area: 90,
      bathrooms: 1,
      parking: 0,
      stratum: 4,
      ageYears: randInt(5, 15),
      imageIds: [IMG.office[0], IMG.office[1]],
      amenitiesCount: 4,
      agentIdx: 1,
    },
    {
      cityCode: "MED",
      neighborhoodName: "Envigado",
      operation: "VENTA",
      propertyType: "CASA",
      title: "Casa con patio grande en Envigado",
      shortDesc: "Casa de 3 pisos en Envigado, ideal para familia grande.",
      description:
        "Espaciosa casa de 3 pisos en Envigado, con 4 habitaciones, sala, comedor, cocina integral, patio con zona de ropa y jardín. Cuenta además con estudio independiente en el tercer piso, ideal para home office.\n\nLa casa está ubicada en calle cerrada con portería, en sector tranquilo y residencial. Cercana a colegios, supermercados y parques.\n\nOportunidad de inversión para familias que buscan espacio y tranquilidad al sur del Valle de Aburrá.",
      price: roundPrice(randFloat(680000000, 920000000)),
      area: randInt(220, 280),
      bedrooms: 4,
      bathrooms: 3,
      parking: 2,
      stratum: 4,
      ageYears: randInt(10, 20),
      floorsTotal: 3,
      imageIds: [IMG.houseExt[1], IMG.living[1], IMG.kitchen[0], IMG.bedroom[1]],
      amenitiesCount: 6,
      agentIdx: 0,
    },
    {
      cityCode: "MED",
      neighborhoodName: "El Poblado",
      operation: "TEMPORAL",
      propertyType: "APARTAMENTO",
      title: "Apartamento amoblado vacacional en El Poblado",
      shortDesc: "Arriendo temporal para ejecutivos o turistas en El Poblado.",
      description:
        "Apartamento totalmente amoblado disponible para arriendo temporal en El Poblado, ideal para ejecutivos en viaje de negocios o turistas. Cuenta con 2 habitaciones, 2 baños, cocina equipada, lavadora y balcón con vista a la ciudad.\n\nEl edificio dispone de piscina, gimnasio, salón social y recepción 24 horas. Está a 5 minutos de la zona rosa de Parque Lleras y Provence.\n\nTarifa diaria, semanal o mensual. Incluye servicios públicos, internet y TV por cable.",
      price: roundPrice(randFloat(2800000, 4200000)),
      area: randInt(80, 95),
      bedrooms: 2,
      bathrooms: 2,
      parking: 1,
      stratum: 6,
      ageYears: randInt(2, 8),
      floor: randInt(6, 16),
      floorsTotal: 20,
      furnished: true,
      petFriendly: false,
      imageIds: [IMG.modern[1], IMG.living[0], IMG.kitchen[1], IMG.bedroom[0]],
      amenitiesCount: 8,
      agentIdx: 1,
    },

    // ----- BOGOTÁ (8) -----
    {
      cityCode: "BOG",
      neighborhoodName: "El Chico",
      operation: "VENTA",
      propertyType: "APARTAMENTO",
      title: "Apartamento de lujo en El Chico, 3 habitaciones",
      shortDesc: "Apartamento de alto nivel en El Chico, cerca a centros comerciales.",
      description:
        "Exclusivo apartamento en El Chico, una de las zonas más cotizadas del norte de Bogotá. Con 3 habitaciones, 3 baños, sala-comedor con chimenea, cocina con barra y balcón con vista a la zona verde del conjunto.\n\nEl edificio cuenta con doble altura en lobby, gimnasio, piscina climatizada, turco, sauna y salón social. Seguridad 24h con circuito cerrado de TV.\n\nA pasos de Andino, El Retiro y Atlantis Plaza. Opción de compra incluye depósito y cuarto útil.",
      price: roundPrice(randFloat(820000000, 980000000)),
      area: randInt(140, 170),
      bedrooms: 3,
      bathrooms: 3,
      parking: 2,
      stratum: 6,
      ageYears: randInt(3, 8),
      floor: randInt(7, 19),
      floorsTotal: 22,
      furnished: false,
      petFriendly: true,
      featured: true,
      imageIds: [IMG.aptInt[3], IMG.living[1], IMG.kitchen[0], IMG.bedroom[1], IMG.modern[2]],
      amenitiesCount: 10,
      agentIdx: 2,
    },
    {
      cityCode: "BOG",
      neighborhoodName: "Usaquén",
      operation: "VENTA",
      propertyType: "CASA",
      title: "Casa campestre en Usaquén con jardín amplio",
      shortDesc: "Casa de familia en Usaquén, 4 habitaciones y jardín de 200 m².",
      description:
        "Hermosa casa de familia en el tradicional barrio Usaquén, con amplio jardín, garage para 3 vehículos y 4 habitaciones. La casa conserva detalles clásicos como techos altos, chimenea y pisos en madera.\n\nCuenta con cocina renovada, estudio, sala de estar, comedor formal y zona de servicio independiente. Ideal para familias que valoran la tranquilidad y la cercanía al parque de Usaquén y a Hacienda Santa Bárbara.\n\nSector consolidado con todas las comodidades urbanas a la mano.",
      price: roundPrice(randFloat(1900000000, 2800000000)),
      area: randInt(280, 360),
      bedrooms: 4,
      bathrooms: 4,
      parking: 3,
      stratum: 6,
      ageYears: randInt(15, 30),
      floorsTotal: 2,
      furnished: false,
      petFriendly: true,
      featured: true,
      imageIds: [IMG.houseExt[2], IMG.living[0], IMG.kitchen[1], IMG.bedroom[0], IMG.pool[0]],
      amenitiesCount: 9,
      agentIdx: 2,
    },
    {
      cityCode: "BOG",
      neighborhoodName: "Chapinero",
      operation: "ARRIENDO",
      propertyType: "APARTAMENTO",
      title: "Apartamento en arriendo en Chapinero, 2 habitaciones",
      shortDesc: "Apartamento céntrico en Chapinero, ideal para profesionales.",
      description:
        "Apartamento en arriendo en pleno Chapinero, con 2 habitaciones, 1 baño, cocina integral y balcón. Ubicado en edificio con ascensor y portería. Excelente movilidad: a 3 cuadras de la Carrera Séptima y de la Calle 72.\n\nIdeal para profesionales o estudiantes universitarios gracias a su cercanía con universidades como Javeriana y Externado. Sector con todo tipo de comercio, restaurantes y servicios.\n\nContrato de 1 año con depósito de 1 mensualidad.",
      price: roundPrice(randFloat(1800000, 2600000)),
      area: randInt(60, 78),
      bedrooms: 2,
      bathrooms: 1,
      parking: 1,
      stratum: 4,
      ageYears: randInt(10, 25),
      floor: randInt(3, 9),
      floorsTotal: 12,
      furnished: false,
      petFriendly: false,
      adminFee: 220000,
      imageIds: [IMG.aptInt[4], IMG.living[1], IMG.kitchen[0]],
      amenitiesCount: 5,
      agentIdx: 3,
    },
    {
      cityCode: "BOG",
      neighborhoodName: "Suba",
      operation: "VENTA",
      propertyType: "APARTAMENTO",
      title: "Apartamento nuevo en Suba, zona La Gaitana",
      shortDesc: "Apartamento estreno en conjunto cerrado con amenities.",
      description:
        "Apartamento estreno en conjunto residencial cerrado en la zona de La Gaitana (Suba). 3 habitaciones, 2 baños, cocina integral, balcón y cuarto útil. Acabados modernos con piso en porcelanato.\n\nEl conjunto ofrece piscina, gimnasio, salón social, cancha múltiple, zona infantil y portería 24h. Administración económica.\n\nA 10 minutos de Centro Suba y de la estación NQS-Calle 75 de Transmilenio.",
      price: roundPrice(randFloat(240000000, 360000000)),
      area: randInt(78, 95),
      bedrooms: 3,
      bathrooms: 2,
      parking: 1,
      stratum: 3,
      ageYears: 0,
      floor: randInt(2, 12),
      floorsTotal: 14,
      furnished: false,
      petFriendly: true,
      imageIds: [IMG.aptInt[0], IMG.kitchen[1], IMG.living[0], IMG.bedroom[1]],
      amenitiesCount: 7,
      agentIdx: 3,
    },
    {
      cityCode: "BOG",
      neighborhoodName: "Teusaquillo",
      operation: "ARRIENDO",
      propertyType: "OFICINA",
      title: "Oficina en arriendo en Teusaquillo, 120 m²",
      shortDesc: "Oficina modular con baños privados en Teusaquillo.",
      description:
        "Oficina en arriendo en edificio institucional de Teusaquillo, con 120 m², distribuidos en recepción, 3 oficinas privadas, sala de juntas y zona de trabajo abierto. Cuenta con baños privados y cocina tipo kitchenette.\n\nEl edificio tiene portería 24h, 2 ascensores, planta eléctrica de emergencia y 4 parqueaderos visitantes. Ubicado a 5 minutos de la Carrera 13 y de la Universidad Nacional.\n\nContrato de 36 meses. Administración e impuestos aparte.",
      price: roundPrice(randFloat(5500000, 8500000)),
      area: 120,
      bathrooms: 2,
      parking: 2,
      stratum: 4,
      ageYears: randInt(5, 15),
      floor: randInt(2, 6),
      floorsTotal: 8,
      imageIds: [IMG.office[0], IMG.office[1]],
      amenitiesCount: 5,
      agentIdx: 2,
    },
    {
      cityCode: "BOG",
      neighborhoodName: "Kennedy",
      operation: "ARRIENDO",
      propertyType: "BODEGA",
      title: "Bodega industrial en Kennedy, 300 m²",
      shortDesc: "Bodega logística con andén y oficina en Kennedy Central.",
      description:
        "Bodega industrial en arriendo en el sector de Kennedy Central, con 300 m² de área construida, 7 metros de altura libre, andén de carga y descarga, oficina administrativa y baños separados para hombres y mujeres.\n\nLa bodega cuenta con portón eléctrico, energía trifásica, red contra incendios y circuito cerrado de TV. Parqueadero para 3 vehículos.\n\nExcelente ubicación con salida rápida a la Av. Primero de Mayo y a la Av. Boyacá.",
      price: roundPrice(randFloat(8000000, 14000000)),
      area: 300,
      bathrooms: 2,
      parking: 3,
      stratum: 3,
      ageYears: randInt(8, 18),
      imageIds: [IMG.office[1], IMG.land[0]],
      amenitiesCount: 4,
      agentIdx: 3,
    },
    {
      cityCode: "BOG",
      neighborhoodName: "Engativá",
      operation: "VENTA",
      propertyType: "LOTE",
      title: "Lote urbanizable en Engativá, 250 m²",
      shortDesc: "Lote plano con todos los servicios en sector consolidado.",
      description:
        "Lote urbano de 250 m² en Engativá, plano, con todos los servicios públicos instalados y vía pavimentada. Zona de uso residencial mixto, ideal para construcción de vivienda bifamiliar o pequeño proyecto.\n\nUbicado a 8 minutos del Aeropuerto El Dorado y de la Av. El Congreso. Sector en crecimiento con buena plusvalía.\n\nDocumentación al día, predial pagado y libre de gravámenes.",
      price: roundPrice(randFloat(280000000, 420000000)),
      area: 250,
      stratum: 3,
      ageYears: 0,
      published: false,
      status: "BORRADOR",
      imageIds: [IMG.land[0], IMG.land[1]],
      amenitiesCount: 3,
      agentIdx: 2,
    },
    {
      cityCode: "BOG",
      neighborhoodName: "Santa Bárbara",
      operation: "VENTA",
      propertyType: "APARTAMENTO",
      title: "Apartamento remodelado en Santa Bárbara, 3 habitaciones",
      shortDesc: "Apartamento con acabados premium en Santa Bárbara.",
      description:
        "Hermoso apartamento completamente remodelado en Santa Bárbara, con 3 habitaciones, 2 baños, cocina abierta con isla, sala-comedor con balcón y piso en madera. Cuenta con depósito y cuarto útil.\n\nEl edificio ofrece gimnasio, salón social, terraza BBQ y portería 24h. Ubicado a 5 minutos de Hacienda Santa Bárbara y del Country Club.\n\nIdeal para familias ejecutivas que buscan calidad de vida en el norte de Bogotá.",
      price: roundPrice(randFloat(720000000, 920000000)),
      area: randInt(120, 145),
      bedrooms: 3,
      bathrooms: 2,
      parking: 2,
      stratum: 5,
      ageYears: randInt(6, 14),
      floor: randInt(4, 12),
      floorsTotal: 14,
      furnished: false,
      petFriendly: true,
      imageIds: [IMG.aptInt[2], IMG.living[0], IMG.kitchen[0], IMG.bedroom[0], IMG.modern[3]],
      amenitiesCount: 8,
      agentIdx: 3,
    },

    // ----- BARRANQUILLA (6) -----
    {
      cityCode: "BQ",
      neighborhoodName: "Alto Prado",
      operation: "VENTA",
      propertyType: "CASA",
      title: "Casa estilo mediterráneo en Alto Prado",
      shortDesc: "Casa amplia en exclusivo Alto Prado con piscina.",
      description:
        "Espectacular casa estilo mediterráneo en el barrio Alto Prado, una de las zonas más tradicionales y exclusivas de Barranquilla. Cuenta con 5 habitaciones, 4 baños, sala, comedor, cocina con barra, estudio y terraza panorámica.\n\nEl exterior ofrece piscina, jardín tropical, garage para 3 vehículos y zona de BBQ. Acabados en mármol y madera.\n\nA 5 minutos del Mall Plaza Buenavista y de los mejores restaurantes de la ciudad.",
      price: roundPrice(randFloat(1500000000, 2200000000)),
      area: randInt(380, 460),
      bedrooms: 5,
      bathrooms: 4,
      parking: 3,
      stratum: 6,
      ageYears: randInt(5, 15),
      floorsTotal: 2,
      furnished: false,
      petFriendly: true,
      featured: true,
      imageIds: [IMG.houseExt[3], IMG.pool[0], IMG.living[0], IMG.kitchen[1], IMG.bedroom[0]],
      amenitiesCount: 10,
      agentIdx: 4,
    },
    {
      cityCode: "BQ",
      neighborhoodName: "Villa Country",
      operation: "ARRIENDO",
      propertyType: "APARTAMENTO",
      title: "Apartamento amoblado en Villa Country",
      shortDesc: "Apartamento de 2 habitaciones amoblado en Villa Country.",
      description:
        "Apartamento totalmente amoblado en arriendo en Villa Country, sector residencial consolidado y seguro de Barranquilla. 2 habitaciones, 2 baños, cocina integral, sala-comedor y balcón.\n\nEl conjunto ofrece piscina, gimnasio, salón social y portería 24h. A 5 minutos del Mall Buenos Aires y de la Av. Circunvalar.\n\nIncluye electrodomésticos y menaje completo. Ideal para ejecutivos relocados.",
      price: roundPrice(randFloat(2200000, 3100000)),
      area: randInt(85, 100),
      bedrooms: 2,
      bathrooms: 2,
      parking: 1,
      stratum: 5,
      ageYears: randInt(3, 10),
      floor: randInt(4, 12),
      floorsTotal: 14,
      furnished: true,
      petFriendly: false,
      adminFee: 350000,
      imageIds: [IMG.aptInt[1], IMG.kitchen[0], IMG.living[1], IMG.bedroom[1]],
      amenitiesCount: 7,
      agentIdx: 4,
    },
    {
      cityCode: "BQ",
      neighborhoodName: "El Country",
      operation: "VENTA",
      propertyType: "APARTAMENTO",
      title: "Apartamento de lujo en El Country, 4 habitaciones",
      shortDesc: "Apartamento con vista al mar en El Country de Barranquilla.",
      description:
        "Apartamento de lujo en El Country, con 4 habitaciones, 4 baños, sala-comedor con vista al mar Caribe, cocina de diseño con electrodomésticos de alta gama y balcón panorámico. Cuenta con depósito y 2 parqueaderos.\n\nEl edificio cuenta con piscina infinita, gimnasio con vista, spa, sauna, salón social y helipuerto. Seguridad 24h con control de acceso biométrico.\n\nUna oportunidad única para vivir frente al mar en una de las torres más exclusivas de la Costa Caribe.",
      price: roundPrice(randFloat(1200000000, 1850000000)),
      area: randInt(220, 280),
      bedrooms: 4,
      bathrooms: 4,
      parking: 2,
      stratum: 6,
      ageYears: randInt(1, 5),
      floor: randInt(15, 28),
      floorsTotal: 32,
      furnished: false,
      petFriendly: true,
      featured: true,
      imageIds: [IMG.aptInt[4], IMG.living[0], IMG.kitchen[1], IMG.bedroom[0], IMG.pool[1]],
      amenitiesCount: 11,
      agentIdx: 5,
    },
    {
      cityCode: "BQ",
      neighborhoodName: "Norte",
      operation: "ARRIENDO",
      propertyType: "LOCAL",
      title: "Local sobre Vía 40 en sector Norte",
      shortDesc: "Local comercial de 120 m² con vitrina sobre Vía 40.",
      description:
        "Local comercial en arriendo sobre la Carrera 46 (Vía 40), sector de alto tráfico vehicular y peatonal de Barranquilla. 120 m² con doble vitrina, baño privado, almacén y altura libre de 4 metros.\n\nIdeal para franquicias de comida, moda o servicios financieros. Cuenta con energía trifásica y rampa para discapacitados.\n\nA 5 minutos del Buenavista y de la zona financiera de la ciudad.",
      price: roundPrice(randFloat(8000000, 14000000)),
      area: 120,
      bathrooms: 1,
      parking: 2,
      stratum: 4,
      ageYears: randInt(3, 12),
      imageIds: [IMG.office[0], IMG.office[1]],
      amenitiesCount: 4,
      agentIdx: 5,
    },
    {
      cityCode: "BQ",
      neighborhoodName: "Altos del Country",
      operation: "VENTA",
      propertyType: "CASA",
      title: "Casa moderna en Altos del Country con piscina",
      shortDesc: "Casa de diseño en conjunto cerrado con piscina y jardín.",
      description:
        "Casa moderna en Altos del Country, conjunto cerrado con portería 24h. 4 habitaciones, 4 baños, sala doble, cocina con isla, terraza con BBQ y piscina propia. Acabados en mármol, porcelanato y madera.\n\nEl conjunto ofrece cancha de tenis, zona infantil, salón social y zonas verdes amplias. Cuenta con garaje para 3 vehículos.\n\nExcelente ubicación a 10 minutos del Aeropuerto Ernesto Cortissoz y del sector comercial.",
      price: roundPrice(randFloat(980000000, 1450000000)),
      area: randInt(320, 410),
      bedrooms: 4,
      bathrooms: 4,
      parking: 3,
      stratum: 6,
      ageYears: randInt(3, 10),
      floorsTotal: 2,
      furnished: false,
      petFriendly: true,
      imageIds: [IMG.houseExt[4], IMG.pool[0], IMG.living[1], IMG.kitchen[0], IMG.bedroom[1]],
      amenitiesCount: 9,
      agentIdx: 4,
    },
    {
      cityCode: "BQ",
      neighborhoodName: "Riomar",
      operation: "ARRIENDO",
      propertyType: "APARTAMENTO",
      title: "Apartamento ejecutivo en Riomar",
      shortDesc: "Apartamento amoblado en torre premium de Riomar.",
      description:
        "Apartamento ejecutivo amoblado en arriendo en torre premium de Riomar. 3 habitaciones, 2 baños, cocina integral, sala-comedor con balcón y vista a la ciudad. Edificio con piscina, gimnasio, spa y salón social.\n\nA 10 minutos del centro financiero de Barranquilla y del Mall Buenavista. Incluye servicios, internet y TV.\n\nIdeal para ejecutivos o familias relocadas. Contrato mínimo 6 meses.",
      price: roundPrice(randFloat(3500000, 4500000)),
      area: randInt(110, 130),
      bedrooms: 3,
      bathrooms: 2,
      parking: 2,
      stratum: 6,
      ageYears: randInt(2, 7),
      floor: randInt(8, 20),
      floorsTotal: 24,
      furnished: true,
      petFriendly: true,
      adminFee: 480000,
      imageIds: [IMG.modern[2], IMG.living[0], IMG.kitchen[1], IMG.bedroom[0]],
      amenitiesCount: 8,
      agentIdx: 5,
    },

    // ----- CALI (6) -----
    {
      cityCode: "CALI",
      neighborhoodName: "Granada",
      operation: "VENTA",
      propertyType: "APARTAMENTO",
      title: "Apartamento remodelado en Granada, 3 habitaciones",
      shortDesc: "Apartamento en el tradicional barrio Granada de Cali.",
      description:
        "Apartamento completamente remodelado en el tradicional barrio Granada, una de las zonas gastronómicas y culturales más importantes de Cali. 3 habitaciones, 2 baños, cocina con barra americana, sala-comedor y balcón.\n\nAcabados de alta calidad con piso en madera, cocina en cuarzo y baños modernos. Edificio con ascensor y portería.\n\nA pasos de restaurantes, cafés, galerías de arte y el Museo La Tertulia.",
      price: roundPrice(randFloat(420000000, 580000000)),
      area: randInt(110, 130),
      bedrooms: 3,
      bathrooms: 2,
      parking: 2,
      stratum: 5,
      ageYears: randInt(8, 20),
      floor: randInt(3, 8),
      floorsTotal: 10,
      furnished: false,
      petFriendly: true,
      imageIds: [IMG.aptInt[2], IMG.kitchen[0], IMG.living[1], IMG.bedroom[0]],
      amenitiesCount: 6,
      agentIdx: 2,
    },
    {
      cityCode: "CALI",
      neighborhoodName: "Ciudad Jardín",
      operation: "VENTA",
      propertyType: "CASA",
      title: "Casa en conjunto cerrado Ciudad Jardín",
      shortDesc: "Casa de 4 habitaciones en Ciudad Jardín con piscina.",
      description:
        "Hermosa casa en conjunto cerrado Ciudad Jardín, el sector residencial más cotizado de Cali. 4 habitaciones, 4 baños, sala-comedor, cocina con isla, estudio y terraza con piscina.\n\nEl conjunto ofrece portería 24h, cancha de tenis, cancha de fútbol, zona infantil, gym y salón social. Zonas verdes amplias y ambiente familiar.\n\nCercana a centros comerciales Jardín Plaza y Unicentro, y a los mejores colegios bilingües de la ciudad.",
      price: roundPrice(randFloat(980000000, 1500000000)),
      area: randInt(290, 360),
      bedrooms: 4,
      bathrooms: 4,
      parking: 3,
      stratum: 6,
      ageYears: randInt(3, 10),
      floorsTotal: 2,
      furnished: false,
      petFriendly: true,
      featured: true,
      imageIds: [IMG.houseExt[5], IMG.pool[1], IMG.living[0], IMG.kitchen[1], IMG.bedroom[1]],
      amenitiesCount: 10,
      agentIdx: 3,
    },
    {
      cityCode: "CALI",
      neighborhoodName: "San Antonio",
      operation: "ARRIENDO",
      propertyType: "APARTAMENTO",
      title: "Apartamento bohemio en San Antonio, 2 habitaciones",
      shortDesc: "Apartamento con encanto en el histórico San Antonio.",
      description:
        "Apartamento con encanto en arriendo en el histórico barrio San Antonio, conocido por su ambiente bohemio, restaurantes, cafés y arte callejero. 2 habitaciones, 1 baño, cocina equipada y terraza con vista a la ciudad.\n\nEl edificio es una casona republicana restaurada con detalles como techos altos, baldosas originales y patios internos.\n\nA pasos del Parque de San Antonio y del centro histórico de Cali. Ideal para profesionales creativos o extranjeros.",
      price: roundPrice(randFloat(1500000, 2200000)),
      area: randInt(70, 90),
      bedrooms: 2,
      bathrooms: 1,
      parking: 0,
      stratum: 3,
      ageYears: randInt(20, 50),
      floor: 2,
      floorsTotal: 3,
      furnished: true,
      petFriendly: true,
      adminFee: 180000,
      imageIds: [IMG.aptInt[3], IMG.living[0], IMG.kitchen[1]],
      amenitiesCount: 4,
      agentIdx: 2,
    },
    {
      cityCode: "CALI",
      neighborhoodName: "Pance",
      operation: "VENTA",
      propertyType: "CAMPESTRE",
      title: "Casa campestre amplia en zona verde de Pance",
      shortDesc: "Finca campestre de 2.500 m² de lote en el sur de Cali.",
      description:
        "Hermosa casa campestre en el sector de Pance, al sur de Cali, sobre lote de 2.500 m² con zonas verdes amplias, jardín tropical y piscina. La casa cuenta con 4 habitaciones, 3 baños, sala-comedor abierta, cocina amplia, terraza y zona de BBQ.\n\nIdeal para familias que buscan tranquilidad, aire puro y contacto con la naturaleza sin salir de la ciudad. Acceso pavimentado y todos los servicios.\n\nA 40 minutos del centro de Cali y a 15 minutos del club campestre.",
      price: roundPrice(randFloat(1200000000, 1900000000)),
      area: randInt(280, 380),
      bedrooms: 4,
      bathrooms: 3,
      parking: 4,
      stratum: 6,
      ageYears: randInt(5, 15),
      floorsTotal: 2,
      furnished: false,
      petFriendly: true,
      imageIds: [IMG.houseExt[6], IMG.pool[0], IMG.living[1], IMG.kitchen[0], IMG.bedroom[0]],
      amenitiesCount: 8,
      agentIdx: 3,
    },
    {
      cityCode: "CALI",
      neighborhoodName: "Champagnat",
      operation: "ARRIENDO",
      propertyType: "APARTAESTUDIO",
      title: "Apartaestudio amoblado en Champagnat",
      shortDesc: "Estudio moderno cerca a centros comerciales del norte.",
      description:
        "Acogedor apartaestudio amoblado en arriendo en el barrio Champagnat, norte de Cali. Cocina equipada, baño moderno y zona de descanso integrada. El edificio ofrece gym, lavandería y recepción 24h.\n\nCercano a centros comerciales Chipichape y Jardín Plaza, además de zonas gastronómicas de Granada y el Peñón.\n\nIdeal para profesionales jóvenes o estudiantes. Incluye servicios y internet.",
      price: roundPrice(randFloat(1300000, 1800000)),
      area: randInt(35, 45),
      bedrooms: 1,
      bathrooms: 1,
      parking: 0,
      stratum: 5,
      ageYears: randInt(1, 5),
      floor: randInt(4, 12),
      floorsTotal: 14,
      furnished: true,
      petFriendly: false,
      adminFee: 200000,
      imageIds: [IMG.modern[3], IMG.kitchen[0], IMG.bath[0]],
      amenitiesCount: 5,
      agentIdx: 2,
    },
    {
      cityCode: "CALI",
      neighborhoodName: "El Peñón",
      operation: "VENTA",
      propertyType: "CASA",
      title: "Casa colonial restaurada en El Peñón",
      shortDesc: "Casa de estilo republicano en el histórico El Peñón.",
      description:
        "Hermosa casa de estilo republicano restaurada en el barrio El Peñón, uno de los sectores más tradicionales y con mayor patrimonio histórico de Cali. 3 habitaciones, 3 baños, sala, comedor, cocina, patio interno con fuente y terraza con vista a la ciudad.\n\nLa casa conserva detalles originales como techos altos, baldosas de época y ventanales con vitrales. Restauración impecable con materiales de época.\n\nCercana a restaurantes, teatros y centros culturales. Una joya arquitectónica en el corazón de Cali.",
      price: roundPrice(randFloat(950000000, 1400000000)),
      area: randInt(220, 280),
      bedrooms: 3,
      bathrooms: 3,
      parking: 2,
      stratum: 5,
      ageYears: randInt(40, 80),
      floorsTotal: 2,
      furnished: false,
      petFriendly: false,
      imageIds: [IMG.houseExt[7], IMG.living[0], IMG.kitchen[1], IMG.bedroom[0]],
      amenitiesCount: 6,
      agentIdx: 3,
    },

    // ----- CARTAGENA (5) -----
    {
      cityCode: "CTG",
      neighborhoodName: "Bocagrande",
      operation: "VENTA",
      propertyType: "APARTAMENTO",
      title: "Apartamento frente al mar en Bocagrande",
      shortDesc: "Apartamento con vista al mar Caribe en Bocagrande.",
      description:
        "Espectacular apartamento frente al mar en Bocagrande, Cartagena. 3 habitaciones, 3 baños, sala-comedor con balcón con vista al mar Caribe, cocina abierta y zona de ropa. Piso en porcelanato y acabados modernos.\n\nEl edificio cuenta con piscina, gym, sauna, salón social, business center y portería 24h. A pasos de la playa y de la zona hotelera.\n\nExcelente oportunidad de inversión para renta vacacional o vivienda de descanso.",
      price: roundPrice(randFloat(820000000, 1200000000)),
      area: randInt(130, 160),
      bedrooms: 3,
      bathrooms: 3,
      parking: 1,
      stratum: 6,
      ageYears: randInt(3, 10),
      floor: randInt(10, 22),
      floorsTotal: 26,
      furnished: false,
      petFriendly: false,
      featured: true,
      imageIds: [IMG.aptInt[0], IMG.pool[0], IMG.living[1], IMG.kitchen[0], IMG.bedroom[0]],
      amenitiesCount: 9,
      agentIdx: 4,
    },
    {
      cityCode: "CTG",
      neighborhoodName: "Castillogrande",
      operation: "TEMPORAL",
      propertyType: "APARTAMENTO",
      title: "Apartamento amoblado vacacional en Castillogrande",
      shortDesc: "Renta temporal a 1 cuadra de la playa en Castillogrande.",
      description:
        "Apartamento amoblado disponible para arriendo temporal en Castillogrande, a una cuadra de la playa. 2 habitaciones, 2 baños, cocina equipada, sala-comedor y balcón con vista a la bahía.\n\nEdificio con piscina, gym, salón social y portería 24h. Incluye servicios, internet, TV, menaje completo y limpieza semanal.\n\nTarifa diaria, semanal o mensual. Ideal para vacaciones familiares o viajeros de negocios en Cartagena.",
      price: roundPrice(randFloat(3200000, 4500000)),
      area: randInt(90, 110),
      bedrooms: 2,
      bathrooms: 2,
      parking: 1,
      stratum: 6,
      ageYears: randInt(4, 10),
      floor: randInt(6, 16),
      floorsTotal: 20,
      furnished: true,
      petFriendly: false,
      imageIds: [IMG.aptInt[1], IMG.living[0], IMG.kitchen[1], IMG.bedroom[1], IMG.pool[1]],
      amenitiesCount: 8,
      agentIdx: 5,
    },
    {
      cityCode: "CTG",
      neighborhoodName: "Centro Histórico",
      operation: "VENTA",
      propertyType: "CASA",
      title: "Casa colonial en el Centro Histórico de Cartagena",
      shortDesc: "Casa colonial restaurada en el corazón amurallado.",
      description:
        "Magnífica casa colonial restaurada en el Centro Histórico de Cartagena, declarado Patrimonio de la Humanidad por la UNESCO. La casa conserva detalles originales como tejas, balcones en madera, patios andaluces y fuentes coloniales.\n\nCuenta con 4 habitaciones con baño privado, sala, comedor, cocina gourmet, terraza panorámica con piscina y vista a las murallas. Una oportunidad única para vivienda o boutique hotel.\n\nRestauración impecable respetando el patrimonio arquitectónico.",
      price: roundPrice(randFloat(2500000000, 3500000000)),
      area: randInt(380, 480),
      bedrooms: 4,
      bathrooms: 5,
      parking: 1,
      stratum: 6,
      ageYears: randInt(150, 300),
      floorsTotal: 2,
      furnished: false,
      petFriendly: false,
      featured: true,
      imageIds: [IMG.houseExt[0], IMG.pool[0], IMG.living[1], IMG.kitchen[0], IMG.bedroom[0]],
      amenitiesCount: 8,
      agentIdx: 4,
    },
    {
      cityCode: "CTG",
      neighborhoodName: "Manga",
      operation: "VENTA",
      propertyType: "CASA",
      title: "Casa republicana en Manga con patio amplio",
      shortDesc: "Casa tradicional republicana restaurada en Manga.",
      description:
        "Hermosa casa republicana restaurada en el barrio Manga, sector tradicional residencial de Cartagena. 4 habitaciones, 4 baños, sala, comedor, cocina, patio con jardín y piscina.\n\nLa casa conserva la arquitectura original con techos altos, ventanales y pisos de baldosa hidráulica. Mezcla perfecta entre lo clásico y la comodidad moderna.\n\nUbicada a 5 minutos de Getsemaní y del Centro Histórico. Sector tranquilo y residencial.",
      price: roundPrice(randFloat(1200000000, 1900000000)),
      area: randInt(320, 400),
      bedrooms: 4,
      bathrooms: 4,
      parking: 3,
      stratum: 6,
      ageYears: randInt(70, 110),
      floorsTotal: 2,
      furnished: false,
      petFriendly: true,
      imageIds: [IMG.houseExt[2], IMG.pool[1], IMG.living[0], IMG.kitchen[1], IMG.bedroom[1]],
      amenitiesCount: 7,
      agentIdx: 5,
    },
    {
      cityCode: "CTG",
      neighborhoodName: "El Laguito",
      operation: "ARRIENDO",
      propertyType: "APARTAMENTO",
      title: "Apartamento turístico en El Laguito",
      shortDesc: "Apartamento amoblado para ejecutivos o turistas en El Laguito.",
      description:
        "Apartamento amoblado en arriendo en El Laguito, sector turístico por excelencia de Cartagena. 2 habitaciones, 2 baños, cocina equipada, sala-comedor y balcón con vista a la bahía de Cartagena.\n\nEl edificio ofrece piscina, gym, sauna y recepción 24h. Incluye servicios, internet y TV. Tarifa mensual.\n\nA pasos de la playa de El Laguito y de la zona hotelera. Ideal para ejecutivos relocados o estadías largas.",
      price: roundPrice(randFloat(2800000, 3800000)),
      area: randInt(85, 100),
      bedrooms: 2,
      bathrooms: 2,
      parking: 1,
      stratum: 6,
      ageYears: randInt(5, 12),
      floor: randInt(7, 18),
      floorsTotal: 22,
      furnished: true,
      petFriendly: false,
      adminFee: 420000,
      imageIds: [IMG.modern[0], IMG.living[1], IMG.kitchen[0], IMG.bedroom[0]],
      amenitiesCount: 7,
      agentIdx: 4,
    },

    // ----- BUCARAMANGA (3) -----
    {
      cityCode: "BGA",
      neighborhoodName: "Cabecera",
      operation: "VENTA",
      propertyType: "APARTAMENTO",
      title: "Apartamento en Cabecera del Llano, 3 habitaciones",
      shortDesc: "Apartamento céntrico en Cabecera con vista a la meseta.",
      description:
        "Apartamento en venta en el sector de Cabecera del Llano, zona comercial y residencial de Bucaramanga. 3 habitaciones, 2 baños, cocina integral, sala-comedor y balcón con vista a la meseta de Bucaramanga.\n\nEl edificio cuenta con ascensor, gym, salón social y portería 24h. A 5 minutos del Centro Comercial Cabecera y del parque Mejoradero.\n\nIdeal para familias o profesionales que buscan comodidad en el corazón de la ciudad.",
      price: roundPrice(randFloat(380000000, 520000000)),
      area: randInt(95, 120),
      bedrooms: 3,
      bathrooms: 2,
      parking: 2,
      stratum: 5,
      ageYears: randInt(4, 12),
      floor: randInt(4, 14),
      floorsTotal: 16,
      furnished: false,
      petFriendly: true,
      imageIds: [IMG.aptInt[2], IMG.living[0], IMG.kitchen[1], IMG.bedroom[1]],
      amenitiesCount: 7,
      agentIdx: 0,
    },
    {
      cityCode: "BGA",
      neighborhoodName: "Provenza",
      operation: "ARRIENDO",
      propertyType: "APARTAMENTO",
      title: "Apartamento en arriendo en Provenza, 2 habitaciones",
      shortDesc: "Apartamento con balcón en Provenza, zona universitaria.",
      description:
        "Apartamento en arriendo en Provenza, sector universitario y gastronómico de Bucaramanga. 2 habitaciones, 1 baño, cocina integral, sala-comedor y balcón. Edificio con ascensor.\n\nIdeal para estudiantes o profesionales jóvenes. Cercano a la Universidad Industrial de Santander (UIS) y a la zona rosa de Cabecera.\n\nContrato de 1 año con depósito. Incluye cocina equipada con estufa y horno.",
      price: roundPrice(randFloat(1500000, 2100000)),
      area: randInt(65, 80),
      bedrooms: 2,
      bathrooms: 1,
      parking: 1,
      stratum: 4,
      ageYears: randInt(8, 18),
      floor: randInt(2, 8),
      floorsTotal: 10,
      furnished: false,
      petFriendly: false,
      adminFee: 200000,
      imageIds: [IMG.aptInt[3], IMG.kitchen[0], IMG.living[1]],
      amenitiesCount: 4,
      agentIdx: 1,
    },
    {
      cityCode: "BGA",
      neighborhoodName: "Sotomayor",
      operation: "VENTA",
      propertyType: "CASA",
      title: "Casa familiar en Sotomayor con patio",
      shortDesc: "Casa de 4 habitaciones en sector residencial de Sotomayor.",
      description:
        "Amplia casa familiar en Sotomayor, sector residencial consolidado del norte de Bucaramanga. 4 habitaciones, 3 baños, sala-comedor, cocina con barra, patio trasero y garage para 2 vehículos.\n\nCerca a centros comerciales, colegios y parques. Sector tranquilo con buena plusvalía.\n\nLa casa cuenta con cerramiento perimetral y portón eléctrico.",
      price: roundPrice(randFloat(580000000, 780000000)),
      area: randInt(180, 230),
      bedrooms: 4,
      bathrooms: 3,
      parking: 2,
      stratum: 4,
      ageYears: randInt(10, 20),
      floorsTotal: 2,
      furnished: false,
      petFriendly: true,
      imageIds: [IMG.houseExt[1], IMG.living[0], IMG.kitchen[1], IMG.bedroom[0]],
      amenitiesCount: 6,
      agentIdx: 0,
    },

    // ----- MANIZALES (3) -----
    {
      cityCode: "MZL",
      neighborhoodName: "El Cable",
      operation: "VENTA",
      propertyType: "APARTAMENTO",
      title: "Apartamento en El Cable, 3 habitaciones",
      shortDesc: "Apartamento céntrico en El Cable, Manizales.",
      description:
        "Apartamento en venta en El Cable, zona comercial y residencial de Manizales. 3 habitaciones, 2 baños, cocina integral, sala-comedor con balcón y vista a la cordillera. Edificio con ascensor y portería.\n\nEl sector de El Cable ofrece todos los servicios: centros comerciales, restaurantes, bancos y clínicas. A 10 minutos del centro histórico.\n\nIdeal para familias o profesionales que buscan vivir en una zona céntrica y activa.",
      price: roundPrice(randFloat(280000000, 380000000)),
      area: randInt(85, 105),
      bedrooms: 3,
      bathrooms: 2,
      parking: 1,
      stratum: 4,
      ageYears: randInt(5, 15),
      floor: randInt(3, 10),
      floorsTotal: 12,
      furnished: false,
      petFriendly: false,
      imageIds: [IMG.aptInt[4], IMG.living[1], IMG.kitchen[0], IMG.bedroom[1]],
      amenitiesCount: 5,
      agentIdx: 2,
    },
    {
      cityCode: "MZL",
      neighborhoodName: "Batallón",
      operation: "ARRIENDO",
      propertyType: "APARTAESTUDIO",
      title: "Apartaestudio amoblado en Batallón",
      shortDesc: "Estudio amoblado cerca a la Universidad de Caldas.",
      description:
        "Acogedor apartaestudio amoblado en arriendo en el sector Batallón, cerca a la Universidad de Caldas. Cocina equipada, baño con ducha, zona de estudio y descanso. Edificio con recepción 24h.\n\nIncluye servicios, internet y TV. Ideal para estudiantes universitarios o profesionales jóvenes.\n\nA 5 minutos de la zona céntrica y de la Universidad Nacional sede Manizales.",
      price: roundPrice(randFloat(900000, 1300000)),
      area: randInt(28, 38),
      bedrooms: 1,
      bathrooms: 1,
      parking: 0,
      stratum: 3,
      ageYears: randInt(3, 10),
      floor: randInt(2, 7),
      floorsTotal: 9,
      furnished: true,
      petFriendly: false,
      adminFee: 130000,
      imageIds: [IMG.modern[1], IMG.kitchen[1], IMG.bath[0]],
      amenitiesCount: 4,
      agentIdx: 3,
    },
    {
      cityCode: "MZL",
      neighborhoodName: "Tesalia",
      operation: "VENTA",
      propertyType: "FINCA",
      title: "Finca cafetera en Tesalia, Manizales",
      shortDesc: "Finca cafetera de 5 hectáreas con casa principal.",
      description:
        "Hermosa finca cafetera en Tesalia, a 30 minutos de Manizales, sobre lote de 5 hectáreas con plantación de café, zonas verdes, nacederos de agua y vista a la cordillera central.\n\nLa casa principal cuenta con 3 habitaciones, 2 baños, sala-comedor, cocina amplia y terraza panorámica. Incluye casa del casero y bodega de procesamiento de café.\n\nIdeal para inversión en turismo rural o producción cafetera. Acceso pavimentado y servicios públicos.",
      price: roundPrice(randFloat(650000000, 980000000)),
      area: 50000,
      builtArea: 220,
      bedrooms: 3,
      bathrooms: 2,
      parking: 3,
      stratum: 2,
      ageYears: randInt(10, 25),
      floorsTotal: 1,
      furnished: false,
      petFriendly: true,
      featured: true,
      imageIds: [IMG.houseExt[3], IMG.land[0], IMG.land[1], IMG.living[0]],
      amenitiesCount: 5,
      agentIdx: 2,
    },

    // ----- PEREIRA (3) -----
    {
      cityCode: "PEI",
      neighborhoodName: "San Nicolás",
      operation: "VENTA",
      propertyType: "APARTAMENTO",
      title: "Apartamento nuevo en San Nicolás, Pereira",
      shortDesc: "Apartamento estreno con amenities en San Nicolás.",
      description:
        "Apartamento estreno en moderno conjunto residencial de San Nicolás, Pereira. 3 habitaciones, 2 baños, cocina integral, sala-comedor y balcón. Edificio con piscina, gym, salón social y zona infantil.\n\nEl conjunto está ubicado en zona de alta plusvalía, cercana a centros comerciales y vías principales.\n\nIdeal para familias que buscan estrenar en una zona tranquila y bien ubicada de Pereira.",
      price: roundPrice(randFloat(320000000, 420000000)),
      area: randInt(82, 98),
      bedrooms: 3,
      bathrooms: 2,
      parking: 1,
      stratum: 4,
      ageYears: 0,
      floor: randInt(3, 12),
      floorsTotal: 14,
      furnished: false,
      petFriendly: true,
      imageIds: [IMG.aptInt[0], IMG.kitchen[1], IMG.living[0], IMG.bedroom[1]],
      amenitiesCount: 7,
      agentIdx: 3,
    },
    {
      cityCode: "PEI",
      neighborhoodName: "Olympica",
      operation: "ARRIENDO",
      propertyType: "CASA",
      title: "Casa en arriendo en Olímpica, 3 habitaciones",
      shortDesc: "Casa con patio amplio en sector residencial Olímpica.",
      description:
        "Casa en arriendo en el barrio Olímpica, sector residencial tradicional de Pereira. 3 habitaciones, 2 baños, sala, comedor, cocina, patio con zona de ropa y garage para 2 vehículos.\n\nLa casa cuenta con pisos en cerámica, cocina con barra y baños modernos. Cercana a colegios y supermercados.\n\nContrato de 1 año con depósito. A 10 minutos del centro de Pereira.",
      price: roundPrice(randFloat(1800000, 2600000)),
      area: randInt(150, 190),
      bedrooms: 3,
      bathrooms: 2,
      parking: 2,
      stratum: 4,
      ageYears: randInt(8, 18),
      floorsTotal: 1,
      furnished: false,
      petFriendly: true,
      adminFee: 250000,
      imageIds: [IMG.houseExt[4], IMG.living[1], IMG.kitchen[0], IMG.bedroom[0]],
      amenitiesCount: 5,
      agentIdx: 2,
    },
    {
      cityCode: "PEI",
      neighborhoodName: "Pinares",
      operation: "VENTA",
      propertyType: "CAMPESTRE",
      title: "Casa campestre en Pinares, Pereira",
      shortDesc: "Casa campestre de 1.800 m² de lote en Pinares.",
      description:
        "Hermosa casa campestre en Pinares, sector de clima agradable al sur de Pereira. Sobre lote de 1.800 m² con zonas verdes, jardín y piscina. La casa cuenta con 3 habitaciones, 2 baños, sala-comedor, cocina y terraza cubierta.\n\nIdeal para vivienda de descanso o para familias que buscan tranquilidad. Vía pavimentada y servicios públicos.\n\nA 20 minutos del aeropuerto Matecaña y del centro de Pereira.",
      price: roundPrice(randFloat(680000000, 920000000)),
      area: 1800,
      builtArea: 180,
      bedrooms: 3,
      bathrooms: 2,
      parking: 3,
      stratum: 5,
      ageYears: randInt(5, 15),
      floorsTotal: 1,
      furnished: false,
      petFriendly: true,
      imageIds: [IMG.houseExt[5], IMG.pool[1], IMG.living[0], IMG.kitchen[1]],
      amenitiesCount: 6,
      agentIdx: 3,
    },

    // ----- ARMENIA (3) -----
    {
      cityCode: "ARM",
      neighborhoodName: "La Castellana",
      operation: "VENTA",
      propertyType: "APARTAMENTO",
      title: "Apartamento en La Castellana, Armenia, 3 habitaciones",
      shortDesc: "Apartamento céntrico en La Castellana, cerca al centro.",
      description:
        "Apartamento en venta en La Castellana, sector céntrico y comercial de Armenia. 3 habitaciones, 2 baños, cocina integral, sala-comedor y balcón. Edificio con ascensor y portería 24h.\n\nUbicado a 5 minutos del centro histórico y de la plaza de Bolívar. Cercano a bancos, comercios y restaurantes.\n\nIdeal para familias o profesionales que buscan comodidad urbana.",
      price: roundPrice(randFloat(220000000, 310000000)),
      area: randInt(78, 95),
      bedrooms: 3,
      bathrooms: 2,
      parking: 1,
      stratum: 4,
      ageYears: randInt(5, 15),
      floor: randInt(2, 9),
      floorsTotal: 11,
      furnished: false,
      petFriendly: false,
      imageIds: [IMG.aptInt[1], IMG.kitchen[0], IMG.living[1], IMG.bedroom[1]],
      amenitiesCount: 5,
      agentIdx: 4,
    },
    {
      cityCode: "ARM",
      neighborhoodName: "El Edén",
      operation: "VENTA",
      propertyType: "FINCA",
      title: "Finca cafetera turística en El Edén, Armenia",
      shortDesc: "Finca cafetera con casa principal y casa de huéspedes.",
      description:
        "Hermosa finca cafetera en el sector El Edén, cerca al aeropuerto de Armenia. Sobre lote de 4 hectáreas con plantación de café, plátano y frutales. Cuenta con casa principal (3 habitaciones) y casa de huéspedes independiente (2 habitaciones).\n\nLa finca tiene nacederos de agua, piscina natural, kiosco de BBQ y vista panorámica al valle del Quindío. Ideal para turismo rural o vivienda campestre.\n\nAcceso pavimentado y servicios públicos. A 15 minutos del centro de Armenia.",
      price: roundPrice(randFloat(1200000000, 1900000000)),
      area: 40000,
      builtArea: 320,
      bedrooms: 5,
      bathrooms: 4,
      parking: 4,
      stratum: 3,
      ageYears: randInt(10, 25),
      floorsTotal: 1,
      furnished: false,
      petFriendly: true,
      imageIds: [IMG.houseExt[6], IMG.pool[0], IMG.land[0], IMG.living[1], IMG.bedroom[0]],
      amenitiesCount: 8,
      agentIdx: 5,
    },
    {
      cityCode: "ARM",
      neighborhoodName: "Aviación",
      operation: "ARRIENDO",
      propertyType: "LOCAL",
      title: "Local comercial sobre Av. Bolívar en Aviación",
      shortDesc: "Local de 70 m² con vitrina en sector comercial.",
      description:
        "Local comercial en arriendo sobre la Avenida Bolívar (sector Aviación), Armenia. 70 m² con vitrina, baño privado y zona de almacén. Ideal para retail, cafetería o servicios.\n\nSector de alto tráfico vehicular y peatonal, cercano al centro comercial y a la zona bancaria.\n\nContrato mínimo 24 meses con depósito.",
      price: roundPrice(randFloat(3500000, 5500000)),
      area: 70,
      bathrooms: 1,
      parking: 0,
      stratum: 4,
      ageYears: randInt(5, 15),
      imageIds: [IMG.office[1]],
      amenitiesCount: 3,
      agentIdx: 4,
    },

    // ----- SANTA MARTA (3) -----
    {
      cityCode: "STA",
      neighborhoodName: "El Rodadero",
      operation: "TEMPORAL",
      propertyType: "APARTAMENTO",
      title: "Apartamento vacacional frente al mar en El Rodadero",
      shortDesc: "Renta temporal con vista al mar en El Rodadero.",
      description:
        "Apartamento amoblado disponible para arriendo temporal en El Rodadero, Santa Marta, con vista panorámica al mar Caribe. 2 habitaciones, 2 baños, cocina equipada, sala-comedor y balcón con vista al mar.\n\nEl edificio ofrece piscina, gym, salón social y acceso directo a la playa. Incluye servicios, internet, TV y menaje completo.\n\nTarifa diaria, semanal o mensual. Ideal para vacaciones familiares.",
      price: roundPrice(randFloat(2600000, 3800000)),
      area: randInt(80, 95),
      bedrooms: 2,
      bathrooms: 2,
      parking: 1,
      stratum: 6,
      ageYears: randInt(5, 12),
      floor: randInt(8, 18),
      floorsTotal: 22,
      furnished: true,
      petFriendly: false,
      imageIds: [IMG.aptInt[2], IMG.pool[0], IMG.living[0], IMG.kitchen[1], IMG.bedroom[0]],
      amenitiesCount: 8,
      agentIdx: 5,
    },
    {
      cityCode: "STA",
      neighborhoodName: "Bello Horizonte",
      operation: "VENTA",
      propertyType: "APARTAMENTO",
      title: "Apartamento en Bello Horizonte, Santa Marta",
      shortDesc: "Apartamento a 200 m de la playa en Bello Horizonte.",
      description:
        "Apartamento en venta en Bello Horizonte, sector residencial de playa en Santa Marta. 3 habitaciones, 2 baños, cocina integral, sala-comedor y terraza. Edificio con piscina, gym, salón social y portería 24h.\n\nA 200 metros de la playa y a 10 minutos del aeropuerto. Sector tranquilo, ideal para vivienda permanente o de descanso.\n\nExcelente oportunidad de inversión o vivienda propia cerca del mar.",
      price: roundPrice(randFloat(420000000, 580000000)),
      area: randInt(100, 120),
      bedrooms: 3,
      bathrooms: 2,
      parking: 1,
      stratum: 5,
      ageYears: randInt(2, 8),
      floor: randInt(3, 12),
      floorsTotal: 14,
      furnished: false,
      petFriendly: true,
      imageIds: [IMG.aptInt[3], IMG.living[1], IMG.kitchen[0], IMG.bedroom[1], IMG.pool[1]],
      amenitiesCount: 7,
      agentIdx: 4,
    },
    {
      cityCode: "STA",
      neighborhoodName: "Pozos Colorados",
      operation: "VENTA",
      propertyType: "CAMPESTRE",
      title: "Casa campestre en Pozos Colorados, Santa Marta",
      shortDesc: "Casa de playa con piscina en Pozos Colorados.",
      description:
        "Hermosa casa de playa en Pozos Colorados, Santa Marta, sobre lote de 800 m² con piscina, jardín tropical y terraza panorámica. La casa cuenta con 4 habitaciones, 4 baños, sala-comedor, cocina gourmet y zona de BBQ.\n\nA 5 minutos de la playa y a 15 minutos del aeropuerto. Sector exclusivo de residencias vacacionales y permanentes.\n\nIdeal para vivienda de descanso o inversión en renta vacacional.",
      price: roundPrice(randFloat(1200000000, 1900000000)),
      area: 800,
      builtArea: 320,
      bedrooms: 4,
      bathrooms: 4,
      parking: 4,
      stratum: 6,
      ageYears: randInt(3, 10),
      floorsTotal: 2,
      furnished: false,
      petFriendly: true,
      imageIds: [IMG.houseExt[7], IMG.pool[0], IMG.living[0], IMG.kitchen[1], IMG.bedroom[1]],
      amenitiesCount: 9,
      agentIdx: 5,
    },

    // ----- Additional (Lotes / Proyecto / Bodega extra) -----
    {
      cityCode: "MED",
      neighborhoodName: "Boston",
      operation: "ARRIENDO",
      propertyType: "BODEGA",
      title: "Bodega industrial en zona industrial de Boston, Medellín",
      shortDesc: "Bodega de 250 m² con andén en sector industrial.",
      description:
        "Bodega industrial en arriendo en el sector de Boston, zona industrial consolidada de Medellín. 250 m² construidos, altura libre de 6 m, andén de carga, oficina administrativa, baño y energía trifásica.\n\nCuenta con portón eléctrico, circuito cerrado de TV y red contra incendios. Parqueadero para 2 vehículos.\n\nExcelente ubicación con acceso a la Av. Regional y al sur del Valle de Aburrá.",
      price: roundPrice(randFloat(6000000, 9000000)),
      area: 250,
      bathrooms: 1,
      parking: 2,
      stratum: 3,
      ageYears: randInt(8, 18),
      imageIds: [IMG.office[1], IMG.land[1]],
      amenitiesCount: 4,
      agentIdx: 1,
    },
    {
      cityCode: "BOG",
      neighborhoodName: "Fontibón",
      operation: "ARRIENDO",
      propertyType: "BODEGA",
      title: "Bodega logística en Fontibón cerca a El Dorado",
      shortDesc: "Bodega de 500 m² a 10 min del Aeropuerto El Dorado.",
      description:
        "Bodega logística en arriendo en Fontibón, a 10 minutos del Aeropuerto El Dorado. 500 m² construidos, 8 m de altura libre, andén hidráulico, 2 baños, oficina y zona de parqueo interior para 3 vehículos.\n\nCuenta con portón eléctrico, energía trifásica, red contra incendios y circuito cerrado de TV. Sobre vía principal con acceso para vehículos pesados.\n\nIdeal para empresa de logística, distribución o e-commerce.",
      price: roundPrice(randFloat(14000000, 22000000)),
      area: 500,
      bathrooms: 2,
      parking: 3,
      stratum: 3,
      ageYears: randInt(5, 12),
      imageIds: [IMG.office[0], IMG.land[0]],
      amenitiesCount: 5,
      agentIdx: 2,
    },
    {
      cityCode: "CALI",
      neighborhoodName: "Normandía",
      operation: "ARRIENDO",
      propertyType: "LOCAL",
      title: "Local sobre Av. 6N en Normandía, Cali",
      shortDesc: "Local comercial de 110 m² sobre vía principal.",
      description:
        "Local comercial en arriendo sobre la Avenida 6N en Normandía, sector de alto tráfico de Cali. 110 m² con vitrina, baño privado, almacén y altura libre de 4 m.\n\nIdeal para franquicia de comida, farmacia, banco o tienda de moda. Cuenta con energía trifásica y rampa para discapacitados.\n\nA 5 minutos de la Terminal de Transportes y de centros comerciales.",
      price: roundPrice(randFloat(5500000, 8500000)),
      area: 110,
      bathrooms: 1,
      parking: 1,
      stratum: 4,
      ageYears: randInt(5, 15),
      imageIds: [IMG.office[1]],
      amenitiesCount: 3,
      agentIdx: 3,
    },
    {
      cityCode: "BOG",
      neighborhoodName: "La Soledad",
      operation: "ARRIENDO",
      propertyType: "OFICINA",
      title: "Oficina amoblada en La Soledad, Bogotá",
      shortDesc: "Oficina modular amoblada de 80 m² en La Soledad.",
      description:
        "Oficina amoblada en arriendo en La Soledad, sector céntrico de Bogotá. 80 m² distribuidos en recepción, 2 oficinas privadas, sala de juntas y zona de trabajo abierto. Cuenta con cocina y baño privado.\n\nEl edificio tiene portería 24h, 2 ascensores, planta eléctrica y salón social. A 5 minutos de la Av. Caracas y de la Calle 72.\n\nContrato de 36 meses. Incluye mobiliario y línea telefónica.",
      price: roundPrice(randFloat(4500000, 6500000)),
      area: 80,
      bathrooms: 1,
      parking: 1,
      stratum: 4,
      ageYears: randInt(5, 15),
      floor: randInt(3, 7),
      floorsTotal: 9,
      imageIds: [IMG.office[0], IMG.office[1]],
      amenitiesCount: 5,
      agentIdx: 3,
    },
    {
      cityCode: "MED",
      neighborhoodName: "Manila",
      operation: "VENTA",
      propertyType: "APARTAESTUDIO",
      title: "Apartaestudio en venta en Manila, Medellín",
      shortDesc: "Apartaestudio de inversión en Manila, alta rentabilidad.",
      description:
        "Apartaestudio en venta en el sector de Manila, zona gastronómica en pleno crecimiento de Medellín. 38 m², 1 baño, cocina equipada y balcón. Edificio con ascensor y portería.\n\nExcelente oportunidad de inversión para renta: alta demanda de arriendo por profesionales y estudiantes extranjeros.\n\nA 5 minutos del Parque Lleras y de la estación Poblado del Metro. Documentación al día.",
      price: roundPrice(randFloat(180000000, 240000000)),
      area: 38,
      bedrooms: 1,
      bathrooms: 1,
      parking: 0,
      stratum: 5,
      ageYears: randInt(2, 8),
      floor: randInt(3, 10),
      floorsTotal: 12,
      furnished: false,
      petFriendly: false,
      imageIds: [IMG.modern[2], IMG.kitchen[0], IMG.bath[0]],
      amenitiesCount: 4,
      agentIdx: 0,
    },
    {
      cityCode: "BOG",
      neighborhoodName: "Fontibón",
      operation: "VENTA",
      propertyType: "PROYECTO",
      title: "Proyecto de apartamentos nuevos en Fontibón",
      shortDesc: "Apartamentos en pozo en torre de 18 pisos, Fontibón.",
      description:
        "Proyecto de vivienda nueva en venta en pozo en Fontibón, Bogotá. Torre de 18 pisos con apartamentos de 2 y 3 habitaciones, desde 65 m² hasta 95 m². Acabados modernos, piso en porcelanato y cocina integral.\n\nEl proyecto cuenta con amenities comunes: piscina, gym, salón social, zona infantil, terraza BBQ y cancha deportiva. Portería 24h.\n\nEntrega en 24 meses. Cuota inicial desde 10% y financiación con subsidio de vivienda. Subsidios aplicables.",
      price: roundPrice(randFloat(280000000, 420000000)),
      area: 80,
      bedrooms: 2,
      bathrooms: 2,
      parking: 1,
      stratum: 4,
      ageYears: 0,
      floorsTotal: 18,
      furnished: false,
      petFriendly: true,
      featured: true,
      published: false,
      status: "BORRADOR",
      imageIds: [IMG.aptInt[0], IMG.living[0], IMG.kitchen[1], IMG.modern[3], IMG.pool[0]],
      amenitiesCount: 9,
      agentIdx: 2,
    },
    {
      cityCode: "BQ",
      neighborhoodName: "Ciudad Jardín",
      operation: "ARRIENDO",
      propertyType: "OFICINA",
      title: "Oficina en arriendo en Ciudad Jardín, Barranquilla",
      shortDesc: "Oficina modular de 95 m² con parking.",
      description:
        "Oficina en arriendo en moderno edificio corporativo de Ciudad Jardín, Barranquilla. 95 m² distribuidos en recepción, 3 oficinas privadas, sala de juntas y zona de trabajo abierto. Cocina y baño privado.\n\nEl edificio cuenta con planta eléctrica, ascensores de alta velocidad, lobby con doble altura, gym para inquilinos y 6 parqueaderos visitantes.\n\nA 5 minutos del Mall Buenavista y de la zona financiera. Contrato de 36 meses.",
      price: roundPrice(randFloat(6500000, 9500000)),
      area: 95,
      bathrooms: 1,
      parking: 2,
      stratum: 5,
      ageYears: randInt(2, 8),
      floor: randInt(3, 10),
      floorsTotal: 12,
      imageIds: [IMG.office[0], IMG.office[1]],
      amenitiesCount: 6,
      agentIdx: 4,
    },
    {
      cityCode: "CTG",
      neighborhoodName: "Pie de la Popa",
      operation: "ARRIENDO",
      propertyType: "LOCAL",
      title: "Local comercial en Pie de la Popa, Cartagena",
      shortDesc: "Local de 60 m² en sector comercial de Pie de la Popa.",
      description:
        "Local comercial en arriendo en el sector de Pie de la Popa, Cartagena. 60 m² con vitrina, baño privado y zona de almacén. Ideal para mini-market, panadería o farmacia.\n\nSector residencial denso con alta demanda de servicios comerciales. A 10 minutos del Centro Histórico.\n\nContrato mínimo de 24 meses con depósito.",
      price: roundPrice(randFloat(3500000, 5500000)),
      area: 60,
      bathrooms: 1,
      parking: 0,
      stratum: 4,
      ageYears: randInt(5, 15),
      imageIds: [IMG.office[1]],
      amenitiesCount: 3,
      agentIdx: 5,
    },
    {
      cityCode: "CALI",
      neighborhoodName: "Valle del Lili",
      operation: "VENTA",
      propertyType: "APARTAMENTO",
      title: "Apartamento en Valle del Lili, Cali",
      shortDesc: "Apartamento de 3 habitaciones en conjunto cerrado.",
      description:
        "Apartamento en venta en conjunto cerrado del barrio Valle del Lili, una de las zonas residenciales más modernas de Cali. 3 habitaciones, 2 baños, cocina integral, sala-comedor y balcón.\n\nEl conjunto ofrece piscina, gym, salón social, zona infantil y portería 24h. A 5 minutos del centro comercial Jardín Plaza y de la clínica Valle del Lili.\n\nIdeal para familias que buscan seguridad y amenities urbanos en el sur de Cali.",
      price: roundPrice(randFloat(380000000, 520000000)),
      area: randInt(95, 115),
      bedrooms: 3,
      bathrooms: 2,
      parking: 2,
      stratum: 5,
      ageYears: randInt(2, 8),
      floor: randInt(3, 12),
      floorsTotal: 14,
      furnished: false,
      petFriendly: true,
      imageIds: [IMG.aptInt[2], IMG.living[1], IMG.kitchen[0], IMG.bedroom[1]],
      amenitiesCount: 8,
      agentIdx: 2,
    },
  ];

  // Build properties with sequential codes
  let createdCount = 0;
  for (const spec of props) {
    const city = cities[spec.cityCode];
    const neighborhoodId = neighborhoodMap[`${spec.cityCode}|${spec.neighborhoodName}`];
    const code = makeCode(spec.cityCode);
    const slugBase = slugify(spec.title);
    const slug = `${slugBase}-${code.split("-").pop()}`;
    const agent = agents[spec.agentIdx];
    const agency = agencies[agentDefs[spec.agentIdx].agencyIdx];

    // Filter amenities: houses/campestres/fincas -> include security but not services
    const includeServices = !["LOTE", "FINCA", "CAMPESTRE"].includes(spec.propertyType);
    const amens = pickAmenities(spec.amenitiesCount, true, includeServices);

    const latitude = city.lat + randFloat(-0.025, 0.025);
    const longitude = city.lng + randFloat(-0.025, 0.025);

    const property = await db.property.create({
      data: {
        code,
        title: spec.title,
        slug,
        shortDesc: spec.shortDesc,
        description: spec.description,
        operation: spec.operation,
        propertyType: spec.propertyType,
        status: spec.status ?? "DISPONIBLE",
        published: spec.published ?? true,
        featured: spec.featured ?? false,
        price: spec.price,
        currency: "COP",
        adminFee: spec.adminFee ?? null,
        pricePerM2: Math.round(spec.price / spec.area),
        countryId: colombia.id,
        stateId: states[
          cityDefs.find((c) => c.code === spec.cityCode)!.stateCode
        ].id,
        cityId: city.id,
        neighborhoodId,
        address: `Calle ${randInt(1, 150)} # ${randInt(1, 100)} - ${randInt(1, 100)}, ${spec.neighborhoodName}`,
        latitude,
        longitude,
        area: spec.area,
        builtArea: spec.builtArea ?? null,
        bedrooms: spec.bedrooms ?? null,
        bathrooms: spec.bathrooms ?? null,
        parking: spec.parking ?? null,
        stratum: spec.stratum ?? null,
        ageYears: spec.ageYears ?? null,
        floor: spec.floor ?? null,
        floorsTotal: spec.floorsTotal ?? null,
        furnished: spec.furnished ?? false,
        petFriendly: spec.petFriendly ?? false,
        amenities: amenitiesArr(amens),
        images: imagesArr(spec.imageIds),
        agencyId: agency.id,
        agentId: agent.id,
        metaTitle: `${spec.title} | InmoPro`,
        metaDescription: spec.shortDesc,
        views: randInt(0, 850),
      },
    });
    createdCount++;
    if (createdCount % 10 === 0) console.log(`  ... ${createdCount}/${props.length} properties created`);
  }
  console.log(`✓ Created ${createdCount} properties\n`);

  // ------------------------------------------------------------------
  // 9. LEADS
  // ------------------------------------------------------------------
  console.log("📞 Creating leads...");
  const allProperties = await db.property.findMany({ select: { id: true, code: true, agentId: true } });
  const leadNames = [
    { name: "Mariana López", email: "mariana.lopez@gmail.com", phone: "+57 321 555 1101" },
    { name: "Sebastián Ospina", email: "sebastian.ospina@gmail.com", phone: "+57 322 555 1102" },
    { name: "Camila Ramírez", email: "camila.ramirez@outlook.com", phone: "+57 323 555 1103" },
    { name: "Juan Diego Ruiz", email: "juandiego.ruiz@gmail.com", phone: "+57 324 555 1104" },
    { name: "Daniela Vélez", email: "daniela.velez@hotmail.com", phone: "+57 325 555 1105" },
    { name: "Felipe Cárdenas", email: "felipe.cardenas@gmail.com", phone: "+57 316 555 1106" },
    { name: "Sara Mendoza", email: "sara.mendoza@gmail.com", phone: "+57 317 555 1107" },
    { name: "Andrea Cortés", email: "andrea.cortes@yahoo.com", phone: "+57 318 555 1108" },
    { name: "Mateo Gutiérrez", email: "mateo.gutierrez@gmail.com", phone: "+57 319 555 1109" },
    { name: "Isabella Henao", email: "isabella.henao@gmail.com", phone: "+57 320 555 1110" },
    { name: "Santiago Murillo", email: "santiago.murillo@gmail.com", phone: "+57 321 555 1111" },
    { name: "Valeria Castaño", email: "valeria.castano@gmail.com", phone: "+57 322 555 1112" },
    { name: "Tomás Aguirre", email: "tomas.aguirre@gmail.com", phone: "+57 323 555 1113" },
    { name: "Manuela Cardona", email: "manuela.cardona@gmail.com", phone: "+57 324 555 1114" },
  ];
  const statuses = ["NUEVO", "CONTACTADO", "INTERESADO", "VISITA", "NEGOCIACION", "CERRADO"];
  const sources = ["WEB", "WHATSAPP", "PHONE", "IMPORT", "CRM"];
  const messages = [
    "Hola, estoy interesado en esta propiedad. ¿Podríamos agendar una visita?",
    "Buenas tardes, ¿cuál es el precio final y si aceptan crédito hipotecario?",
    "Quisiera más información sobre la administración y zonas sociales.",
    "¿La propiedad incluye parqueadero? ¿Tiene opción de amoblado?",
    "Hola, ¿está disponible aún? Soy extranjero y busco algo para mudarme en 2 meses.",
    "Quisiera saber si hay margen de negociación en el precio.",
    "¿Pueden enviarme más fotos y el plano de la propiedad?",
    "Buenos días, ¿la propiedad permite mascotas grandes?",
    "Estoy buscando una casa para mi familia y esta me llamó la atención.",
    "¿Podríamos hacer una videollamada para ver la propiedad en detalle?",
    "Hola, ¿qué tan cerca está del colegio y del transporte público?",
    "Quisiera agendar una visita este fin de semana si es posible.",
    "¿El precio incluye los muebles o se vende sin amoblar?",
    "¿Cuál es el valor de la administración y qué incluye?",
  ];

  for (let i = 0; i < leadNames.length; i++) {
    const prop = allProperties[Math.floor(Math.random() * allProperties.length)];
    await db.lead.create({
      data: {
        name: leadNames[i].name,
        email: leadNames[i].email,
        phone: leadNames[i].phone,
        message: messages[i % messages.length],
        source: sources[Math.floor(Math.random() * sources.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        propertyId: prop.id,
        propertyCode: prop.code,
        agentId: prop.agentId,
        notes: i % 3 === 0 ? "Cliente pre-calificado, agendar visita pronto." : null,
      },
    });
  }
  console.log(`✓ Created ${leadNames.length} leads\n`);

  // ------------------------------------------------------------------
  // 10. AUDIT LOGS
  // ------------------------------------------------------------------
  console.log("📝 Creating audit logs...");
  const sampleProps = await db.property.findMany({ take: 5, orderBy: { createdAt: "desc" } });
  const auditActions = ["CREATE", "CREATE", "CREATE", "PUBLISH", "CREATE"];
  for (let i = 0; i < sampleProps.length; i++) {
    const p = sampleProps[i];
    await db.auditLog.create({
      data: {
        action: auditActions[i],
        entity: "Property",
        entityId: p.id,
        userId: p.agentId,
        metadata: JSON.stringify({ code: p.code, title: p.title }),
      },
    });
  }
  // A couple of lead audits
  const sampleLeads = await db.lead.findMany({ take: 2 });
  for (const l of sampleLeads) {
    await db.auditLog.create({
      data: {
        action: "CREATE",
        entity: "Lead",
        entityId: l.id,
        userId: l.agentId,
        metadata: JSON.stringify({ name: l.name, source: l.source }),
      },
    });
  }
  console.log(`✓ Created ${sampleProps.length + sampleLeads.length} audit logs\n`);

  // ------------------------------------------------------------------
  // Summary
  // ------------------------------------------------------------------
  const counts = {
    countries: await db.country.count(),
    states: await db.state.count(),
    cities: await db.city.count(),
    neighborhoods: await db.neighborhood.count(),
    amenities: await db.amenity.count(),
    agencies: await db.agency.count(),
    users: await db.user.count(),
    properties: await db.property.count(),
    leads: await db.lead.count(),
    auditLogs: await db.auditLog.count(),
  };
  console.log("═══════════════════════════════════════");
  console.log("🎉 Seed completed successfully!");
  console.log("═══════════════════════════════════════");
  console.log(JSON.stringify(counts, null, 2));
  console.log("═══════════════════════════════════════");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
