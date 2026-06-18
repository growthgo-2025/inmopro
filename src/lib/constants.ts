/** Shared filter/option constants used across views */

export const OPERATIONS = [
  { value: "VENTA", label: "Comprar" },
  { value: "ARRIENDO", label: "Arrendar" },
  { value: "TEMPORAL", label: "Temporal" },
] as const;

export const PROPERTY_TYPES = [
  { value: "CASA", label: "Casa", icon: "🏠" },
  { value: "APARTAMENTO", label: "Apartamento", icon: "🏢" },
  { value: "APARTAESTUDIO", label: "Apartaestudio", icon: "🛏️" },
  { value: "OFICINA", label: "Oficina", icon: "💼" },
  { value: "LOCAL", label: "Local", icon: "🏪" },
  { value: "BODEGA", label: "Bodega", icon: "🏭" },
  { value: "LOTE", label: "Lote", icon: "📐" },
  { value: "FINCA", label: "Finca", icon: "🌳" },
  { value: "CAMPESTRE", label: "Casa Campestre", icon: "🏡" },
  { value: "PROYECTO", label: "Proyecto", icon: "🏗️" },
] as const;

export const PRICE_RANGES_COP = [
  { label: "Hasta $100 M", min: 0, max: 100_000_000 },
  { label: "$100 M - $300 M", min: 100_000_000, max: 300_000_000 },
  { label: "$300 M - $600 M", min: 300_000_000, max: 600_000_000 },
  { label: "$600 M - $1.000 M", min: 600_000_000, max: 1_000_000_000 },
  { label: "$1.000 M - $2.500 M", min: 1_000_000_000, max: 2_500_000_000 },
  { label: "Más de $2.500 M", min: 2_500_000_000, max: 999_999_999_999 },
];

export const RENT_RANGES_COP = [
  { label: "Hasta $1.5 M", min: 0, max: 1_500_000 },
  { label: "$1.5 M - $3 M", min: 1_500_000, max: 3_000_000 },
  { label: "$3 M - $5 M", min: 3_000_000, max: 5_000_000 },
  { label: "$5 M - $10 M", min: 5_000_000, max: 10_000_000 },
  { label: "Más de $10 M", min: 10_000_000, max: 999_999_999 },
];

export const AREA_RANGES = [
  { label: "Hasta 60 m²", min: 0, max: 60 },
  { label: "60 - 100 m²", min: 60, max: 100 },
  { label: "100 - 150 m²", min: 100, max: 150 },
  { label: "150 - 250 m²", min: 150, max: 250 },
  { label: "250 - 500 m²", min: 250, max: 500 },
  { label: "Más de 500 m²", min: 500, max: 999999 },
];

export const BEDROOM_OPTIONS = [1, 2, 3, 4, 5];
export const BATHROOM_OPTIONS = [1, 2, 3, 4];
export const PARKING_OPTIONS = [1, 2, 3, 4];
export const STRATUM_OPTIONS = [1, 2, 3, 4, 5, 6];

export const AMENITY_CATEGORIES = [
  { key: "general", label: "Generales" },
  { key: "security", label: "Seguridad" },
  { key: "services", label: "Servicios" },
];

export const CITIES_WITH_CODES = [
  { code: "MED", name: "Medellín" },
  { code: "BOG", name: "Bogotá" },
  { code: "BQ", name: "Barranquilla" },
  { code: "CALI", name: "Cali" },
  { code: "CTG", name: "Cartagena" },
  { code: "BGA", name: "Bucaramanga" },
  { code: "MZL", name: "Manizales" },
  { code: "PEI", name: "Pereira" },
  { code: "ARM", name: "Armenia" },
  { code: "STA", name: "Santa Marta" },
];
