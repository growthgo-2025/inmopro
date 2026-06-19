// =====================================================================
// POST /api/upload
// ---------------------------------------------------------------------
// Recibe una imagen (multipart/form-data), la procesa con sharp generando
// 4 variantes WebP (thumb/medium/large/original), las sube a Supabase
// Storage, y devuelve las URLs públicas.
//
// Body (multipart/form-data):
//   - file: File (imagen JPEG/PNG/WebP, max 10MB)
//   - propertyCode: string (opcional, ej "INV-2026-MED-000001")
//
// Response 200:
//   { url, variants: {thumb,medium,large,original}, width, height,
//     originalSize, compressedSize, path }
// =====================================================================

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getAdminClient, STORAGE_BUCKET, IMAGE_VARIANTS, generateImagePath } from "@/lib/storage";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs"; // sharp requiere nodejs runtime
export const maxDuration = 30; // 30s para procesar imágenes grandes

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const propertyCode = (formData.get("propertyCode") as string) || null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No se envió ningún archivo" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json(
        { error: `Tipo no permitido: ${file.type}. Solo JPEG/PNG/WebP/AVIF.` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Archivo muy grande: ${(file.size / 1024 / 1024).toFixed(1)}MB. Máx 10MB.` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const supabase = getAdminClient();

    // Procesar con sharp: generar 4 variantes WebP en PARALELO (antes eran
    // secuenciales, lo que hacía el upload sentirse lento/congelado).
    const metadata = await sharp(buffer).metadata();
    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;

    // Generar las 4 variantes en paralelo (CPU-bound, pero sharp es async)
    const processedVariants = await Promise.all(
      IMAGE_VARIANTS.map(async (variant) => {
        let pipeline = sharp(buffer, { failOn: "none" });
        if (variant.width) {
          pipeline = pipeline.resize({
            width: variant.width,
            withoutEnlargement: true,
            fit: "inside",
          });
        }
        const processed = await pipeline
          .webp({ quality: variant.quality, effort: 2 }) // effort 2 = más rápido
          .toBuffer();
        const path = generateImagePath(propertyCode, variant.name, "webp");
        return { variant: variant.name, path, buffer: processed, size: processed.length };
      })
    );

    // Subir las 4 variantes a Supabase en PARALELO (antes eran 4 uploads
    // secuenciales — cada uno con su propia latencia de red a US-East).
    const uploadResults = await Promise.all(
      processedVariants.map(async (pv) => {
        const { error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(pv.path, pv.buffer, {
            contentType: "image/webp",
            upsert: false,
            cacheControl: "31536000, immutable", // 1 año, inmutable
          });
        if (error) {
          throw new Error(`Error subiendo ${pv.variant}: ${error.message}`);
        }
        return { variant: pv.variant, path: pv.path, size: pv.size };
      })
    );

    // Construir URLs públicas
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const buildUrl = (path: string) =>
      `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;

    const variantsMap: Record<string, string> = {};
    let compressedSize = 0;
    for (const r of uploadResults) {
      variantsMap[r.variant] = buildUrl(r.path);
      if (r.variant === "large") compressedSize = r.size;
    }

    // "url" principal = large (1600px, buena para detalle y cards grandes)
    const mainUrl = variantsMap.large || variantsMap.medium;

    return NextResponse.json({
      url: mainUrl,
      variants: {
        thumb: variantsMap.thumb,
        medium: variantsMap.medium,
        large: variantsMap.large,
        original: variantsMap.original,
      },
      width: originalWidth,
      height: originalHeight,
      originalSize: buffer.length,
      compressedSize,
      path: uploadResults[0]?.path.split("/").slice(0, -2).join("/") || "",
      // Para borrar todas las variantes luego
      paths: uploadResults.map((r) => r.path),
    });
  } catch (err) {
    console.error("[/api/upload] Error:", err);
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Delete endpoint: /api/upload?paths=path1,path2,path3
export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { searchParams } = new URL(req.url);
    const pathsParam = searchParams.get("paths");
    if (!pathsParam) {
      return NextResponse.json(
        { error: "Falta parámetro 'paths'" },
        { status: 400 }
      );
    }
    const paths = pathsParam.split(",").filter(Boolean);
    if (paths.length === 0) {
      return NextResponse.json({ deleted: 0 });
    }

    const supabase = getAdminClient();
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove(paths);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ deleted: paths.length });
  } catch (err) {
    console.error("[/api/upload DELETE] Error:", err);
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
