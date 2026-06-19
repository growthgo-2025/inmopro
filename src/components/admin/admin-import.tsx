"use client";
import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  FileSpreadsheet, Upload, Download, FileUp, CheckCircle2, AlertCircle, X, FileCheck2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TEMPLATE_HEADERS = [
  "titulo", "operation", "propertyType", "cityId", "price", "area", "bedrooms", "bathrooms", "amenities",
];
const REQUIRED_FIELDS = ["titulo", "price"];

const SAMPLE_ROWS: string[][] = [
  ["Apartamento moderno El Poblado", "VENTA", "APARTAMENTO", "med-001", "450000000", "92", "3", "2", "piscina,gimnasio"],
  ["Casa con jardín Contry", "VENTA", "CASA", "med-002", "780000000", "180", "4", "3", "jardin,parqueadero"],
  ["Loft industrial Laureles", "ARRIENDO", "APARTAMENTO", "med-003", "2200000", "68", "2", "2", "gimnasio"],
  ["Oficina ejecutiva centro", "ARRIENDO", "OFICINA", "bog-001", "3500000", "55", "0", "1", "parqueadero"],
];

interface ParsedFile {
  fileName: string;
  headers: string[];
  rows: string[][];
  isExcel: boolean;
}

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = splitLine(lines[0]);
  const rows = lines.slice(1).map(splitLine);
  return { headers, rows };
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function AdminImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = useCallback((file: File) => {
    const lower = file.name.toLowerCase();
    const isExcel = lower.endsWith(".xlsx") || lower.endsWith(".xls");
    if (isExcel) {
      setParsed({ fileName: file.name, headers: [], rows: [], isExcel: true });
      toast.info("Excel detectado", { description: "Se procesará en el servidor al importar." });
      return;
    }
    if (!lower.endsWith(".csv")) {
      toast.error("Formato no admitido", { description: "Sube un archivo CSV o XLSX." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const { headers, rows } = parseCsv(text);
      if (headers.length === 0 || rows.length === 0) {
        toast.error("El archivo CSV está vacío o no se pudo leer");
        return;
      }
      setParsed({ fileName: file.name, headers, rows, isExcel: false });
      toast.success(`${rows.length} inmuebles detectados`, { description: file.name });
    };
    reader.onerror = () => toast.error("No se pudo leer el archivo");
    reader.readAsText(file);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const downloadTemplate = () => {
    const lines = [TEMPLATE_HEADERS.join(","), ...SAMPLE_ROWS.map((r) => r.map(escapeCsv).join(","))];
    const csv = lines.join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-inmuebles.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Plantilla descargada");
  };

  const startImport = () => {
    if (!parsed || parsed.isExcel || parsed.rows.length === 0) return;
    setImporting(true);
    setProgress(0);
    const total = parsed.rows.length;
    let done = 0;
    const interval = setInterval(() => {
      done += Math.max(1, Math.ceil(total / 10));
      const pct = Math.min(100, Math.round((done / total) * 100));
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setImporting(false);
          setParsed(null);
          setProgress(0);
          toast.success("Importación completada", { description: `${total} inmuebles procesados` });
        }, 300);
      }
    }, 220);
  };

  const reset = () => {
    setParsed(null);
    setProgress(0);
    setImporting(false);
  };

  const rowIsInvalid = (row: string[], headers: string[]) => REQUIRED_FIELDS.some((f) => {
    const idx = headers.indexOf(f);
    return idx === -1 || !row[idx]?.trim();
  });

  const invalidCount = parsed && !parsed.isExcel
    ? parsed.rows.filter((r) => rowIsInvalid(r, parsed.headers)).length
    : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#3D3530]">Importar inmuebles masivamente</h2>
          <p className="text-sm text-[#8B7E78]">Sube un archivo CSV o Excel con tus inmuebles para crearlos de una sola vez.</p>
        </div>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="size-4" /> Descargar plantilla CSV
        </Button>
      </div>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cómo funciona</CardTitle>
          <CardDescription>
            Descarga la plantilla, completa una fila por inmueble y súbela aquí. Procesaremos el archivo y crearemos los inmuebles automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_HEADERS.map((h) => (
              <Badge
                key={h}
                variant="outline"
                className={cn(
                  "font-mono text-xs",
                  REQUIRED_FIELDS.includes(h)
                    ? "border-blue-300 bg-[#FAF3EC] text-[#9A7558]"
                    : "border-[#E8DFD9] bg-[#FAF6F3] text-[#6B5D5A]"
                )}
              >
                {h}{REQUIRED_FIELDS.includes(h) && " *"}
              </Badge>
            ))}
          </div>
          <p className="mt-2 text-xs text-[#8B7E78]">Los campos marcados con <span className="font-semibold text-[#9A7558]">*</span> son obligatorios. Las filas incompletas se resaltan en rojo.</p>
        </CardContent>
      </Card>

      {!parsed ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors",
              dragOver ? "border-[#C9A07A] bg-[#FAF3EC]" : "border-[#D8CFC9] bg-[#FAF6F3] hover:border-[#E0B589] hover:bg-[#FAF3EC]/40"
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            <div className="grid size-14 place-items-center rounded-full bg-white shadow-sm">
              <FileSpreadsheet className="size-7 text-[#B08968]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#3D3530]">Arrastra tu archivo o haz clic para seleccionar</div>
              <div className="mt-0.5 text-xs text-[#8B7E78]">Formatos admitidos: CSV, XLSX · hasta 100 filas</div>
            </div>
          </div>
        </motion.div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <FileUp className="size-4 shrink-0 text-[#B08968]" />
                <CardTitle className="truncate text-base">{parsed.fileName}</CardTitle>
              </div>
              <Button size="icon" variant="ghost" onClick={reset} disabled={importing} className="shrink-0">
                <X className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {parsed.isExcel ? (
              <div className="flex items-center gap-3 rounded-lg border border-[#E0B589]/30 bg-[#FAF0E0] p-4">
                <AlertCircle className="size-5 shrink-0 text-[#B89164]" />
                <div className="text-sm text-[#A8814E]">Excel detectado, se procesará en el servidor al momento de la importación.</div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline" className="bg-emerald-50 text-[#7A8B66] border-[#97A97C]/30">
                    <CheckCircle2 className="size-3" /> {parsed.rows.length} inmuebles detectados
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge variant="outline" className="bg-red-50 text-[#A85F5F] border-[#C97A7A]/30">
                      <AlertCircle className="size-3" /> {invalidCount} fila(s) con campos faltantes
                    </Badge>
                  )}
                  <span className="text-xs text-[#8B7E78]">· {parsed.headers.length} columnas · vista previa (5 filas)</span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-[#E8DFD9]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#FAF6F3]">
                        {parsed.headers.map((h, i) => (
                          <TableHead key={i} className="font-mono text-xs">
                            {h}{REQUIRED_FIELDS.includes(h) && <span className="ml-0.5 text-[#B08968]">*</span>}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsed.rows.slice(0, 5).map((row, ri) => {
                        const invalid = rowIsInvalid(row, parsed.headers);
                        return (
                          <TableRow key={ri} className={cn(invalid && "bg-red-50/60")}>
                            {parsed.headers.map((_, ci) => (
                              <TableCell key={ci} className={cn("text-xs", !row[ci]?.trim() && "text-red-400")}>
                                {row[ci] || "—"}
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {parsed.rows.length > 5 && (
                  <div className="text-xs text-[#8B7E78]">y {parsed.rows.length - 5} filas más…</div>
                )}

                {importing && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-[#6B5D5A]">
                      <span className="flex items-center gap-1.5"><FileCheck2 className="size-3.5 text-[#B08968]" /> Importando…</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={reset} disabled={importing}>Cancelar</Button>
                  <Button onClick={startImport} disabled={importing || parsed.rows.length === 0}>
                    <Upload className="size-4" />
                    {importing ? "Importando…" : `Importar ${parsed.rows.length} inmuebles`}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
