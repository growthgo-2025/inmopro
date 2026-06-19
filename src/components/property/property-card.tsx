"use client";
import Image from "next/image";
import {
  BedDouble, Bath, Car, Maximize, MapPin, Heart, Eye, BadgeCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PropertyCodeBadge } from "./property-code-badge";
import { AmenityIcon } from "./amenity-icon";
import {
  formatPrice, formatArea, PROPERTY_TYPE_LABELS, OPERATION_LABELS, OPERATION_COLORS,
} from "@/lib/format";
import { useNav } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { PropertyListItem } from "@/lib/queries";

export function PropertyCard({
  property,
  index = 0,
  compact = false,
}: {
  property: PropertyListItem;
  index?: number;
  compact?: boolean;
}) {
  const { openProperty } = useNav();
  const p = property;

  const opColor = OPERATION_COLORS[p.operation] || "bg-[#F0EAE5] text-[#5A4E4B]";

  const topAmenities = p.amenities.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
      className="h-full"
    >
      <Card
        onClick={() => openProperty(p.code)}
        className="card-lift group relative h-full cursor-pointer overflow-hidden border-[#E8DFD9] p-0"
      >
        {/* Image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F0EAE5]">
          {p.mainImage ? (
            <img
              src={p.mainImage}
              alt={p.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-[#A89B96]">
              <Maximize className="h-10 w-10" />
            </div>
          )}

          {/* Top-left badges */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide", opColor)}>
              {OPERATION_LABELS[p.operation]}
            </span>
            {p.featured && (
              <span className="flex items-center gap-1 rounded-md border border-amber-300 bg-amber-400/95 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-950 shadow-sm">
                <BadgeCheck className="h-3 w-3" /> Destacado
              </span>
            )}
          </div>

          {/* Top-right code */}
          <div className="absolute right-3 top-3">
            <PropertyCodeBadge code={p.code} variant="light" />
          </div>

          {/* Quick stats overlay */}
          <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-lg bg-[#3D3530]/80 px-3 py-1.5 text-white backdrop-blur-sm">
            <span className="flex items-center gap-1 text-xs font-medium">
              <BedDouble className="h-3.5 w-3.5" /> {p.bedrooms ?? "—"}
            </span>
            <span className="flex items-center gap-1 text-xs font-medium">
              <Bath className="h-3.5 w-3.5" /> {p.bathrooms ?? "—"}
            </span>
            <span className="flex items-center gap-1 text-xs font-medium">
              <Maximize className="h-3.5 w-3.5" /> {formatArea(p.area)}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-3 p-4">
          {/* Price + type */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xl font-bold tracking-tight text-[#3D3530]">
                {formatPrice(p.price, p.currency)}
              </div>
              <div className="text-xs font-medium text-[#8B7E78]">
                {PROPERTY_TYPE_LABELS[p.propertyType] || p.propertyType}
                {p.stratum ? ` · Estrato ${p.stratum}` : ""}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-[#A89B96] hover:text-rose-500"
              onClick={(e) => {
                e.stopPropagation();
                // favorite toggle (client-only demo)
                toastFavorite(p.code);
              }}
            >
              <Heart className="h-4 w-4" />
            </Button>
          </div>

          {/* Title */}
          <h3 className="clamp-2 text-[15px] font-semibold leading-snug text-[#3D3530] group-hover:text-[#9A7558]">
            {p.title}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-1 text-xs text-[#8B7E78]">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {[p.neighborhoodName, p.cityName].filter(Boolean).join(", ")}
            </span>
          </div>

          {/* Amenities preview */}
          {!compact && topAmenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {topAmenities.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1 rounded-full bg-[#FAF3EC] px-2 py-0.5 text-[11px] font-medium text-[#9A7558]"
                >
                  <AmenityIcon slug={a} className="h-3 w-3" />
                  {a}
                </span>
              ))}
              {p.amenities.length > 3 && (
                <span className="rounded-full bg-[#F0EAE5] px-2 py-0.5 text-[11px] font-medium text-[#8B7E78]">
                  +{p.amenities.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[#F0EAE5] pt-3">
            <span className="flex items-center gap-1 text-[11px] text-[#A89B96]">
              <Eye className="h-3 w-3" /> Ver detalle
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#B08968] group-hover:underline">
              Ver inmueble →
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// tiny toast helper without importing sonner at top (kept separate to avoid cycles)
import { toast } from "sonner";
function toastFavorite(code: string) {
  toast("Añadido a favoritos", { description: `Inmueble ${code}` });
}
