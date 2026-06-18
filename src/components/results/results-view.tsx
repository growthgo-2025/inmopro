"use client";

/**
 * ResultsView — premium real-estate search results page (mitula.com-inspired).
 *
 * Layout:
 *   ┌───────────────────────────────────────────────────────────────┐
 *   │ Breadcrumb + active-filter chips row                          │
 *   │ Sticky header: dynamic H1 + subtitle  |  Sort | Filtros (mobile)│
 *   ├───────────────┬───────────────────────────────────────────────┤
 *   │ FilterPanel   │ Active chips + results grid + pagination      │
 *   │ (sticky)      │   loading → skeleton                          │
 *   │               │   empty   → centered icon                     │
 *   │               │   loaded  → PropertyCard grid (stagger)       │
 *   └───────────────┴───────────────────────────────────────────────┘
 *   Mobile: FilterPanel mounted inside a Sheet driven by isFiltersOpen.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Home as HomeIcon,
  X,
  SlidersHorizontal,
  Building2,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  MapPin,
} from "lucide-react";

import { useNav, type SearchFilters } from "@/lib/store";
import {
  formatPriceShort,
  formatNumber,
  PROPERTY_TYPE_LABELS,
  OPERATION_LABELS,
  SORT_OPTIONS,
} from "@/lib/format";
import {
  OPERATIONS,
  PROPERTY_TYPES,
  PRICE_RANGES_COP,
  RENT_RANGES_COP,
  AREA_RANGES,
  BEDROOM_OPTIONS,
  BATHROOM_OPTIONS,
  PARKING_OPTIONS,
  STRATUM_OPTIONS,
  AMENITY_CATEGORIES,
} from "@/lib/constants";
import { PropertyCard } from "@/components/property/property-card";
import { AmenityIcon, amenityLabel } from "@/components/property/amenity-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { PropertyListItem } from "@/lib/queries";
import { cn } from "@/lib/utils";

/* ============================================================
   Types
   ============================================================ */

interface CityItem {
  id: string;
  name: string;
  code: string;
  stateName: string;
  propertyCount: number;
}
interface NeighborhoodItem {
  id: string;
  name: string;
  zone: string;
  cityId: string;
  propertyCount: number;
}
interface AmenityItem {
  id: string;
  name: string;
  slug: string;
  icon: string;
  category: string;
}
interface SearchResult {
  items: PropertyListItem[];
  total: number;
  page: number;
  pageSize: number;
}

interface ChipDef {
  key: string;
  label: string;
  clear: () => void;
}

const PAGE_SIZE = 12;

/* ============================================================
   Helpers
   ============================================================ */

function buildQuery(filters: SearchFilters): string {
  const p = new URLSearchParams();
  if (filters.q) p.set("q", filters.q);
  if (filters.operation) p.set("operation", filters.operation);
  if (filters.propertyType) p.set("propertyType", filters.propertyType);
  if (filters.cityId) p.set("cityId", filters.cityId);
  if (filters.neighborhoodId) p.set("neighborhoodId", filters.neighborhoodId);
  if (filters.priceMin != null) p.set("priceMin", String(filters.priceMin));
  if (filters.priceMax != null) p.set("priceMax", String(filters.priceMax));
  if (filters.areaMin != null) p.set("areaMin", String(filters.areaMin));
  if (filters.areaMax != null) p.set("areaMax", String(filters.areaMax));
  if (filters.bedrooms != null) p.set("bedrooms", String(filters.bedrooms));
  if (filters.bathrooms != null) p.set("bathrooms", String(filters.bathrooms));
  if (filters.parking != null) p.set("parking", String(filters.parking));
  if (filters.stratum != null) p.set("stratum", String(filters.stratum));
  if (filters.furnished) p.set("furnished", "1");
  if (filters.petFriendly) p.set("petFriendly", "1");
  if (filters.amenities?.length) p.set("amenities", filters.amenities.join(","));
  if (filters.sort) p.set("sort", filters.sort);
  if (filters.page) p.set("page", String(filters.page));
  return p.toString();
}

/** Pluralize a property type label for the dynamic H1. */
function pluralizeType(type: string | undefined): string | null {
  if (!type) return null;
  const label = PROPERTY_TYPE_LABELS[type];
  if (!label) return null;
  switch (type) {
    case "CASA":
      return "Casas";
    case "APARTAMENTO":
      return "Apartamentos";
    case "APARTAESTUDIO":
      return "Apartaestudios";
    case "OFICINA":
      return "Oficinas";
    case "LOCAL":
      return "Locales";
    case "BODEGA":
      return "Bodegas";
    case "LOTE":
      return "Lotes";
    case "FINCA":
      return "Fincas";
    case "CAMPESTRE":
      return "Casas campestres";
    case "PROYECTO":
      return "Proyectos";
    default:
      return `${label}s`;
  }
}

