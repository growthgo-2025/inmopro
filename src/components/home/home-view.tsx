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
  MED: "https://images.unsplash.com/photo-1574170664512-22e0e6b0a8a9?w=600&q=80",
  BOG: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80",
  BQ: "https://images.unsplash.com/photo-1583266977367-ba1326dc8b94?w=600&q=80",
  CALI: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80",
  CTG: "https://images.unsplash.com/photo-1583531352515-8884af319dc1?w=600&q=80",
  BGA: "https://images.unsplash.com/photo-1515462277126-2dd0c162007a?w=600&q=80",
  MZL: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80",
  PEI: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80",
  ARM: "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?w=600&q=80",
  STA: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80",
};
const CITY_FALLBACK =
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80";

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
    a: "Cada propiedad publicada en InmoPro recibe un código INV-2026-CITY-NNNNNN. Te permite verificar que el inmueble existe, consultar su historial y evitar avisos duplicados o fraudulentos. Cópialo del aviso y búscalo en el portal para confirmar.",
  },
  {
    q: "¿Qué ciudades y barrios cubre InmoPro?",
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

      <ValuePropsSection />

      <CtaBannerSection
        onPublish={() => setView("upload")}
        onContact={() => openAdmin("dashboard")}
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
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-300 backdrop-blur-sm">
            <Sparkles className="h-3 w-3" />
            Portal inmobiliario profesional
          </span>

          <h1 className="h1-display mt-5 text-white">
            Encuentra el inmueble{" "}
            <span className="text-gradient-brand">perfecto</span> en Colombia
          </h1>

          <p className="text-body-lg mx-auto mt-4 max-w-2xl text-slate-200">
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
          <div className="rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-slate-900/5 sm:p-5">
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
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
                        <MapPin className="mr-1 h-3.5 w-3.5 text-slate-400" />
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
              className="mt-3 h-11 w-full bg-blue-600 text-sm font-bold hover:bg-blue-700"
            >
              <Search className="mr-2 h-4 w-4" />
              Buscar inmuebles
            </Button>

            {/* Quick chips */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-400">
                Populares:
              </span>
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip.value}
                  onClick={() => onChip(chip.value)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Trust badges */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-200">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
              Códigos verificados
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck className="h-3.5 w-3.5 text-blue-400" />
              Asesores certificados
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-blue-400" />
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
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
            Explora por categoría
          </div>
          <h2 className="h2-section mt-2 text-slate-900">
            Inmuebles para cada necesidad
          </h2>
          <p className="text-body-lg mx-auto mt-3 max-w-2xl text-slate-500">
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
              className="card-lift group flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/40"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-2xl transition-transform group-hover:scale-110">
                {cat.icon}
              </span>
              <span className="text-sm font-semibold text-slate-800">
                {cat.label}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
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
    <section id="ciudades" className="bg-slate-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="mb-8 text-center"
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
            Ubicaciones destacadas
          </div>
          <h2 className="h2-section mt-2 text-slate-900">
            Ciudades con más inmuebles
          </h2>
          <p className="text-body-lg mx-auto mt-3 max-w-2xl text-slate-500">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/35 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <div className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-blue-300">
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
            className="border-slate-300 text-slate-700 hover:bg-slate-100"
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
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              Propiedades destacadas
            </div>
            <h2 className="h2-section mt-2 text-slate-900">
              Inmuebles seleccionados para ti
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Curaduría editorial de los inmuebles más relevantes del portal.
            </p>
          </motion.div>
          <Button variant="outline" onClick={onViewAll} className="self-start sm:self-auto">
            Ver todos
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "featured" | "recent")}>
          <TabsList className="mb-6 bg-slate-100">
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
          <div key={i} className="overflow-hidden rounded-xl border border-slate-200">
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
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
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
/*  5. Value proposition                                               */
/* ================================================================== */

