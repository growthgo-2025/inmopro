"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Search, MapPin, ChevronRight, ArrowRight, ShieldCheck, Users,
  Headset, FileCheck, TrendingUp, BadgeCheck, Clock, Sparkles,
  Building2, Phone, KeyRound, CheckCircle2,
} from "lucide-react";

import { useNav } from "@/lib/store";
import { OPERATIONS, PROPERTY_TYPES } from "@/lib/constants";
import { PROPERTY_TYPE_LABELS } from "@/lib/format";
import { PropertyCard } from "@/components/property/property-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";
import type { PropertyListItem } from "@/lib/queries";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&q=80";

const CITY_IMAGES: Record<string, string> = {
  // Iconic tourist landmarks of each Colombian city (all verified HTTP 200)
  MED: "/cities/medellin.png", // Medellín — imagen personalizada del usuario
  BOG: "/cities/bogota.png", // Bogotá — imagen personalizada del usuario
  BQ: "/cities/barranquilla.png", // Barranquilla — imagen personalizada del usuario
  CALI: "/cities/cali.png", // Cali — imagen personalizada del usuario
  CTG: "/cities/cartagena.png", // Cartagena — imagen personalizada del usuario
  BGA: "/cities/bucaramanga.png", // Bucaramanga — imagen personalizada del usuario
  MZL: "/cities/manizales.png", // Manizales — imagen personalizada del usuario
  PEI: "/cities/pereira.png", // Pereira — imagen personalizada del usuario
  ARM: "/cities/armenia.png", // Armenia — imagen personalizada del usuario (⚠️ 275x183 — pendiente reemplazo)
  STA: "/cities/santa-marta.png", // Santa Marta — imagen personalizada del usuario
};
const CITY_FALLBACK =
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80"; // Colombia genérico

const QUICK_CHIPS: { label: string; value: string }[] = [
  { label: "Casas", value: "CASA" },
  { label: "Apartamentos", value: "APARTAMENTO" },
  { label: "Fincas", value: "FINCA" },
  { label: "Lotes", value: "LOTE" },
];

const VALUE_PROPS = [
  {
    icon: KeyRound,
    title: "Códigos únicos verificables",
    desc: "Cada inmueble recibe un identificador INV-2026-CITY-000001 trazable, imposible de duplicar.",
  },
  {
    icon: Search,
    title: "Buscador avanzado profesional",
    desc: "Filtra por estrato, área, habitaciones, parqueadero, amenidades y zona en segundos.",
  },
  {
    icon: Users,
    title: "Asesores certificados y verificados",
    desc: "Profesionales con cédula y licencia SIPM validadas; respuesta garantizada en menos de 24 horas.",
  },
  {
    icon: FileCheck,
    title: "Portal de carga para asesores",
    desc: "Asistente guiado paso a paso: publica inmuebles sin conocimientos técnicos y genera códigos automáticos.",
  },
  {
    icon: Headset,
    title: "CRM integrado para leads",
    desc: "Centraliza contactos, agenda visitas y mide conversiones desde un solo panel.",
  },
  {
    icon: TrendingUp,
    title: "Optimizado para SEO y escala",
    desc: "Miles de inmuebles indexables con sitemap dinámico, metadatos y URLs amigables.",
  },
];

