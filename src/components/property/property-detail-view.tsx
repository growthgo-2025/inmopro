"use client";

/**
 * PropertyDetailView — premium real-estate property detail page
 * (mitula/idealista-inspired).
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ Breadcrumb · Back button                                     │
 *   │ Title bar (H1 + location) · Share + Favorite                 │
 *   │ Meta row (operation · type · code · views · published ago)   │
 *   │ Gallery (main image + thumbnail strip + zoom + fullscreen)   │
 *   ├────────────────────────────────┬─────────────────────────────┤
 *   │ Left column (content)          │ Right column (sticky)       │
 *   │  · Price card + CTAs           │  · Contact card (agent +    │
 *   │  · Key features (6 tiles)      │    agency + lead form)      │
 *   │  · Description                 │  · Share card (FB/WA/LI/X/  │
 *   │  · Additional features         │    copy)                    │
 *   │  · Amenities grid              │                             │
 *   │  · Map (OSM static + overlay)  │                             │
 *   │  · Similar properties          │                             │
 *   └────────────────────────────────┴─────────────────────────────┘
 *   SEO JSON-LD (RealEstateListing) injected as script tag.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  MapPin, BedDouble, Bath, Car, Maximize, Layers, CalendarClock,
  Heart, Share2, ChevronRight, ChevronLeft, Eye, Clock, ZoomIn, Maximize2,
  Phone, Mail, MessageCircle, Facebook, Twitter, Linkedin, Link2,
  Check, X, Building2, ArrowLeft, Send, ShieldCheck,
  Home as HomeIcon, Tag, ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

import {
  formatPrice, formatPriceShort, formatArea, formatNumber,
  formatRelativeTime, PROPERTY_TYPE_LABELS, OPERATION_LABELS, OPERATION_COLORS,
} from "@/lib/format";
import { useNav } from "@/lib/store";
import { PropertyCodeBadge } from "./property-code-badge";
import { AmenityIcon, amenityLabel } from "./amenity-icon";
import { PropertyCard } from "./property-card";
import type { PropertyDetail, PropertyListItem } from "@/lib/queries";

/* ============================================================
   Helpers
   ============================================================ */

interface ContactForm {
  name: string;
  email: string;
  phone: string;
  message: string;
}

function initials(name: string | null): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function phoneDigits(p: string | null): string {
  if (!p) return "";
  // keep only digits, strip leading country code zeros if any
  return p.replace(/[^\d]/g, "");
}

function buildWhatsappUrl(phone: string | null, message: string): string {
  const digits = phoneDigits(phone);
  // Colombian numbers need country code 57 if not present
  let normalized = digits;
  if (normalized && !normalized.startsWith("57") && normalized.length === 10) {
    normalized = "57" + normalized;
  }
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
};

/* ============================================================
   Sub-components
   ============================================================ */

function Breadcrumbs({ p }: { p: PropertyDetail }) {
  const { goHome, openResults } = useNav();
  const opLabel = OPERATION_LABELS[p.operation] || p.operation;
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
      <button onClick={goHome} className="inline-flex items-center gap-1 rounded hover:text-blue-600">
        <HomeIcon className="h-3.5 w-3.5" /> Inicio
      </button>
      <ChevronRight className="h-3 w-3 opacity-50" />
      <button
        onClick={() => openResults({})}
        className="rounded hover:text-blue-600"
      >
        Inmuebles
      </button>
      <ChevronRight className="h-3 w-3 opacity-50" />
      <button
        onClick={() => openResults({ operation: p.operation })}
        className="rounded hover:text-blue-600"
      >
        {opLabel}
      </button>
      <ChevronRight className="h-3 w-3 opacity-50" />
      {p.cityName && (
        <>
          <button
            onClick={() => p.cityId && openResults({ cityId: p.cityId })}
            className="rounded hover:text-blue-600"
          >
            {p.cityName}
          </button>
          <ChevronRight className="h-3 w-3 opacity-50" />
        </>
      )}
      <span className="truncate font-medium text-slate-700">
        {p.neighborhoodName || p.title}
      </span>
    </nav>
  );
}