function ValuePropsSection() {
  return (
    <section id="por-que" className="bg-slate-900 py-20 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="mx-auto mb-12 max-w-2xl text-center"
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
            ¿Por qué InmoPro?
          </div>
          <h2 className="h2-section mt-2 text-white">
            La plataforma inmobiliaria más profesional de Colombia
          </h2>
          <p className="text-body-lg mt-3 text-slate-400">
            Diseñada para compradores, arrendatarios y asesores que buscan
            transparencia, verificación y resultados.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {VALUE_PROPS.map((vp, i) => (
            <motion.div
              key={vp.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="rounded-xl border border-slate-800 bg-slate-800/60 p-6"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600/15 ring-1 ring-blue-500/30">
                <vp.icon className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="mt-4 text-base font-bold text-white">
                {vp.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {vp.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  6. CTA banner                                                      */
/* ================================================================== */

function CtaBannerSection({
  onPublish,
  onContact,
}: {
  onPublish: () => void;
  onContact: () => void;
}) {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 to-blue-500 px-6 py-12 text-center shadow-xl sm:px-12 sm:py-16"
        >
          {/* decorative blobs */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-blue-900/30 blur-2xl" />

          <div className="relative mx-auto max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
              <Building2 className="h-3.5 w-3.5" />
              Para asesores e inmobiliarias
            </div>
            <h2 className="h2-section mt-4 text-white">
              ¿Eres asesor o inmobiliaria? Publica tus inmuebles
            </h2>
            <p className="text-body-lg mt-3 text-white/90">
              Usa nuestro asistente guiado paso a paso. Genera códigos únicos
              automáticos y llega a miles de clientes.
            </p>

            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={onPublish}
                className="h-11 bg-white px-6 text-blue-700 hover:bg-blue-50"
              >
                <Building2 className="mr-2 h-4 w-4" />
                Publicar inmueble
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={onContact}
                className="h-11 border-white/60 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
              >
                <Phone className="mr-2 h-4 w-4" />
                Hablar con asesor
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  7. SEO content                                                     */
/* ================================================================== */

function SeoSection({ onSearch }: { onSearch: (q: string) => void }) {
  return (
    <section id="seo" className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          {/* Left column: copy */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              Guía inmobiliaria
            </div>
            <h2 className="h2-section mt-2 text-slate-900">
              Inmuebles en Colombia: la guía completa
            </h2>

            <div className="mt-5 space-y-4 text-sm leading-relaxed text-slate-600">
              <p>
                Comprar o arrendar inmuebles en Colombia requiere entender el
                mercado local, los trámites notariales y el sistema de estratos.
                En ciudades como <strong>Medellín</strong>, barrios como{" "}
                <strong>El Poblado</strong> y <strong>Laureles</strong>{" "}
                concentran la mayor oferta de apartamentos de alto estándar,
                mientras que <strong>Belén</strong> y <strong>Envigado</strong>{" "}
                ofrecen opciones más accesibles para familias. En{" "}
                <strong>Bogotá</strong>, <strong>Chapinero</strong>,{" "}
                <strong>Usaquén</strong> y <strong>Suba</strong> lideran la
                oferta de apartamentos en venta, con rangos de precio que varían
                según el estrato y la cercanía al sistema Integrado de
                Transporte.
              </p>

              <p>
                En <strong>Barranquilla</strong>, sectores como{" "}
                <strong>Alto Prado</strong> y <strong>Villa Country</strong> son
                los más demandados para vivienda familiar; en{" "}
                <strong>Cali</strong>, <strong>Granada</strong>,{" "}
                <strong>Ciudad Jardín</strong> y <strong>Chipichape</strong>{" "}
                combinan apartamentos modernos con zonas comerciales; y en{" "}
                <strong>Cartagena</strong>, <strong>Bocagrande</strong> y{" "}
                <strong>Castillogrande</strong> dominan el arriendo temporal
                para turistas y expatriados. Los <strong>lotes</strong> y{" "}
                <strong>fincas</strong> en la periferia urbana crecen año tras
                año como alternativa de inversión, especialmente en el Eje
                Cafetero (Pereira, Armenia, Manizales) y la región caribe.
              </p>

              <p>
                Una de las claves para evitar avisos fraudulentos es exigir el{" "}
                <strong>código único de inmueble</strong>. En InmoPro cada
                propiedad recibe un identificador INV-2026-CITY-000001
                verificable, lo que permite comprobar que el aviso corresponde a
                un inmueble real y no duplicado. Antes de separar un apartamento
                en arriendo, revisa el estrato (del 1 al 6) ya que impacta el
                valor de los servicios públicos, y verifica que el contrato
                incluya la administración y el depósito. Para compradores de
                primera vivienda, los créditos del Icetex y los subsidios del
                Fondo Nacional del Ahorro pueden financiar hasta el 70% del
                valor del inmueble.
              </p>

              <p>
                Finalmente, ya sean <strong>casas</strong>,{" "}
                <strong>apartamentos</strong>, <strong>fincas</strong> o{" "}
                <strong>lotes</strong>, te recomendamos comparar al menos cinco
                opciones similares, visitar el inmueble en horarios distintos y
                solicitar el certificado de tradición y libertad. InmoPro reúne
                miles de inmuebles verificados en Colombia con asesores
                certificados que responden en menos de 24 horas.
              </p>
            </div>
          </motion.div>

          {/* Right column: FAQ */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
          >
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 sm:p-8">
              <h3 className="h3-card text-slate-900">Preguntas frecuentes</h3>
              <p className="mt-1 text-sm text-slate-500">
                Resolvemos las dudas más comunes de compradores y arrendatarios.
              </p>

              <Accordion type="single" collapsible className="mt-5 w-full">
                {FAQS.map((f, i) => (
                  <AccordionItem
                    key={i}
                    value={`item-${i}`}
                    className="border-slate-200"
                  >
                    <AccordionTrigger className="text-left text-sm font-semibold text-slate-800 hover:text-blue-700 hover:no-underline">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-slate-600">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <div className="mt-6 rounded-xl bg-white p-4 ring-1 ring-slate-200">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <Search className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-900">
                      ¿Buscas algo específico?
                    </div>
                    <div className="text-xs text-slate-500">
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
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
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