const FAQS = [
  {
    q: "¿Cómo funciona el código único de cada inmueble?",
    a: "Cada propiedad publicada en Innovar Showrooms recibe un código INV-2026-CITY-NNNNNN. Te permite verificar que el inmueble existe, consultar su historial y evitar avisos duplicados o fraudulentos. Cópialo del aviso y búscalo en el portal para confirmar.",
  },
  {
    q: "¿Qué ciudades y barrios cubre Innovar Showrooms?",
    a: "Operamos en Medellín (El Poblado, Laureles, Belén, Envigado), Bogotá (Chapinero, Usaquén, Suba, Engativá), Cali (Granada, Ciudad Jardín, Chipichape), Barranquilla (Alto Prado, Villa Country), Cartagena (Bocagrande, Castillogrande), Bucaramanga, Manizales, Pereira, Armenia y Santa Marta.",
  },
  {
    q: "¿Debo pagar comisión al arrendar o comprar?",
    a: "La comisión inmobiliaria habitual en Colombia equivale al 10% del valor del canon mensual en arriendo y al 3-5% del precio de venta en compraventa. Generalmente la cubre el propietario, pero siempre confirma con el asesor antes de firmar el contrato.",
  },
  {
    q: "¿Qué es el estrato y cómo afecta el valor del inmueble?",
    a: "El estrato socioeconómico (1 al 6) lo asigna el DAPD en zonas urbanas y determina el valor de los servicios públicos y el impuesto predial. Los inmuebles de estrato 4-6 suelen tener mayor precio y mayores costos mensuales; los de estrato 1-3 reciben subsidios en servicios.",
  },
];

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CityItem {
  id: string;
  name: string;
  code: string;
  stateName: string;
  propertyCount: number;
}

/* ------------------------------------------------------------------ */
/*  Helper animations                                                  */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: Math.min(i * 0.05, 0.4), ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

/* ================================================================== */
/*  Main component                                                     */
/* ================================================================== */