function TitleBar({
  p,
  fav,
  onToggleFav,
  onShare,
}: {
  p: PropertyDetail;
  fav: boolean;
  onToggleFav: () => void;
  onShare: () => void;
}) {
  return (
    <div className="mt-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: title + location */}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {p.title}
          </h1>
          <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
            <MapPin className="h-4 w-4 shrink-0 text-blue-600" />
            <span className="truncate">
              {[p.neighborhoodName, p.cityName, p.stateName].filter(Boolean).join(", ")}
            </span>
          </div>
        </div>

        {/* Right: share + favorite */}
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={onShare} className="gap-1.5">
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Compartir</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onToggleFav}
            aria-label={fav ? "Quitar de favoritos" : "Añadir a favoritos"}
            className={fav ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100" : ""}
          >
            <Heart className={`h-4 w-4 ${fav ? "fill-rose-500 text-rose-500" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Meta row */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${
            OPERATION_COLORS[p.operation] || "bg-slate-100 text-slate-700 border-slate-200"
          }`}
        >
          <Tag className="mr-1 h-3 w-3" />
          {OPERATION_LABELS[p.operation] || p.operation}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700">
          <Building2 className="h-3 w-3 text-slate-400" />
          {PROPERTY_TYPE_LABELS[p.propertyType] || p.propertyType}
        </span>
        <PropertyCodeBadge code={p.code} variant="solid" />
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-500">
          <Eye className="h-3 w-3" />
          {formatNumber(p.views)} visitas
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-500">
          <Clock className="h-3 w-3" />
          Publicado {formatRelativeTime(p.createdAt)}
        </span>
      </div>
    </div>
  );
}

