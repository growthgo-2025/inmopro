// =====================================================================
// InmoPro - Supabase Storage Library
// =====================================================================
// Maneja subida de imágenes con compresión WebP (4 tamaños) a Supabase.
// Implementa los trucos #1 (compresión sharp) y #2 (variantes) del doc
// de escalabilidad: reduce ~96% el tamaño vs JPEG crudo.
// =====================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------
// Clientes Supabase
// ---------------------------------------------------------------------

/**
 * Cliente admin (server-side only). Usa service_role key, bypassa RLS.
 * NUNCA importar este en código cliente.
 */
let _adminClient: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (_adminClient) return _adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en env"
    );
  }
  _adminClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _adminClient;
}

/**
 * Cliente público (safe para browser). Usa anon key, respeta RLS.
 */
let _publicClient: SupabaseClient | null = null;

export function getPublicClient(): SupabaseClient {
  if (_publicClient) return _publicClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en env"
    );
  }
  _publicClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _publicClient;
}

// ---------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------

export const STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET || "inmopro-properties";

/**
 * 4 variantes de cada imagen:
 * - thumb: 400px (grids, cards pequeños)
 * - medium: 800px (cards estándar)
 * - large: 1600px (galería detail)
 * - original: sin resize, calidad 90 (zoom)
 */
export const IMAGE_VARIANTS = [
  { name: "thumb", width: 400, quality: 70 },
  { name: "medium", width: 800, quality: 75 },
  { name: "large", width: 1600, quality: 80 },
  { name: "original", width: null, quality: 90 },
] as const;

export type ImageVariantName = (typeof IMAGE_VARIANTS)[number]["name"];

export interface ProcessedImage {
  variant: ImageVariantName;
  buffer: Buffer;
  contentType: string;
  size: number;
}

export interface UploadedImage {
  /** URL pública de la variante "large" (uso principal) */
  url: string;
  /** URLs de todas las variantes para srcset */
  variants: {
    thumb: string;
    medium: string;
    large: string;
    original: string;
  };
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  path: string;
}

// ---------------------------------------------------------------------
// Helpers de URL pública
// ---------------------------------------------------------------------

export function getPublicUrl(bucket: string, path: string): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${url}/storage/v1/object/public/${bucket}/${path}`;
}

// ---------------------------------------------------------------------
// Detección de imágenes "legacy" (Unsplash del seed) vs Supabase Storage
// ---------------------------------------------------------------------

export function isSupabaseImage(url: string): boolean {
  return url.includes("supabase.co/storage/v1/object/public/");
}

export function isUnsplashImage(url: string): boolean {
  return url.includes("images.unsplash.com");
}

/**
 * Para una URL de imagen (sea Unsplash o Supabase), devuelve la mejor
 * variante para un tamaño dado. Para Unsplash usa los query params nativos,
 * para Supabase construye la URL de la variante correspondiente.
 */
export function getImageVariantUrl(
  url: string,
  variant: ImageVariantName = "medium"
): string {
  // Unsplash: usar query params nativos
  if (isUnsplashImage(url)) {
    const widths: Record<ImageVariantName, number> = {
      thumb: 400,
      medium: 800,
      large: 1600,
      original: 1600,
    };
    const w = widths[variant];
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}w=${w}&q=80&auto=format&fit=crop`;
  }
  // Supabase: reemplazar /{variant}/ en el path
  if (isSupabaseImage(url)) {
    return url.replace(
      /(\/(thumb|medium|large|original)\/)/,
      `/${variant}/`
    );
  }
  return url;
}

// ---------------------------------------------------------------------
// Helper para generar paths únicos
// ---------------------------------------------------------------------

/**
 * Genera un path tipo: properties/{propertyCode}/{timestamp}-{random}.webp
 * Si no hay propertyCode, usa "drafts".
 */
export function generateImagePath(
  propertyCode: string | null,
  variant: ImageVariantName,
  ext: "webp" | "avif" = "webp"
): string {
  const folder = propertyCode || "drafts";
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `properties/${folder}/${variant}/${ts}-${rand}.${ext}`;
}