export function HomeView() {
  const { openResults, setView, openAdmin, setFilters, filters } = useNav();

  /* --- local search form state ---------------------------------- */
  const [op, setOp] = useState<string>(filters.operation || "VENTA");
  const [q, setQ] = useState<string>(filters.q || "");
  const [type, setType] = useState<string>(filters.propertyType || "");
  const [cityId, setCityId] = useState<string>(filters.cityId || "");

  /* --- remote data state ----------------------------------------- */
  const [cities, setCities] = useState<CityItem[]>([]);
  const [featured, setFeatured] = useState<PropertyListItem[]>([]);
  const [recent, setRecent] = useState<PropertyListItem[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [loadingCities, setLoadingCities] = useState(true);
  const [tab, setTab] = useState<"featured" | "recent">("featured");

  /* --- fetch cities once ----------------------------------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/cities");
        const j = await r.json();
        if (alive && Array.isArray(j.items)) {
          // sort by propertyCount desc, take 10
          const sorted = [...j.items].sort(
            (a, b) => (b.propertyCount || 0) - (a.propertyCount || 0)
          );
          setCities(sorted.slice(0, 10));
        }
      } catch {
        /* ignore */
      } finally {
        if (alive) setLoadingCities(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* --- fetch featured once --------------------------------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/properties?mode=featured");
        const j = await r.json();
        if (alive && Array.isArray(j.items)) setFeatured(j.items);
      } catch {
        /* ignore */
      } finally {
        if (alive) setLoadingFeatured(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* --- fetch recent on demand (when tab switches) ---------------- */
  useEffect(() => {
    if (tab !== "recent" || recent.length > 0) return;
    let alive = true;
    setLoadingRecent(true);
    (async () => {
      try {
        const r = await fetch("/api/properties?mode=recent");
        const j = await r.json();
        if (alive && Array.isArray(j.items)) setRecent(j.items);
      } catch {
        /* ignore */
      } finally {
        if (alive) setLoadingRecent(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tab, recent.length]);

  /* --- handlers -------------------------------------------------- */
  const submitSearch = useCallback(() => {
    setFilters({
      q: q || undefined,
      operation: op,
      propertyType: type || undefined,
      cityId: cityId || undefined,
    });
    openResults({
      q: q || undefined,
      operation: op,
      propertyType: type || undefined,
      cityId: cityId || undefined,
    });
  }, [q, op, type, cityId, setFilters, openResults]);

  return (
    <div className="flex flex-col">
      <HeroSection
        op={op}
        setOp={setOp}
        q={q}
        setQ={setQ}
        type={type}
        setType={setType}
        cityId={cityId}
        setCityId={setCityId}
        cities={cities}
        loadingCities={loadingCities}
        onSearch={submitSearch}
        onChip={(v) => openResults({ propertyType: v })}
      />

      <QuickCategoriesSection onPick={(v) => openResults({ propertyType: v })} />

      <FeaturedCitiesSection
        cities={cities}
        loading={loadingCities}
        onPick={(id) => openResults({ cityId: id })}
      />

      <FeaturedPropertiesSection
        tab={tab}
        setTab={setTab}
        featured={featured}
        recent={recent}
        loadingFeatured={loadingFeatured}
        loadingRecent={loadingRecent}
        onViewAll={() => openResults()}
      />

      <SeoSection
        onSearch={(v) => openResults({ q: v })}
      />
    </div>
  );
}

/* ================================================================== */
/*  1. Hero                                                            */
/* ================================================================== */

function HeroSection({
  op, setOp, q, setQ, type, setType, cityId, setCityId,
  cities, loadingCities, onSearch, onChip,
}: {
  op: string;
  setOp: (v: string) => void;
  q: string;
  setQ: (v: string) => void;
  type: string;
  setType: (v: string) => void;
  cityId: string;
  setCityId: (v: string) => void;
  cities: CityItem[];
  loadingCities: boolean;
  onSearch: () => void;
  onChip: (v: string) => void;
}) {
  return (
    <section
      id="hero"
      className="relative flex min-h-[60vh] items-center overflow-hidden md:min-h-[70vh]"
    >
      {/* Background image */}
      <Image
        src={HERO_IMAGE}
        alt="Inmuebles en Colombia"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 hero-overlay" />

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E0B589]/30 bg-[#C9A07A]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#E0B589] backdrop-blur-sm">
            <Sparkles className="h-3 w-3" />
            Portal inmobiliario profesional
          </span>

          <h1 className="h1-display mt-5 text-white">
            Encuentra el inmueble{" "}
            <span className="text-gradient-brand">perfecto</span> en Colombia
          </h1>

          <p className="text-body-lg mx-auto mt-4 max-w-2xl text-[#E8DFD9]">
            Miles de propiedades verificadas con códigos únicos. Busca por
            ciudad, barrio, tipo o código de inmueble.
          </p>
        </motion.div>

        {/* Search card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-8 max-w-4xl"
        >
          <div className="rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-[#3D3530]/5 sm:p-5">
            {/* Row 1 — operation segmented control */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {OPERATIONS.map((o) => {
                const active = op === o.value;
                return (
                  <button
                    key={o.value}
                    onClick={() => setOp(o.value)}
                    className={cn(
                      "rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors",
                      active
                        ? "bg-[#B08968] text-white shadow-sm"
                        : "bg-[#F0EAE5] text-[#6B5D5A] hover:bg-[#E8DFD9]"
                    )}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>

            {/* Row 2 — inputs grid */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {/* Free text */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A89B96]" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSearch();
                  }}
                  placeholder="Ciudad, barrio o código (INV-2026-...)"
                  className="h-11 pl-9"
                />
              </div>

              {/* Property type select */}
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="Tipo de inmueble" />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="mr-1.5">{t.icon}</span>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* City select */}
              <Select value={cityId} onValueChange={setCityId}>
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="Ciudad" />
                </SelectTrigger>
                <SelectContent>
                  {loadingCities ? (
                    <SelectItem value="__loading" disabled>
                      Cargando ciudades…
                    </SelectItem>
                  ) : (
                    cities.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <MapPin className="mr-1 h-3.5 w-3.5 text-[#A89B96]" />
                        {c.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Row 3 — CTA */}
            <Button
              onClick={onSearch}
              size="lg"
              className="mt-3 h-11 w-full bg-[#B08968] text-sm font-bold hover:bg-[#9A7558]"
            >
              <Search className="mr-2 h-4 w-4" />
              Buscar inmuebles
            </Button>

            {/* Quick chips */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-[#A89B96]">
                Populares:
              </span>
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip.value}
                  onClick={() => onChip(chip.value)}
                  className="rounded-full border border-[#E8DFD9] bg-[#FAF6F3] px-3 py-1 text-xs font-medium text-[#5A4E4B] transition-colors hover:border-[#B08968] hover:bg-[#FAF3EC] hover:text-[#9A7558]"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Trust badges */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-[#E8DFD9]">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#E0B589]" />
              Códigos verificados
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck className="h-3.5 w-3.5 text-[#E0B589]" />
              Asesores certificados
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[#E0B589]" />
              Respuesta &lt; 24h
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  2. Quick categories                                                */
/* ================================================================== */

function QuickCategoriesSection({ onPick }: { onPick: (v: string) => void }) {
  const items = PROPERTY_TYPES.slice(0, 8);
  return (
    <section id="categorias" className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="mb-8 text-center"
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#B08968]">
            Explora por categoría
          </div>
          <h2 className="h2-section mt-2 text-[#3D3530]">
            Inmuebles para cada necesidad
          </h2>
          <p className="text-body-lg mx-auto mt-3 max-w-2xl text-[#8B7E78]">
            Encuentra el tipo de propiedad que buscas en un solo clic.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {items.map((cat, i) => (
            <motion.button
              key={cat.value}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              onClick={() => onPick(cat.value)}
              className="card-lift group relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-[#E8DFD9] bg-white px-4 py-7 text-center transition-colors hover:border-[#E0B589] hover:bg-[#FAF3EC]/40"
            >
              {/* Subtle accent line at top */}
              <span className="absolute top-0 left-1/2 h-[3px] w-10 -translate-x-1/2 rounded-b-full bg-[#B08968]/30 transition-all duration-300 group-hover:w-16 group-hover:bg-[#B08968]" />
              <span className="text-sm font-semibold tracking-tight text-[#4A3D38] transition-colors group-hover:text-[#9A7558]">
                {cat.label}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[#B08968] opacity-0 transition-opacity group-hover:opacity-100">
                Ver <ChevronRight className="h-3 w-3" />
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  3. Featured cities                                                 */
/* ================================================================== */

function FeaturedCitiesSection({
  cities,
  loading,
  onPick,
}: {
  cities: CityItem[];
  loading: boolean;
  onPick: (id: string) => void;
}) {
  return (
    <section id="ciudades" className="bg-[#FAF6F3] py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="mb-8 text-center"
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#B08968]">
            Ubicaciones destacadas
          </div>
          <h2 className="h2-section mt-2 text-[#3D3530]">
            Ciudades con más inmuebles
          </h2>
          <p className="text-body-lg mx-auto mt-3 max-w-2xl text-[#8B7E78]">
            Explora propiedades en las principales ciudades de Colombia.
          </p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {cities.map((c, i) => {
              const img = CITY_IMAGES[c.code] || CITY_FALLBACK;
              return (
                <motion.button
                  key={c.id}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  onClick={() => onPick(c.id)}
                  className="card-lift group relative aspect-[4/5] overflow-hidden rounded-2xl text-left"
                >
                  <img
                    src={img}
                    alt={c.name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#3D3530]/85 via-[#3D3530]/35 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-[#E0B589]">
                      <MapPin className="h-3 w-3" />
                      {c.stateName}
                    </div>
                    <div className="mt-1 text-xl font-bold text-white">
                      {c.name}
                    </div>
                    <div className="mt-0.5 text-sm text-white/80">
                      {c.propertyCount} inmuebles disponibles
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center">
          <Button
            variant="outline"
            onClick={() => onPick("")}
            className="border-[#D8CFC9] text-[#5A4E4B] hover:bg-[#F0EAE5]"
          >
            Ver todas las ciudades
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  4. Featured properties                                             */
/* ================================================================== */

function FeaturedPropertiesSection({
  tab,
  setTab,
  featured,
  recent,
  loadingFeatured,
  loadingRecent,
  onViewAll,
}: {
  tab: "featured" | "recent";
  setTab: (t: "featured" | "recent") => void;
  featured: PropertyListItem[];
  recent: PropertyListItem[];
  loadingFeatured: boolean;
  loadingRecent: boolean;
  onViewAll: () => void;
}) {
  return (
    <section id="destacados" className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header row */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#B08968]">
              Propiedades destacadas
            </div>
            <h2 className="h2-section mt-2 text-[#3D3530]">
              Inmuebles seleccionados para ti
            </h2>
            <p className="mt-2 text-sm text-[#8B7E78]">
              Curaduría editorial de los inmuebles más relevantes del portal.
            </p>
          </motion.div>
          <Button variant="outline" onClick={onViewAll} className="self-start sm:self-auto">
            Ver todos
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "featured" | "recent")}>
          <TabsList className="mb-6 bg-[#F0EAE5]">
            <TabsTrigger value="featured">Destacados</TabsTrigger>
            <TabsTrigger value="recent">Recientes</TabsTrigger>
          </TabsList>

          <TabsContent value="featured">
            <PropertiesGrid items={featured} loading={loadingFeatured} />
          </TabsContent>
          <TabsContent value="recent">
            <PropertiesGrid items={recent} loading={loadingRecent} />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

function PropertiesGrid({
  items,
  loading,
}: {
  items: PropertyListItem[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-[#E8DFD9]">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="space-y-3 p-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-[#E8DFD9] bg-[#FAF6F3] p-10 text-center text-sm text-[#8B7E78]">
        No hay inmuebles disponibles en este momento. Vuelve pronto.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((p, i) => (
        <PropertyCard key={p.id} property={p} index={i} />
      ))}
    </div>
  );
}

/* ================================================================== */
/*  7. SEO content                                                     */
/* ================================================================== */

function SeoSection({ onSearch }: { onSearch: (q: string) => void }) {
  return (
    <section id="seo" className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          {/* FAQ */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
          >
            <div className="rounded-2xl border border-[#E8DFD9] bg-[#FAF6F3]/60 p-6 sm:p-8">
              <div className="text-center mb-6">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#B08968]">
                  Centro de ayuda
                </div>
                <h2 className="h2-section mt-2 text-[#3D3530]">
                  Preguntas frecuentes
                </h2>
                <p className="mt-2 text-sm text-[#8B7E78]">
                  Resolvemos las dudas más comunes de compradores y arrendatarios.
                </p>
              </div>

              <Accordion type="single" collapsible className="mt-5 w-full">
                {FAQS.map((f, i) => (
                  <AccordionItem
                    key={i}
                    value={`item-${i}`}
                    className="border-[#E8DFD9]"
                  >
                    <AccordionTrigger className="text-left text-sm font-semibold text-[#4A3D38] hover:text-[#9A7558] hover:no-underline">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-[#6B5D5A]">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <div className="mt-6 rounded-xl bg-white p-4 ring-1 ring-[#E8DFD9]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5EBE0]">
                    <Search className="h-4 w-4 text-[#B08968]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-[#3D3530]">
                      ¿Buscas algo específico?
                    </div>
                    <div className="text-xs text-[#8B7E78]">
                      Prueba con un código, ciudad o tipo de inmueble.
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    "INV-2026-MED-000001",
                    "Apartamentos El Poblado",
                    "Casas Bogotá",
                    "Fincas Antioquia",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => onSearch(s)}
                      className="rounded-full border border-[#E8DFD9] bg-white px-3 py-1 text-xs font-medium text-[#5A4E4B] hover:border-[#C9A07A] hover:bg-[#FAF3EC] hover:text-[#9A7558]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