function Gallery({
  images,
  title,
}: {
  images: { url: string; caption: string; isMain: boolean }[];
  title: string;
}) {
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // Reset index when the image set changes (navigating between properties).
  // React 19 "store previous value" pattern (preferred over useEffect).
  const [prevImages, setPrevImages] = useState(images);
  if (images !== prevImages) {
    setPrevImages(images);
    setIndex(0);
  }

  const total = images.length;
  const current = images[Math.min(index, total - 1)] || images[0];

  const go = (dir: 1 | -1) => {
    setIndex((i) => (i + dir + total) % total);
  };

  const openFullscreen = () => {
    setFullscreen(true);
  };

  // Keyboard navigation inside fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % total);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + total) % total);
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, total]);

  if (total === 0) {
    return (
      <div className="mt-5 flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 lg:aspect-video">
        <div className="flex flex-col items-center gap-2">
          <Building2 className="h-12 w-12" />
          <span className="text-sm font-medium">Sin imágenes disponibles</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5">
      {/* Main image */}
      <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-100 lg:aspect-video">
        <img
          src={current.url}
          alt={current.caption || title}
          className={`h-full w-full bg-slate-100 object-cover transition-transform duration-300 ${
            zoomed ? "scale-150 cursor-zoom-out" : "cursor-zoom-in"
          }`}
          onClick={() => setZoomed((z) => !z)}
        />

        {/* Caption (if any) */}
        {current.caption && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/70 to-transparent px-4 pb-3 pt-8 text-xs text-white/90">
            {current.caption}
          </div>
        )}

        {/* Counter (top-left) */}
        {total > 1 && (
          <div className="absolute left-3 top-3 rounded-md bg-slate-900/75 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            {index + 1} / {total}
          </div>
        )}

        {/* Arrow nav (on main) */}
        {total > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              aria-label="Imagen anterior"
              className="absolute left-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/90 p-2 text-slate-700 shadow-md transition hover:bg-white sm:flex"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Imagen siguiente"
              className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/90 p-2 text-slate-700 shadow-md transition hover:bg-white sm:flex"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Zoom + Fullscreen buttons (bottom-right) */}
        <div className="absolute bottom-3 right-3 flex gap-2">
          <button
            onClick={() => setZoomed((z) => !z)}
            aria-label="Ampliar imagen"
            title="Ampliar"
            className="flex items-center justify-center rounded-md bg-slate-900/80 p-2 text-white backdrop-blur-sm transition hover:bg-slate-900"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={openFullscreen}
            aria-label="Ver en pantalla completa"
            title="Pantalla completa"
            className="flex items-center justify-center rounded-md bg-slate-900/80 p-2 text-white backdrop-blur-sm transition hover:bg-slate-900"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Thumbnail strip */}
      {total > 1 && (
        <div className="scroll-brand mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === index
                  ? "border-blue-500 ring-2 ring-blue-200"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img
                src={img.url}
                alt={img.caption || `Miniatura ${i + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Dialog */}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent
          showCloseButton
          className="max-w-5xl border-slate-800 bg-slate-950/95 p-0 sm:max-w-6xl"
        >
          <DialogTitle className="sr-only">Galería del inmueble</DialogTitle>
          <div className="relative flex h-[80vh] w-full items-center justify-center">
            <img
              src={current.url}
              alt={current.caption || title}
              className="max-h-full max-w-full object-contain"
            />

            {/* Prev / Next */}
            {total > 1 && (
              <>
                <button
                  onClick={() => go(-1)}
                  aria-label="Anterior"
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white backdrop-blur-sm transition hover:bg-white/30"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={() => go(1)}
                  aria-label="Siguiente"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white backdrop-blur-sm transition hover:bg-white/30"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Counter */}
            {total > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/80 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
                {index + 1} / {total}
              </div>
            )}

            {/* Caption */}
            {current.caption && (
              <div className="absolute bottom-4 right-4 max-w-md rounded-md bg-slate-900/80 px-3 py-1.5 text-xs text-white/90 backdrop-blur-sm">
                {current.caption}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PriceCard({
  p,
  onContact,
}: {
  p: PropertyDetail;
  onContact: () => void;
}) {
  const opLabel = OPERATION_LABELS[p.operation] || p.operation;
  const opColor = OPERATION_COLORS[p.operation] || "bg-slate-100 text-slate-700 border-slate-200";
  const waMsg = `Hola, estoy interesado en el inmueble ${p.code} (${p.title}). ¿Me puedes dar más información?`;
  const waPhone = p.agencyPhone || p.agentPhone;

  return (
    <Card className="gap-0 overflow-hidden border-slate-200 p-0 sm:p-0">
      <div className="bg-gradient-to-br from-slate-50 to-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-3xl font-extrabold tracking-tight text-slate-900">
              {formatPrice(p.price, p.currency)}
            </div>
            {(p.pricePerM2 || p.area) && (
              <div className="mt-1 text-sm text-slate-500">
                {formatPriceShort(p.price, p.currency)}
                {p.pricePerM2 ? ` · ${formatPrice(p.pricePerM2, p.currency)}/m²` : ` · ${formatArea(p.area)}`}
              </div>
            )}
          </div>
          <span
            className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${opColor}`}
          >
            {opLabel}
          </span>
        </div>

        {p.adminFee ? (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            <Building2 className="h-3 w-3" />
            Administración: {formatPrice(p.adminFee, p.currency)}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-2 border-t border-slate-100 p-5 sm:grid-cols-2 sm:p-6">
        <Button onClick={onContact} className="w-full bg-blue-600 hover:bg-blue-700">
          <Mail className="h-4 w-4" />
          Contactar
        </Button>
        <Button
          asChild
          className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <a
            href={buildWhatsappUrl(waPhone, waMsg)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
        </Button>
      </div>
    </Card>
  );
}

function KeyFeatures({ p }: { p: PropertyDetail }) {
  const tiles: {
    label: string;
    value: string;
    icon: React.ReactNode;
  }[] = [
    {
      label: "Habitaciones",
      value: p.bedrooms != null ? String(p.bedrooms) : "—",
      icon: <BedDouble className="h-5 w-5" />,
    },
    {
      label: "Baños",
      value: p.bathrooms != null ? String(p.bathrooms) : "—",
      icon: <Bath className="h-5 w-5" />,
    },
    {
      label: "Área construida",
      value: formatArea(p.area),
      icon: <Maximize className="h-5 w-5" />,
    },
    {
      label: "Parqueaderos",
      value: p.parking != null ? String(p.parking) : "—",
      icon: <Car className="h-5 w-5" />,
    },
    {
      label: "Estrato",
      value: p.stratum != null ? String(p.stratum) : "—",
      icon: <Layers className="h-5 w-5" />,
    },
    {
      label: "Antigüedad",
      value: p.ageYears ? `${p.ageYears} ${p.ageYears === 1 ? "año" : "años"}` : "Nuevo",
      icon: <CalendarClock className="h-5 w-5" />,
    },
  ];

  return (
    <Card className="border-slate-200 p-5 sm:p-6">
      <h2 className="mb-4 text-base font-semibold text-slate-900">
        Características principales
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="flex flex-col items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              {t.icon}
            </span>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {t.label}
              </div>
              <div className="text-base font-bold text-slate-900">{t.value}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DescriptionBlock({ text }: { text: string }) {
  const paragraphs = useMemo(
    () => (text || "").split(/\n\n+/).map((s) => s.trim()).filter(Boolean),
    [text]
  );
  if (paragraphs.length === 0) return null;
  return (
    <section>
      <h3 className="mb-3 text-lg font-bold text-slate-900">
        Descripción del inmueble
      </h3>
      <div className="space-y-4 text-[15px] leading-relaxed text-slate-700">
        {paragraphs.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </section>
  );
}

function AdditionalFeatures({ p }: { p: PropertyDetail }) {
  const rows: { label: string; value: string | null; positive?: boolean }[] = [
    { label: "Amoblado", value: p.furnished ? "Sí" : "No", positive: p.furnished },
    { label: "Pet friendly", value: p.petFriendly ? "Sí" : "No", positive: p.petFriendly },
    { label: "Piso", value: p.floor != null ? String(p.floor) : null },
    { label: "Total pisos", value: p.floorsTotal != null ? String(p.floorsTotal) : null },
    { label: "Área construida", value: p.builtArea != null ? formatArea(p.builtArea) : null },
    {
      label: "Administración",
      value: p.adminFee != null ? formatPrice(p.adminFee, p.currency) : null,
    },
    { label: "Estado", value: p.status || null },
  ].filter((r) => r.value !== null && r.value !== undefined);

  if (rows.length === 0) return null;

  return (
    <Card className="border-slate-200 p-5 sm:p-6">
      <h3 className="mb-4 text-base font-semibold text-slate-900">
        Características adicionales
      </h3>
      <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between gap-2 border-b border-dashed border-slate-100 py-1.5 last:border-0"
          >
            <span className="text-sm text-slate-500">{r.label}</span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              {r.positive === true && (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              )}
              {r.positive === false && (
                <X className="h-3.5 w-3.5 text-slate-300" />
              )}
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AmenitiesGrid({ amenities }: { amenities: string[] }) {
  if (!amenities || amenities.length === 0) return null;
  return (
    <section>
      <h3 className="mb-3 text-lg font-bold text-slate-900">
        Amenidades y características
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {amenities.map((slug) => (
          <div
            key={slug}
            className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/60 p-3"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700">
              <AmenityIcon slug={slug} className="h-4 w-4" />
            </span>
            <span className="text-sm font-medium text-slate-700">
              {amenityLabel(slug)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function MapSection({ p }: { p: PropertyDetail }) {
  const hasCoords = p.latitude != null && p.longitude != null;
  const lat = p.latitude ?? 0;
  const lng = p.longitude ?? 0;
  const staticMapUrl = hasCoords
    ? `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=14&size=600x300&maptype=mapnik&markers=${lat},${lng},red-pushpin`
    : null;
  const googleMapsUrl = hasCoords
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : null;

  return (
    <section>
      <h3 className="mb-3 text-lg font-bold text-slate-900">Ubicación</h3>
      <Card className="overflow-hidden border-slate-200 p-0">
        <div className="relative">
          {hasCoords && staticMapUrl ? (
            <img
              src={staticMapUrl}
              alt={`Mapa de ${p.neighborhoodName || p.cityName || "la ubicación"}`}
              className="h-64 w-full object-cover sm:h-72"
            />
          ) : (
            <div className="relative flex h-64 w-full items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 sm:h-72">
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.08) 1px, transparent 1px)",
                  backgroundSize: "32px 32px",
                }}
              />
              <div className="relative flex flex-col items-center gap-2 text-slate-500">
                <MapPin className="h-10 w-10 text-blue-500" />
                <p className="text-sm font-medium">
                  Ubicación aproximada en {p.cityName || "Colombia"}
                </p>
              </div>
            </div>
          )}

          {/* Address overlay badge */}
          <div className="absolute left-3 top-3 max-w-[80%] rounded-lg bg-white/95 px-3 py-2 shadow-md backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
              <MapPin className="h-3.5 w-3.5 text-blue-600" />
              <span className="truncate">
                {[p.neighborhoodName, p.cityName].filter(Boolean).join(", ")}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              Dirección exacta al contactar al asesor
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 p-4">
          <p className="text-xs text-slate-500">
            La ubicación exacta se comparte al agendar una visita.
          </p>
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Ver en Google Maps
            </a>
          )}
        </div>
      </Card>
    </section>
  );
}

function SimilarProperties({ items }: { items: PropertyListItem[] }) {
  if (!items || items.length === 0) return null;
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-3">
        <h3 className="text-lg font-bold text-slate-900">Inmuebles similares</h3>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((p, i) => (
          <PropertyCard key={p.code} property={p} index={i} />
        ))}
      </div>
    </section>
  );
}

function ContactCard({
  p,
  innerRef,
}: {
  p: PropertyDetail;
  innerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [form, setForm] = useState<ContactForm>({
    name: "",
    email: "",
    phone: "",
    message: `Hola, estoy interesado en el inmueble ${p.code}. ¿Podríamos agendar una visita?`,
  });
  const [submitting, setSubmitting] = useState(false);
  const [phoneRevealed, setPhoneRevealed] = useState(false);

  const waPhone = p.agencyPhone || p.agentPhone;
  const displayPhone = p.agencyPhone || p.agentPhone;
  const mailtoUrl = p.agentEmail
    ? `mailto:${p.agentEmail}?subject=${encodeURIComponent(
        `Información del inmueble ${p.code}`
      )}&body=${encodeURIComponent(
        `Hola ${p.agentName || ""}, estoy interesado en el inmueble ${p.code} (${p.title}).`
      )}`
    : null;

  const waMsg = `Hola, estoy interesado en el inmueble ${p.code} (${p.title}). ¿Podríamos agendar una visita?`;

  const setField = (k: keyof ContactForm, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Ingresa tu nombre");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("Ingresa un email válido");
      return;
    }
    if (!form.phone.trim() || phoneDigits(form.phone).length < 7) {
      toast.error("Ingresa un teléfono válido");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/properties/${encodeURIComponent(p.code)}/contact`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            message: form.message.trim(),
            source: "WEB",
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "No se pudo enviar");
      }
      toast.success("Mensaje enviado. Un asesor te contactará pronto.", {
        description: `Lead #${data.leadId?.slice(-6) || ""}`,
      });
      setForm({
        name: "",
        email: "",
        phone: "",
        message: `Hola, estoy interesado en el inmueble ${p.code}. ¿Podríamos agendar una visita?`,
      });
    } catch (err: any) {
      toast.error("No se pudo enviar el mensaje", {
        description: err?.message || "Intenta de nuevo más tarde",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copyPhone = async () => {
    if (!displayPhone) return;
    try {
      await navigator.clipboard.writeText(displayPhone);
      toast.success("Teléfono copiado", { description: displayPhone });
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  return (
    <div ref={innerRef} className="scroll-mt-24">
      <Card className="overflow-hidden border-slate-200 p-0">
        {/* Agency + agent header */}
        <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white p-5">
          {(p.agencyName || p.agencyLogo) && (
            <div className="mb-3 flex items-center gap-2">
              {p.agencyLogo ? (
                <img
                  src={p.agencyLogo}
                  alt={p.agencyName || "Agencia"}
                  className="h-7 w-7 rounded-md object-contain"
                />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-white">
                  <Building2 className="h-4 w-4" />
                </span>
              )}
              <span className="text-sm font-bold text-slate-900">
                {p.agencyName || "Inmobiliaria"}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-white shadow">
              {p.agentAvatar ? (
                <AvatarImage src={p.agentAvatar} alt={p.agentName || "Asesor"} />
              ) : null}
              <AvatarFallback className="bg-blue-100 text-sm font-bold text-blue-700">
                {initials(p.agentName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-slate-900">
                {p.agentName || "Asesor inmobiliario"}
              </div>
              <div className="truncate text-xs text-slate-500">
                Asesor inmobiliario{p.agencyName ? ` · ${p.agencyName}` : ""}
              </div>
            </div>
          </div>
        </div>

        {/* Quick contact actions */}
        <div className="grid grid-cols-3 gap-2 border-b border-slate-100 p-4">
          {displayPhone && (
            <Button
              variant="outline"
              size="sm"
              className="flex-col gap-1 h-auto py-2"
              onClick={() => {
                setPhoneRevealed(true);
                copyPhone();
              }}
              title="Mostrar y copiar teléfono"
            >
              <Phone className="h-4 w-4" />
              <span className="text-[10px] font-medium">
                {phoneRevealed ? displayPhone : "Llamar"}
              </span>
            </Button>
          )}
          {waPhone && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="flex-col gap-1 h-auto py-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              <a
                href={buildWhatsappUrl(waPhone, waMsg)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-[10px] font-medium">WhatsApp</span>
              </a>
            </Button>
          )}
          {mailtoUrl && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="flex-col gap-1 h-auto py-2"
            >
              <a href={mailtoUrl}>
                <Mail className="h-4 w-4" />
                <span className="text-[10px] font-medium">Email</span>
              </a>
            </Button>
          )}
        </div>

        {/* Contact form */}
        <form onSubmit={handleSubmit} className="space-y-3 p-5">
          <div className="text-sm font-bold text-slate-900">
            Solicita más información
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cf-name" className="text-xs font-medium text-slate-600">
              Nombre <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="cf-name"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Tu nombre completo"
              autoComplete="name"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cf-email" className="text-xs font-medium text-slate-600">
              Email <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="cf-email"
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cf-phone" className="text-xs font-medium text-slate-600">
              Teléfono <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="cf-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="+57 300 000 0000"
              autoComplete="tel"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cf-msg" className="text-xs font-medium text-slate-600">
              Mensaje
            </Label>
            <Textarea
              id="cf-msg"
              value={form.message}
              onChange={(e) => setField("message", e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Enviando…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar mensaje
              </>
            )}
          </Button>

          <p className="text-[11px] leading-relaxed text-slate-400">
            Al contactar aceptas nuestra política de privacidad. Tus datos se
            usan solo para gestionar tu interés en este inmueble.
          </p>
        </form>
      </Card>
    </div>
  );
}

function ShareCard() {
  const [url, setUrl] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(window.location.href);
  }, []);

  const shareText = "Mira este inmueble en InmoPro";
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(shareText);

  const links = [
    {
      label: "Facebook",
      icon: <Facebook className="h-4 w-4" />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: "hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200",
    },
    {
      label: "WhatsApp",
      icon: <MessageCircle className="h-4 w-4" />,
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`,
      color: "hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200",
    },
    {
      label: "LinkedIn",
      icon: <Linkedin className="h-4 w-4" />,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: "hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200",
    },
    {
      label: "Twitter / X",
      icon: <Twitter className="h-4 w-4" />,
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      color: "hover:bg-slate-100 hover:text-slate-900",
    },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado", { description: url });
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  return (
    <Card className="border-slate-200 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Share2 className="h-4 w-4 text-blue-600" />
        <h4 className="text-sm font-bold text-slate-900">
          Compartir este inmueble
        </h4>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {links.map((l) => (
          <Button
            key={l.label}
            asChild
            variant="outline"
            size="sm"
            className={`justify-start gap-2 ${l.color}`}
          >
            <a href={l.href} target="_blank" rel="noopener noreferrer">
              {l.icon}
              <span className="text-xs">{l.label}</span>
            </a>
          </Button>
        ))}
      </div>
      <Separator className="my-3" />
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-center gap-2"
        onClick={copyLink}
      >
        <Link2 className="h-4 w-4" />
        Copiar enlace
      </Button>
    </Card>
  );
}

function NotFound({ onHome }: { onHome: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-24 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Building2 className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">Inmueble no encontrado</h2>
      <p className="mt-1 text-sm text-slate-500">
        El inmueble que buscas no existe o ya no está disponible.
      </p>
      <Button onClick={onHome} className="mt-6 bg-blue-600 hover:bg-blue-700">
        <HomeIcon className="h-4 w-4" />
        Volver al inicio
      </Button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Skeleton className="h-4 w-72" />
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-6 w-32" />
      </div>
      <Skeleton className="mt-5 aspect-[16/9] w-full rounded-2xl" />
      <div className="mt-3 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-24 rounded-lg" />
        ))}
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-96 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function JsonLd({ p }: { p: PropertyDetail }) {
  const mainImage = p.mainImage || p.images?.[0]?.url;
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: p.title,
    description: p.metaDescription || p.shortDesc || p.description?.slice(0, 200),
    url: typeof window !== "undefined" ? window.location.href : "",
    image: mainImage || undefined,
    datePublished: new Date(p.createdAt).toISOString(),
    offers: {
      "@type": "Offer",
      price: p.price,
      priceCurrency: p.currency === "USD" ? "USD" : "COP",
      availability:
        p.operation === "VENTA"
          ? "https://schema.org/InStock"
          : "https://schema.org/InStock",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: p.cityName || undefined,
      addressRegion: p.stateName || undefined,
      addressCountry: "CO",
    },
    floorSize: {
      "@type": "QuantitativeValue",
      value: p.area,
      unitCode: "MTK",
    },
  };
  if (p.bedrooms != null) ld.numberOfRooms = p.bedrooms;
  if (p.bathrooms != null) ld.numberOfBathroomsTotal = p.bathrooms;
  if (p.latitude != null && p.longitude != null) {
    ld.geo = {
      "@type": "GeoCoordinates",
      latitude: p.latitude,
      longitude: p.longitude,
    };
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
    />
  );
}

/* ============================================================
   Main component
   ============================================================ */

export function PropertyDetailView() {
  const { propertyCode, goHome, openResults } = useNav();
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [similar, setSimilar] = useState<PropertyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fav, setFav] = useState(false);

  const contactRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!propertyCode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("no-code");
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    setProperty(null);
    fetch(`/api/properties/${encodeURIComponent(propertyCode)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("not-found");
        return r.json();
      })
      .then((data) => {
        if (!alive) return;
        setProperty(data.property as PropertyDetail);
        setSimilar((data.similar || []) as PropertyListItem[]);
        setLoading(false);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e?.message || "error");
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [propertyCode]);

  const scrollToContact = () => {
    contactRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const toggleFav = () => {
    setFav((v) => {
      const next = !v;
      if (next) {
        toast.success("Añadido a favoritos", { description: property?.code });
      } else {
        toast("Quitado de favoritos");
      }
      return next;
    });
  };

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      openResults({});
    }
  };

  if (loading) return <LoadingSkeleton />;
  if (error || !property) return <NotFound onHome={goHome} />;

  return (
    <>
      <JsonLd p={property} />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <Breadcrumbs p={property} />
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            className="hidden shrink-0 text-slate-600 hover:text-blue-600 sm:inline-flex"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a resultados
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={goBack}
          className="mt-2 text-slate-600 hover:text-blue-600 sm:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>

        <motion.div {...fadeUp}>
          <TitleBar
            p={property}
            fav={fav}
            onToggleFav={toggleFav}
            onShare={scrollToContact}
          />
        </motion.div>

        <motion.div {...fadeUp}>
          <Gallery images={property.images} title={property.title} />
        </motion.div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Left column */}
          <div className="space-y-6 lg:space-y-8">
            <motion.div {...fadeUp}>
              <PriceCard p={property} onContact={scrollToContact} />
            </motion.div>

            <motion.div {...fadeUp}>
              <KeyFeatures p={property} />
            </motion.div>

            <motion.div {...fadeUp}>
              <DescriptionBlock text={property.description} />
            </motion.div>

            <motion.div {...fadeUp}>
              <AdditionalFeatures p={property} />
            </motion.div>

            <motion.div {...fadeUp}>
              <AmenitiesGrid amenities={property.amenities} />
            </motion.div>

            <motion.div {...fadeUp}>
              <MapSection p={property} />
            </motion.div>

            <motion.div {...fadeUp}>
              <SimilarProperties items={similar} />
            </motion.div>
          </div>

          {/* Right column (sticky) */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <ContactCard p={property} innerRef={contactRef} />
            <ShareCard />
          </aside>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>
              Código verificado <span className="font-mono font-semibold text-slate-700">{property.code}</span>
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={goBack}>
            <ArrowLeft className="h-4 w-4" />
            Volver a resultados
          </Button>
        </div>
      </div>
    </>
  );
}