/* ============================================================
   FilterPanel — internal reusable component
   ============================================================ */

interface FilterPanelProps {
  filters: SearchFilters;
  setFilters: (f: Partial<SearchFilters>) => void;
  resetFilters: () => void;
  cities: CityItem[];
  neighborhoods: NeighborhoodItem[];
  amenities: AmenityItem[];
  neighborhoodsLoading: boolean;
  onAfterChange?: () => void;
}

function FilterPanel({
  filters,
  setFilters,
  resetFilters,
  cities,
  neighborhoods,
  amenities,
  neighborhoodsLoading,
  onAfterChange,
}: FilterPanelProps) {
  /* --- Local controlled inputs for free-text + number fields ------- */
  const [qInput, setQInput] = useState(filters.q ?? "");
  const [priceMinInput, setPriceMinInput] = useState(
    filters.priceMin != null ? String(filters.priceMin) : ""
  );
  const [priceMaxInput, setPriceMaxInput] = useState(
    filters.priceMax != null ? String(filters.priceMax) : ""
  );
  const [areaMinInput, setAreaMinInput] = useState(
    filters.areaMin != null ? String(filters.areaMin) : ""
  );
  const [areaMaxInput, setAreaMaxInput] = useState(
    filters.areaMax != null ? String(filters.areaMax) : ""
  );

  // Sync local inputs when store changes externally (e.g. URL hydrate).
  // Uses the "store last seen value" pattern (conditional setState during render)
  // instead of useEffect — avoids cascading renders per React 19 guidance.
  const [lastSyncedQ, setLastSyncedQ] = useState(filters.q);
  if ((filters.q ?? "") !== (lastSyncedQ ?? "")) {
    setLastSyncedQ(filters.q);
    setQInput(filters.q ?? "");
  }
  const [lastSyncedPrice, setLastSyncedPrice] = useState<{ min?: number; max?: number }>({
    min: filters.priceMin,
    max: filters.priceMax,
  });
  if (filters.priceMin !== lastSyncedPrice.min || filters.priceMax !== lastSyncedPrice.max) {
    setLastSyncedPrice({ min: filters.priceMin, max: filters.priceMax });
    setPriceMinInput(filters.priceMin != null ? String(filters.priceMin) : "");
    setPriceMaxInput(filters.priceMax != null ? String(filters.priceMax) : "");
  }
  const [lastSyncedArea, setLastSyncedArea] = useState<{ min?: number; max?: number }>({
    min: filters.areaMin,
    max: filters.areaMax,
  });
  if (filters.areaMin !== lastSyncedArea.min || filters.areaMax !== lastSyncedArea.max) {
    setLastSyncedArea({ min: filters.areaMin, max: filters.areaMax });
    setAreaMinInput(filters.areaMin != null ? String(filters.areaMin) : "");
    setAreaMaxInput(filters.areaMax != null ? String(filters.areaMax) : "");
  }

  /* --- Debounced sync of free-text q ------------------------------ */
  useEffect(() => {
    const t = setTimeout(() => {
      if ((filters.q ?? "") !== qInput) {
        setFilters({ q: qInput.trim() || undefined });
        onAfterChange?.();
      }
    }, 300);
    return () => clearTimeout(t);
  }, [qInput]);

  /* --- Debounced sync of price / area numeric inputs -------------- */
  useEffect(() => {
    const t = setTimeout(() => {
      const min = priceMinInput.trim() === "" ? undefined : Number(priceMinInput);
      const max = priceMaxInput.trim() === "" ? undefined : Number(priceMaxInput);
      const cur = filters;
      if ((cur.priceMin ?? undefined) !== (min ?? undefined) || (cur.priceMax ?? undefined) !== (max ?? undefined)) {
        setFilters({ priceMin: min, priceMax: max });
        onAfterChange?.();
      }
    }, 500);
    return () => clearTimeout(t);
  }, [priceMinInput, priceMaxInput]);

  useEffect(() => {
    const t = setTimeout(() => {
      const min = areaMinInput.trim() === "" ? undefined : Number(areaMinInput);
      const max = areaMaxInput.trim() === "" ? undefined : Number(areaMaxInput);
      const cur = filters;
      if ((cur.areaMin ?? undefined) !== (min ?? undefined) || (cur.areaMax ?? undefined) !== (max ?? undefined)) {
        setFilters({ areaMin: min, areaMax: max });
        onAfterChange?.();
      }
    }, 500);
    return () => clearTimeout(t);
  }, [areaMinInput, areaMaxInput]);

  /* --- Derived: which price ranges to show ------------------------ */
  const priceRanges =
    filters.operation === "ARRIENDO" || filters.operation === "TEMPORAL"
      ? RENT_RANGES_COP
      : PRICE_RANGES_COP;

  const isPriceRangeSelected = (min: number, max: number) =>
    filters.priceMin === min && filters.priceMax === max;

  const togglePriceRange = (min: number, max: number) => {
    if (isPriceRangeSelected(min, max)) {
      setFilters({ priceMin: undefined, priceMax: undefined });
    } else {
      setFilters({ priceMin: min, priceMax: max });
    }
    onAfterChange?.();
  };

  const isAreaRangeSelected = (min: number, max: number) =>
    filters.areaMin === min && filters.areaMax === max;

  const toggleAreaRange = (min: number, max: number) => {
    if (isAreaRangeSelected(min, max)) {
      setFilters({ areaMin: undefined, areaMax: undefined });
    } else {
      setFilters({ areaMin: min, areaMax: max });
    }
    onAfterChange?.();
  };

  /* --- Pill toggle (bedrooms/bathrooms/parking/stratum) ----------- */
  const toggleNumFilter = (key: "bedrooms" | "bathrooms" | "parking" | "stratum", val: number) => {
    if (filters[key] === val) {
      setFilters({ [key]: undefined } as Partial<SearchFilters>);
    } else {
      setFilters({ [key]: val } as Partial<SearchFilters>);
    }
    onAfterChange?.();
  };

  /* --- Amenities multi-select ------------------------------------- */
  const toggleAmenity = (slug: string) => {
    const cur = filters.amenities ?? [];
    const next = cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug];
    setFilters({ amenities: next.length ? next : undefined });
    onAfterChange?.();
  };

  /* --- Operation change should reset price filters (range mismatch) */
  const handleOperation = (op: string) => {
    if (op === "all") {
      setFilters({ operation: undefined, priceMin: undefined, priceMax: undefined });
    } else {
      setFilters({ operation: op, priceMin: undefined, priceMax: undefined });
    }
    onAfterChange?.();
  };

  const handleCityChange = (cityId: string | undefined) => {
    setFilters({ cityId, neighborhoodId: undefined });
    onAfterChange?.();
  };

  /* --- Reusable pill-button component ----------------------------- */
  const Pill = ({
    active,
    onClick,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-full border px-3 text-xs font-semibold transition-colors",
        active
          ? "border-blue-600 bg-blue-600 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
      )}
    >
      {children}
    </button>
  );

  const accordionValue = ["loc", "op", "type", "price", "area", "bed", "bath", "park", "stratum", "feat", "amen"];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <SlidersHorizontal className="h-4 w-4 text-blue-600" />
          Filtros
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className="h-7 gap-1 px-2 text-xs text-slate-500 hover:text-rose-600"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Limpiar
        </Button>
      </div>

      {/* Free-text search */}
      <div className="border-b border-slate-100 px-4 py-3">
        <Label htmlFor="filter-q" className="mb-1.5 block text-xs font-semibold text-slate-700">
          Buscar
        </Label>
        <Input
          id="filter-q"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Texto o código INV-…"
          className="h-9 text-sm"
        />
      </div>

      {/* Accordion sections */}
      <div className="flex-1 overflow-y-auto scroll-brand px-4">
        <Accordion type="multiple" defaultValue={accordionValue} className="w-full">
          {/* 1. Ubicación */}
          <AccordionItem value="loc">
            <AccordionTrigger className="py-3 text-sm font-bold text-slate-900 hover:no-underline">
              Ubicación
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div>
                <Label className="mb-1.5 block text-xs font-medium text-slate-600">Ciudad</Label>
                <Select
                  value={filters.cityId ?? "all"}
                  onValueChange={(v) => handleCityChange(v === "all" ? undefined : v)}
                >
                  <SelectTrigger className="h-9 w-full bg-white">
                    <SelectValue placeholder="Todas las ciudades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las ciudades</SelectItem>
                    {cities.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.propertyCount})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-medium text-slate-600">Barrio</Label>
                <Select
                  value={filters.neighborhoodId ?? "all"}
                  onValueChange={(v) => {
                    setFilters({ neighborhoodId: v === "all" ? undefined : v });
                    onAfterChange?.();
                  }}
                  disabled={!filters.cityId}
                >
                  <SelectTrigger className="h-9 w-full bg-white" disabled={!filters.cityId}>
                    <SelectValue
                      placeholder={
                        !filters.cityId
                          ? "Selecciona ciudad"
                          : neighborhoodsLoading
                          ? "Cargando…"
                          : "Todos los barrios"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los barrios</SelectItem>
                    {neighborhoods.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.name} ({n.propertyCount})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 2. Operación */}
          <AccordionItem value="op">
            <AccordionTrigger className="py-3 text-sm font-bold text-slate-900 hover:no-underline">
              Operación
            </AccordionTrigger>
            <AccordionContent>
              <RadioGroup
                value={filters.operation ?? "all"}
                onValueChange={handleOperation}
                className="gap-1.5"
              >
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-slate-50">
                  <RadioGroupItem value="all" id="op-all" />
                  <span>Todas</span>
                </label>
                {OPERATIONS.map((op) => (
                  <label
                    key={op.value}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-slate-50"
                  >
                    <RadioGroupItem value={op.value} id={`op-${op.value}`} />
                    <span>{op.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </AccordionContent>
          </AccordionItem>

          {/* 3. Tipo */}
          <AccordionItem value="type">
            <AccordionTrigger className="py-3 text-sm font-bold text-slate-900 hover:no-underline">
              Tipo de inmueble
            </AccordionTrigger>
            <AccordionContent>
              <Select
                value={filters.propertyType ?? "all"}
                onValueChange={(v) => {
                  setFilters({ propertyType: v === "all" ? undefined : v });
                  onAfterChange?.();
                }}
              >
                <SelectTrigger className="h-9 w-full bg-white">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {PROPERTY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="mr-1">{t.icon}</span>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </AccordionContent>
          </AccordionItem>

          {/* 4. Precio */}
          <AccordionItem value="price">
            <AccordionTrigger className="py-3 text-sm font-bold text-slate-900 hover:no-underline">
              Precio
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="space-y-2">
                {priceRanges.map((r) => (
                  <label
                    key={r.label}
                    className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"
                  >
                    <Checkbox
                      checked={isPriceRangeSelected(r.min, r.max)}
                      onCheckedChange={() => togglePriceRange(r.min, r.max)}
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={priceMinInput}
                  onChange={(e) => setPriceMinInput(e.target.value)}
                  placeholder="$ Mín"
                  className="h-9 text-sm"
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={priceMaxInput}
                  onChange={(e) => setPriceMaxInput(e.target.value)}
                  placeholder="$ Máx"
                  className="h-9 text-sm"
                />
              </div>
              <p className="text-[11px] text-slate-400">Pesos colombianos (COP)</p>
            </AccordionContent>
          </AccordionItem>

          {/* 5. Área */}
          <AccordionItem value="area">
            <AccordionTrigger className="py-3 text-sm font-bold text-slate-900 hover:no-underline">
              Área (m²)
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="space-y-2">
                {AREA_RANGES.map((r) => (
                  <label
                    key={r.label}
                    className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"
                  >
                    <Checkbox
                      checked={isAreaRangeSelected(r.min, r.max)}
                      onCheckedChange={() => toggleAreaRange(r.min, r.max)}
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={areaMinInput}
                  onChange={(e) => setAreaMinInput(e.target.value)}
                  placeholder="m² Mín"
                  className="h-9 text-sm"
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={areaMaxInput}
                  onChange={(e) => setAreaMaxInput(e.target.value)}
                  placeholder="m² Máx"
                  className="h-9 text-sm"
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 6. Habitaciones */}
          <AccordionItem value="bed">
            <AccordionTrigger className="py-3 text-sm font-bold text-slate-900 hover:no-underline">
              Habitaciones
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2">
                {BEDROOM_OPTIONS.map((n) => (
                  <Pill
                    key={n}
                    active={filters.bedrooms === n}
                    onClick={() => toggleNumFilter("bedrooms", n)}
                  >
                    +{n}
                  </Pill>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 7. Baños */}
          <AccordionItem value="bath">
            <AccordionTrigger className="py-3 text-sm font-bold text-slate-900 hover:no-underline">
              Baños
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2">
                {BATHROOM_OPTIONS.map((n) => (
                  <Pill
                    key={n}
                    active={filters.bathrooms === n}
                    onClick={() => toggleNumFilter("bathrooms", n)}
                  >
                    +{n}
                  </Pill>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 8. Parqueaderos */}
          <AccordionItem value="park">
            <AccordionTrigger className="py-3 text-sm font-bold text-slate-900 hover:no-underline">
              Parqueaderos
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2">
                {PARKING_OPTIONS.map((n) => (
                  <Pill
                    key={n}
                    active={filters.parking === n}
                    onClick={() => toggleNumFilter("parking", n)}
                  >
                    +{n}
                  </Pill>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 9. Estrato */}
          <AccordionItem value="stratum">
            <AccordionTrigger className="py-3 text-sm font-bold text-slate-900 hover:no-underline">
              Estrato
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2">
                {STRATUM_OPTIONS.map((n) => (
                  <Pill
                    key={n}
                    active={filters.stratum === n}
                    onClick={() => toggleNumFilter("stratum", n)}
                  >
                    {n}
                  </Pill>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 10. Características */}
          <AccordionItem value="feat">
            <AccordionTrigger className="py-3 text-sm font-bold text-slate-900 hover:no-underline">
              Características
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <label className="flex cursor-pointer items-center justify-between gap-2 text-sm text-slate-700">
                <span>Amoblado</span>
                <Switch
                  checked={!!filters.furnished}
                  onCheckedChange={(v) => {
                    setFilters({ furnished: v || undefined });
                    onAfterChange?.();
                  }}
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-2 text-sm text-slate-700">
                <span>Pet friendly</span>
                <Switch
                  checked={!!filters.petFriendly}
                  onCheckedChange={(v) => {
                    setFilters({ petFriendly: v || undefined });
                    onAfterChange?.();
                  }}
                />
              </label>
            </AccordionContent>
          </AccordionItem>

          {/* 11. Amenidades */}
          <AccordionItem value="amen">
            <AccordionTrigger className="py-3 text-sm font-bold text-slate-900 hover:no-underline">
              Amenidades
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              {AMENITY_CATEGORIES.map((cat) => {
                const items = amenities.filter((a) => a.category === cat.key);
                if (!items.length) return null;
                return (
                  <div key={cat.key}>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      {cat.label}
                    </p>
                    <div className="space-y-1.5">
                      {items.map((a) => {
                        const checked = filters.amenities?.includes(a.slug) ?? false;
                        return (
                          <label
                            key={a.id}
                            className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleAmenity(a.slug)}
                            />
                            <AmenityIcon slug={a.slug} className="h-3.5 w-3.5 text-blue-600" />
                            <span>{amenityLabel(a.slug)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 p-3">
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full border-slate-300 text-slate-700 hover:border-rose-300 hover:text-rose-600"
          onClick={resetFilters}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Limpiar filtros
        </Button>
      </div>
    </div>
  );
}

/* ============================================================
   Skeleton card
   ============================================================ */

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <div className="flex justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex gap-1.5 pt-1">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Separator className="my-1" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}

/* ============================================================
   Pagination
   ============================================================ */

function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (n: number) => void;
}) {
  if (total === 0) return null;
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  // Build page list with ellipsis
  const pages: (number | "…")[] = [];
  const push = (n: number | "…") => pages.push(n);
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) push(i);
  } else {
    push(1);
    if (page > 3) push("…");
    const from = Math.max(2, page - 1);
    const to = Math.min(totalPages - 1, page + 1);
    for (let i = from; i <= to; i++) push(i);
    if (page < totalPages - 2) push("…");
    push(totalPages);
  }

  return (
    <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row">
      <p className="text-sm text-slate-500">
        Mostrando <span className="font-semibold text-slate-900">{formatNumber(start)}</span>–
        <span className="font-semibold text-slate-900">{formatNumber(end)}</span> de{" "}
        <span className="font-semibold text-slate-900">{formatNumber(total)}</span> inmuebles
      </p>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="h-9 gap-1 border-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Anterior</span>
        </Button>

        <div className="flex items-center gap-1">
          {pages.map((p, i) =>
            p === "…" ? (
              <span
                key={`e-${i}`}
                className="px-2 text-sm text-slate-400"
                aria-hidden
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onChange(p)}
                className={cn(
                  "h-9 min-w-9 rounded-md px-3 text-sm font-semibold transition-colors",
                  p === page
                    ? "bg-blue-600 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                )}
              >
                {p}
              </button>
            )
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="h-9 gap-1 border-slate-200"
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ============================================================
   Active-filter chips
   ============================================================ */

function buildChips(
  filters: SearchFilters,
  cities: CityItem[],
  neighborhoods: NeighborhoodItem[],
  setFilters: (f: Partial<SearchFilters>) => void
): ChipDef[] {
  const chips: ChipDef[] = [];
  const city = cities.find((c) => c.id === filters.cityId);
  const nbh = neighborhoods.find((n) => n.id === filters.neighborhoodId);

  if (filters.q) {
    chips.push({
      key: "q",
      label: `“${filters.q}”`,
      clear: () => setFilters({ q: undefined }),
    });
  }
  if (filters.operation) {
    chips.push({
      key: "op",
      label: OPERATION_LABELS[filters.operation] ?? filters.operation,
      clear: () => setFilters({ operation: undefined }),
    });
  }
  if (filters.propertyType) {
    chips.push({
      key: "type",
      label: PROPERTY_TYPE_LABELS[filters.propertyType] ?? filters.propertyType,
      clear: () => setFilters({ propertyType: undefined }),
    });
  }
  if (city) {
    chips.push({
      key: "city",
      label: city.name,
      clear: () => setFilters({ cityId: undefined, neighborhoodId: undefined }),
    });
  }
  if (nbh) {
    chips.push({
      key: "nbh",
      label: nbh.name,
      clear: () => setFilters({ neighborhoodId: undefined }),
    });
  }
  if (filters.priceMin != null || filters.priceMax != null) {
    const min = filters.priceMin ?? 0;
    const max = filters.priceMax;
    const label = max != null
      ? `${formatPriceShort(min)} – ${formatPriceShort(max)}`
      : `Desde ${formatPriceShort(min)}`;
    chips.push({
      key: "price",
      label,
      clear: () => setFilters({ priceMin: undefined, priceMax: undefined }),
    });
  }
  if (filters.areaMin != null || filters.areaMax != null) {
    const min = filters.areaMin ?? 0;
    const max = filters.areaMax;
    const label = max != null ? `${min}–${max} m²` : `Desde ${min} m²`;
    chips.push({
      key: "area",
      label,
      clear: () => setFilters({ areaMin: undefined, areaMax: undefined }),
    });
  }
  if (filters.bedrooms != null) {
    chips.push({
      key: "bed",
      label: `≥${filters.bedrooms} hab.`,
      clear: () => setFilters({ bedrooms: undefined }),
    });
  }
  if (filters.bathrooms != null) {
    chips.push({
      key: "bath",
      label: `≥${filters.bathrooms} baños`,
      clear: () => setFilters({ bathrooms: undefined }),
    });
  }
  if (filters.parking != null) {
    chips.push({
      key: "park",
      label: `≥${filters.parking} parqueaderos`,
      clear: () => setFilters({ parking: undefined }),
    });
  }
  if (filters.stratum != null) {
    chips.push({
      key: "stratum",
      label: `Estrato ${filters.stratum}`,
      clear: () => setFilters({ stratum: undefined }),
    });
  }
  if (filters.furnished) {
    chips.push({
      key: "furnished",
      label: "Amoblado",
      clear: () => setFilters({ furnished: undefined }),
    });
  }
  if (filters.petFriendly) {
    chips.push({
      key: "pet",
      label: "Pet friendly",
      clear: () => setFilters({ petFriendly: undefined }),
    });
  }
  (filters.amenities ?? []).forEach((slug) => {
    chips.push({
      key: `amen-${slug}`,
      label: amenityLabel(slug),
      clear: () =>
        setFilters({
          amenities: (filters.amenities ?? []).filter((s) => s !== slug),
        }),
    });
  });
  return chips;
}

/* ============================================================
   Main ResultsView component
   ============================================================ */

export function ResultsView() {
  const { filters, setFilters, resetFilters, isFiltersOpen, setFiltersOpen, goHome } = useNav();

  const [cities, setCities] = useState<CityItem[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodItem[]>([]);
  const [neighborhoodsLoading, setNeighborhoodsLoading] = useState(false);
  const [amenities, setAmenities] = useState<AmenityItem[]>([]);

  const [data, setData] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resultsRef = useRef<HTMLDivElement>(null);
  const reqIdRef = useRef(0);

  /* ---- Load cities + amenities once ---- */
  useEffect(() => {
    let alive = true;
    fetch("/api/cities")
      .then((r) => r.json())
      .then((d) => {
        if (alive && Array.isArray(d.items)) setCities(d.items);
      })
      .catch(() => {});
    fetch("/api/amenities")
      .then((r) => r.json())
      .then((d) => {
        if (alive && Array.isArray(d.items)) setAmenities(d.items);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  /* ---- Load neighborhoods when city changes ---- */
  useEffect(() => {
    if (!filters.cityId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNeighborhoods([]);
      return;
    }
    let alive = true;
    setNeighborhoodsLoading(true);
    fetch(`/api/neighborhoods?cityId=${encodeURIComponent(filters.cityId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (alive && Array.isArray(d.items)) setNeighborhoods(d.items);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setNeighborhoodsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [filters.cityId]);

  /* ---- Search properties when filters change ---- */
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  useEffect(() => {
    const id = ++reqIdRef.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    const qs = buildQuery(filters);
    fetch(`/api/properties?${qs}`)
      .then((r) => {
        if (!r.ok) throw new Error("Error en búsqueda");
        return r.json();
      })
      .then((d: SearchResult) => {
        if (id !== reqIdRef.current) return; // stale
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        if (id !== reqIdRef.current) return;
        setError(e?.message ?? "Error al cargar resultados");
        setLoading(false);
      });
  }, [filtersKey]);

  /* ---- Scroll to top of results on page change ---- */
  const scrollToResults = () => {
    if (typeof window !== "undefined" && resultsRef.current) {
      const y = resultsRef.current.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const handlePageChange = (n: number) => {
    setFilters({ page: n });
    scrollToResults();
  };

  /* ---- Breadcrumb pieces ---- */
  const city = cities.find((c) => c.id === filters.cityId);
  const crumbs = [
    { label: "Inicio", onClick: goHome },
    { label: "Inmuebles", onClick: resetFilters },
    filters.operation
      ? { label: OPERATION_LABELS[filters.operation] ?? filters.operation, onClick: () => setFilters({ operation: undefined }) }
      : null,
    city ? { label: city.name, onClick: () => setFilters({ cityId: undefined, neighborhoodId: undefined }) } : null,
  ].filter(Boolean) as { label: string; onClick: () => void }[];

  /* ---- Dynamic H1 ---- */
  const h1 = useMemo(() => {
    const typePlural = pluralizeType(filters.propertyType);
    const opLabel = filters.operation
      ? filters.operation === "VENTA"
        ? "en venta"
        : filters.operation === "ARRIENDO"
        ? "en arriendo"
        : "en arriendo temporal"
      : "";
    const head = [typePlural ?? "Inmuebles", opLabel].filter(Boolean).join(" ");
    const tail = city ? ` en ${city.name}` : "";
    const q = filters.q ? ` — “${filters.q}”` : "";
    return `${head}${tail}${q}`;
  }, [filters.propertyType, filters.operation, filters.cityId, filters.q, city]);

  /* ---- Active-filter chips ---- */
  const chips = useMemo(
    () => buildChips(filters, cities, neighborhoods, setFilters),
    [filters, cities, neighborhoods, setFilters]
  );

  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = filters.page ?? 1;

  const hasActiveFilters = chips.length > 0;

  return (
    <div ref={resultsRef} className="min-h-screen bg-slate-50">
      {/* ===== Breadcrumb ===== */}
      <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-1 text-xs text-slate-500">
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <span key={`${c.label}-${i}`} className="flex items-center gap-1">
                {i === 0 ? (
                  <HomeIcon className="mr-0.5 h-3.5 w-3.5" />
                ) : null}
                <button
                  type="button"
                  onClick={c.onClick}
                  className={cn(
                    "transition-colors hover:text-blue-700",
                    isLast && "font-semibold text-slate-900"
                  )}
                >
                  {c.label}
                </button>
                {!isLast && <ChevronRight className="h-3 w-3 text-slate-300" />}
              </span>
            );
          })}
        </nav>
      </div>

      {/* ===== Sticky header ===== */}
      <div className="sticky top-16 z-30 mt-4 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {h1}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {!loading && (
                <>
                  <span className="font-semibold text-slate-700">{formatNumber(total)}</span> inmuebles
                  encontrados
                </>
              )}
              {loading && <span className="text-slate-400">Buscando inmuebles…</span>}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="sort" className="hidden text-xs font-medium text-slate-500 sm:inline">
                Ordenar
              </Label>
              <Select
                value={filters.sort ?? "recientes"}
                onValueChange={(v) => setFilters({ sort: v })}
              >
                <SelectTrigger id="sort" className="h-9 w-[180px] bg-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mobile: open filters sheet */}
            <Button
              variant="default"
              className="h-9 gap-2 bg-blue-600 text-white hover:bg-blue-700 lg:hidden"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {hasActiveFilters && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/25 px-1.5 text-[10px] font-bold">
                  {chips.length}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ===== Main grid ===== */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          {/* Left sidebar (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-36 max-h-[calc(100vh-10rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <FilterPanel
                filters={filters}
                setFilters={setFilters}
                resetFilters={resetFilters}
                cities={cities}
                neighborhoods={neighborhoods}
                amenities={amenities}
                neighborhoodsLoading={neighborhoodsLoading}
              />
            </div>
          </aside>

          {/* Right results */}
          <section className="min-w-0">
            {/* Active chips row */}
            {hasActiveFilters && (
              <div className="mb-5 flex flex-wrap items-center gap-2">
                {chips.map((c) => (
                  <Badge
                    key={c.key}
                    variant="outline"
                    className="gap-1 rounded-full border-blue-200 bg-blue-50 py-1 pl-3 pr-1.5 text-xs font-medium text-blue-800"
                  >
                    {c.label}
                    <button
                      type="button"
                      aria-label={`Quitar ${c.label}`}
                      onClick={c.clear}
                      className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-blue-600 transition-colors hover:bg-blue-200 hover:text-blue-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-7 gap-1 px-2 text-xs text-slate-500 hover:text-rose-600"
                >
                  <RotateCcw className="h-3 w-3" />
                  Limpiar todo
                </Button>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                  <X className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  No pudimos cargar los resultados
                </h3>
                <p className="mt-1 text-sm text-slate-500">{error}</p>
                <Button
                  className="mt-4 bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => setFilters({ ...filters })}
                >
                  Reintentar
                </Button>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && items.length === 0 && (
              <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Building2 className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  No encontramos inmuebles
                </h3>
                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  Prueba ampliar la zona, ajustar el rango de precio o quitar algunos filtros
                  para ver más opciones.
                </p>
                {hasActiveFilters && (
                  <Button
                    className="mt-5 gap-2 bg-blue-600 text-white hover:bg-blue-700"
                    onClick={resetFilters}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Limpiar filtros
                  </Button>
                )}
              </div>
            )}

            {/* Loaded */}
            {!loading && !error && items.length > 0 && (
              <>
                <motion.div
                  key={`${filtersKey}-${currentPage}`}
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.04 } },
                  }}
                  className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
                >
                  {items.map((p, i) => (
                    <motion.div
                      key={p.code}
                      variants={{
                        hidden: { opacity: 0, y: 16 },
                        show: { opacity: 1, y: 0 },
                      }}
                      transition={{ duration: 0.35 }}
                    >
                      <PropertyCard property={p} index={i} />
                    </motion.div>
                  ))}
                </motion.div>

                <Pagination
                  page={currentPage}
                  totalPages={totalPages}
                  total={total}
                  onChange={handlePageChange}
                />
              </>
            )}

            {/* Empty-state helper at bottom when no items */}
            {!loading && !error && items.length === 0 && (
              <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <MapPin className="h-3.5 w-3.5" />
                Sugerencia: explora Medellín, Bogotá o Barranquilla — tenemos propiedades
                destacadas en cada ciudad.
              </p>
            )}
          </section>
        </div>
      </div>

      {/* ===== Mobile filter sheet ===== */}
      <Sheet open={isFiltersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="left" className="w-[88%] max-w-md p-0 sm:max-w-md">
          <SheetTitle className="sr-only">Filtros de búsqueda</SheetTitle>
          <FilterPanel
            filters={filters}
            setFilters={(f) => setFilters(f)}
            resetFilters={resetFilters}
            cities={cities}
            neighborhoods={neighborhoods}
            amenities={amenities}
            neighborhoodsLoading={neighborhoodsLoading}
            onAfterChange={() => {
              /* close on demand could go here; left open for fine-tuning */
            }}
          />
          <div className="border-t border-slate-200 bg-white p-3">
            <Button
              className="h-10 w-full bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => setFiltersOpen(false)}
            >
              Ver {formatNumber(total)} resultados
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default ResultsView;
