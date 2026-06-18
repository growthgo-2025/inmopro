/** Formatting helpers for Colombian locale */

export function formatPrice(price: number, currency: string = "COP"): string {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  }
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatPriceShort(price: number, currency: string = "COP"): string {
  if (currency === "USD") {
    if (price >= 1_000_000) return `US$ ${(price / 1_000_000).toFixed(2)}M`;
    if (price >= 1_000) return `US$ ${(price / 1_000).toFixed(0)}K`;
    return `US$ ${price}`;
  }
  if (price >= 1_000_000_000) return `$${(price / 1_000_000_000).toFixed(2)} MM`;
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(0)} M`;
  if (price >= 1_000) return `$${(price / 1_000).toFixed(0)}K`;
  return `$${price}`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-CO").format(n);
}

export function formatArea(m2: number): string {
  return `${formatNumber(m2)} m²`;
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatRelativeTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 60) return `hace ${minutes} min`;
  if (hours < 24) return `hace ${hours} h`;
  if (days < 7) return `hace ${days} días`;
  if (days < 30) return `hace ${Math.floor(days / 7)} sem`;
  return formatDate(date);
}

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  CASA: "Casa",
  APARTAMENTO: "Apartamento",
  APARTAESTUDIO: "Apartaestudio",
  OFICINA: "Oficina",
  LOCAL: "Local",
  BODEGA: "Bodega",
  LOTE: "Lote",
  FINCA: "Finca",
  CAMPESTRE: "Casa Campestre",
  PROYECTO: "Proyecto",
};

export const OPERATION_LABELS: Record<string, string> = {
  VENTA: "Venta",
  ARRIENDO: "Arriendo",
  TEMPORAL: "Arriendo temporal",
};

export const OPERATION_COLORS: Record<string, string> = {
  VENTA: "bg-emerald-100 text-emerald-700 border-emerald-200",
  ARRIENDO: "bg-blue-100 text-blue-700 border-blue-200",
  TEMPORAL: "bg-amber-100 text-amber-700 border-amber-200",
};

export const LEAD_STATUS_LABELS: Record<string, string> = {
  NUEVO: "Nuevo",
  CONTACTADO: "Contactado",
  INTERESADO: "Interesado",
  VISITA: "Visita programada",
  NEGOCIACION: "Negociación",
  CERRADO: "Cerrado",
};

export const LEAD_STATUS_COLORS: Record<string, string> = {
  NUEVO: "bg-blue-100 text-blue-700 border-blue-200",
  CONTACTADO: "bg-violet-100 text-violet-700 border-violet-200",
  INTERESADO: "bg-amber-100 text-amber-700 border-amber-200",
  VISITA: "bg-cyan-100 text-cyan-700 border-cyan-200",
  NEGOCIACION: "bg-orange-100 text-orange-700 border-orange-200",
  CERRADO: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export const SORT_OPTIONS = [
  { value: "recientes", label: "Más recientes" },
  { value: "precio-asc", label: "Menor precio" },
  { value: "precio-desc", label: "Mayor precio" },
  { value: "area-desc", label: "Mayor área" },
  { value: "relevancia", label: "Relevancia" },
];
