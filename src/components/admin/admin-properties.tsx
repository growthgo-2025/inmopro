"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Search, MoreHorizontal, Eye, Pencil, Copy, Globe, Star, Trash2,
  Building2, ArrowRight, Filter, X, CheckSquare, Square, CheckCheck, XCircle,
  RefreshCw,
} from "lucide-react";
import { useNav } from "@/lib/store";
import {
  formatPrice, formatPriceShort, formatRelativeTime,
  PROPERTY_TYPE_LABELS, OPERATION_LABELS, OPERATION_COLORS,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface AdminProperty {
  id: string; code: string; title: string; operation: string; propertyType: string;
  status: string; published: boolean; featured: boolean; price: number;
  currency: string; cityName?: string; neighborhoodName?: string;
  agentName?: string; createdAt: string; views: number;
}

const STATUS_BADGES: Record<string, string> = {
  DISPONIBLE: "bg-[#97A97C]/20 text-[#7A8B66] border-[#97A97C]/30",
  RESERVADO: "bg-[#E0B589]/20 text-[#B89164] border-[#E0B589]/30",
  VENDIDO: "bg-slate-200 text-[#5A4E4B] border-[#D8CFC9]",
  ARRENDADO: "bg-[#F5EBE0] text-[#9A7558] border-blue-200",
  BORRADOR: "bg-[#F0EAE5] text-[#8B7E78] border-[#E8DFD9]",
};
const STATUS_LABELS: Record<string, string> = {
  DISPONIBLE: "Disponible",
  RESERVADO: "Reservado",
  VENDIDO: "Vendido",
  ARRENDADO: "Arrendado",
  BORRADOR: "Borrador",
};

// ─── Robust fetching helpers ──────────────────────────────────────────────
// The CRM list is served from a remote Supabase PostgreSQL instance. Cold
// route compilation + network latency can occasionally make a request fail or
// feel slow. These helpers add a timeout, an automatic retry, and a short-lived
// in-memory cache so revisits to "Administrar inmuebles" are instant.
const ADMIN_LIST_CACHE_TTL = 60_000; // 60s
type CacheEntry = { ts: number; items: AdminProperty[] };
const adminListCache = new Map<string, CacheEntry>();

async function fetchAdminPropertiesRaw(
  qs: string,
  signal: AbortSignal,
): Promise<AdminProperty[]> {
  const r = await fetch(`/api/admin/properties?${qs}`, { signal });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  return (d.items || []) as AdminProperty[];
}

/** Fetch with a 20s timeout and one automatic retry on failure. */
async function fetchAdminPropertiesRobust(qs: string): Promise<AdminProperty[]> {
  // 1. Try the in-memory cache first (instant for revisits within 60s).
  const cached = adminListCache.get(qs);
  if (cached && Date.now() - cached.ts < ADMIN_LIST_CACHE_TTL) {
    return cached.items;
  }

  const doFetch = (timeoutMs: number) =>
    new Promise<AdminProperty[]>((resolve, reject) => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      fetchAdminPropertiesRaw(qs, ctrl.signal)
        .then((items) => {
          clearTimeout(t);
          resolve(items);
        })
        .catch((e) => {
          clearTimeout(t);
          reject(e);
        });
    });

  try {
    const items = await doFetch(20_000);
    adminListCache.set(qs, { ts: Date.now(), items });
    return items;
  } catch (firstErr) {
    // 2. One retry after a short pause — handles transient Supabase hiccups.
    await new Promise((r) => setTimeout(r, 800));
    try {
      const items = await doFetch(25_000);
      adminListCache.set(qs, { ts: Date.now(), items });
      return items;
    } catch {
      throw firstErr;
    }
  }
}
// ──────────────────────────────────────────────────────────────────────────

export function AdminProperties() {
  const { openProperty, setView, openEdit } = useNav();
  const [items, setItems] = useState<AdminProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [slowLoad, setSlowLoad] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [operation, setOperation] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [published, setPublished] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<AdminProperty | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk-select mode: when active, checkboxes appear next to each code.
  // Activated by clicking "Eliminar" in any row's 3-dot menu.
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  // ─── Sticky top horizontal scrollbar (mirror of the table's scroll) ───
  // The table's native scrollbar sits at the BOTTOM of the list, forcing the
  // admin to scroll all the way down to reach the "Publicado" / "Acciones"
  // columns. We render a thin mirror scrollbar at the top of the table that
  // is `sticky` so it stays visible while scrolling a long list. Its
  // scrollLeft is synced bidirectionally with the real table container.
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);

  // Keep the mirror spacer width in sync with the table's full scroll width.
  useLayoutEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    const measure = () => setTableScrollWidth(el.scrollWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // also observe the inner table for content changes (bulk column toggle)
    const table = el.querySelector("table");
    if (table) ro.observe(table);
    return () => ro.disconnect();
  }, [loading, bulkMode, items.length]);

  const syncTopToTable = useCallback(() => {
    const top = topScrollRef.current;
    const tbl = tableScrollRef.current;
    if (top && tbl && top.scrollLeft !== tbl.scrollLeft) {
      tbl.scrollLeft = top.scrollLeft;
    }
  }, []);
  const syncTableToTop = useCallback(() => {
    const top = topScrollRef.current;
    const tbl = tableScrollRef.current;
    if (top && tbl && top.scrollLeft !== tbl.scrollLeft) {
      top.scrollLeft = tbl.scrollLeft;
    }
  }, []);

  const toggleSelect = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };
  const toggleSelectAll = () => {
    setSelected((prev) => {
      if (prev.size === items.length) return new Set();
      return new Set(items.map((i) => i.code));
    });
  };
  const enterBulkMode = (p?: AdminProperty) => {
    setBulkMode(true);
    setSelected(p ? new Set([p.code]) : new Set());
  };
  const exitBulkMode = () => {
    setBulkMode(false);
    setSelected(new Set());
    setBulkConfirmOpen(false);
  };

  const confirmBulkDelete = async () => {
    if (selected.size === 0) return;
    setBulkDeleting(true);
    let ok = 0;
    let fail = 0;
    const codes = Array.from(selected);
    await Promise.all(
      codes.map(async (code) => {
        try {
          const r = await fetch(`/api/properties/${code}`, { method: "DELETE" });
          if (r.ok) ok++;
          else fail++;
        } catch {
          fail++;
        }
      })
    );
    adminListCache.clear(); // invalidate cache after bulk delete
    setItems((prev) => prev.filter((x) => !selected.has(x.code)));
    if (fail === 0) {
      toast.success(`${ok} inmueble${ok !== 1 ? "s" : ""} eliminado${ok !== 1 ? "s" : ""}`);
    } else {
      toast.warning(`${ok} eliminado${ok !== 1 ? "s" : ""}, ${fail} falló${fail !== 1 ? "s" : ""}`);
    }
    setBulkDeleting(false);
    exitBulkMode();
  };

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setQ(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setSlowLoad(false);
    // If the fetch takes more than 3s, surface a friendly "still loading"
    // hint so the user knows it hasn't silently failed.
    const slowTimer = setTimeout(() => setSlowLoad(true), 3000);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (operation !== "all") params.set("operation", operation);
      if (status !== "all" && status !== "BORRADOR") params.set("status", status);
      if (published !== "all") params.set("published", published === "true" ? "true" : "false");
      const qs = params.toString();
      let list = await fetchAdminPropertiesRobust(qs);
      // client-side filter for BORRADOR since it's not a separate status server-side
      if (status === "BORRADOR") list = list.filter((p) => p.status === "BORRADOR" || !p.published);
      setItems(list);
    } catch {
      toast.error("No se pudo cargar el listado", {
        description: "Revisa tu conexión e inténtalo de nuevo.",
      });
      setItems([]);
    } finally {
      clearTimeout(slowTimer);
      setSlowLoad(false);
      setLoading(false);
    }
  }, [q, operation, status, published]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const updateProperty = async (p: AdminProperty, patch: Partial<AdminProperty>) => {
    try {
      const body: any = {};
      if (patch.published !== undefined) body.published = patch.published;
      if (patch.featured !== undefined) body.featured = patch.featured;
      if (patch.status !== undefined) body.status = patch.status;
      const r = await fetch(`/api/properties/${p.code}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error();
      adminListCache.clear(); // invalidate cache after update
      setItems((prev) => prev.map((x) => (x.code === p.code ? { ...x, ...patch } : x)));
      toast.success("Inmueble actualizado");
    } catch {
      toast.error("No se pudo actualizar el inmueble");
    }
  };

  const duplicate = async (p: AdminProperty) => {
    try {
      toast.info(`Duplicando ${p.code}…`);
      const r = await fetch(`/api/properties/${p.code}`);
      if (!r.ok) throw new Error();
      const d = await r.json();
      const src = d.property;
      if (!src) throw new Error();
      const body: any = {
        title: `${src.title} (copia)`,
        shortDesc: src.shortDesc,
        description: src.description,
        operation: src.operation,
        propertyType: src.propertyType,
        status: "DISPONIBLE",
        published: false,
        featured: false,
        price: src.price,
        currency: src.currency,
        cityId: src.cityId,
        neighborhoodId: src.neighborhoodId,
        address: src.address,
        latitude: src.latitude,
        longitude: src.longitude,
        area: src.area,
        builtArea: src.builtArea,
        bedrooms: src.bedrooms,
        bathrooms: src.bathrooms,
        parking: src.parking,
        stratum: src.stratum,
        ageYears: src.ageYears,
        floor: src.floor,
        floorsTotal: src.floorsTotal,
        furnished: src.furnished,
        petFriendly: src.petFriendly,
        amenities: typeof src.amenities === "string" ? JSON.parse(src.amenities || "[]") : src.amenities || [],
        images: typeof src.images === "string" ? JSON.parse(src.images || "[]") : src.images || [],
        agentId: src.agentId,
        agencyId: src.agencyId,
      };
      const pr = await fetch("/api/properties", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!pr.ok) throw new Error();
      toast.success("Inmueble duplicado", { description: "Se creó como borrador" });
      adminListCache.clear(); // invalidate cache after duplicate
      fetchItems();
    } catch {
      toast.error("No se pudo duplicar el inmueble");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/properties/${deleteTarget.code}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      adminListCache.clear(); // invalidate cache after delete
      toast.success("Inmueble eliminado");
      setItems((prev) => prev.filter((x) => x.code !== deleteTarget.code));
      setDeleteTarget(null);
    } catch {
      toast.error("No se pudo eliminar el inmueble");
    } finally {
      setDeleting(false);
    }
  };

  const hasFilters = q || operation !== "all" || status !== "all" || published !== "all";
  const clearFilters = () => {
    setSearchInput(""); setOperation("all"); setStatus("all"); setPublished("all");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#3D3530]">Administrar inmuebles</h2>
          <p className="text-sm text-[#8B7E78]">Gestiona el inventario, publicación y estado de cada inmueble.</p>
        </div>
        <Button onClick={() => setView("upload")}>
          <Plus /> Publicar inmueble
        </Button>
      </div>

      {/* Filter bar */}
      <Card className="gap-3 py-3">
        <div className="flex flex-col gap-3 px-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#A89B96]" />
            <Input
              placeholder="Buscar por código o título…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 lg:flex lg:items-center">
            <Select value={operation} onValueChange={setOperation}>
              <SelectTrigger className="lg:w-[140px] w-full"><SelectValue placeholder="Operación" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="VENTA">Venta</SelectItem>
                <SelectItem value="ARRIENDO">Arriendo</SelectItem>
                <SelectItem value="TEMPORAL">Temporal</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="lg:w-[150px] w-full"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="DISPONIBLE">Disponible</SelectItem>
                <SelectItem value="RESERVADO">Reservado</SelectItem>
                <SelectItem value="VENDIDO">Vendido</SelectItem>
                <SelectItem value="ARRENDADO">Arrendado</SelectItem>
                <SelectItem value="BORRADOR">Borrador</SelectItem>
              </SelectContent>
            </Select>
            <Select value={published} onValueChange={setPublished}>
              <SelectTrigger className="lg:w-[160px] w-full"><SelectValue placeholder="Publicación" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Publicados</SelectItem>
                <SelectItem value="false">No publicados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
              <X className="size-4" /> Limpiar
            </Button>
          )}
        </div>
      </Card>

      {/* Result count + bulk action bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[#8B7E78]">
        <span className="flex items-center gap-1.5"><Filter className="size-3.5" />
          {loading
            ? slowLoad
              ? "Cargando desde la base de datos…"
              : "Cargando…"
            : `Mostrando ${items.length} de ${items.length} inmueble(s)`}
          {!loading && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs text-[#8B7E78]"
              onClick={() => { adminListCache.clear(); fetchItems(); }}
              title="Recargar lista desde la base de datos"
            >
              <RefreshCw className="size-3" /> Recargar
            </Button>
          )}
        </span>
        {bulkMode && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center gap-2"
          >
            <span className="rounded-md bg-[#F0EAE5] px-2.5 py-1 text-xs font-semibold text-[#5A4E4B]">
              {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={toggleSelectAll}
              disabled={items.length === 0}
              className="h-8 gap-1.5"
            >
              {selected.size === items.length && items.length > 0 ? (
                <><Square className="size-3.5" /> Ninguno</>
              ) : (
                <><CheckSquare className="size-3.5" /> Todos</>
              )}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setBulkConfirmOpen(true)}
              disabled={selected.size === 0 || bulkDeleting}
              className="h-8 gap-1.5"
            >
              <Trash2 className="size-3.5" />
              {bulkDeleting ? "Eliminando…" : `Eliminar ${selected.size > 0 ? `(${selected.size})` : ""}`}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={exitBulkMode}
              disabled={bulkDeleting}
              className="h-8 gap-1.5 text-[#8B7E78]"
            >
              <XCircle className="size-3.5" /> Cancelar
            </Button>
          </motion.div>
        )}
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block py-0">
        {/* Sticky top mirror scrollbar — always visible so the admin can
            reach the "Publicado" / "Acciones" columns without scrolling to
            the bottom of a long list. Synced bidirectionally with the real
            table scroll container below. */}
        {tableScrollWidth > 0 && (
          <div
            ref={topScrollRef}
            onScroll={syncTopToTable}
            className="inmopro-top-scroll sticky top-16 z-20 overflow-x-auto overflow-y-hidden border-b border-[#E8DFD9] bg-[#FAF6F3]/95 backdrop-blur"
            aria-hidden="true"
          >
            <div style={{ width: tableScrollWidth, height: 1 }} />
          </div>
        )}
        {/* overflow-x-auto with sticky top scrollbar so it's reachable without scrolling to bottom */}
        <div
          ref={tableScrollRef}
          onScroll={syncTableToTop}
          className="inmopro-table-scroll overflow-x-auto"
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-[#FAF6F3]/80">
                {bulkMode && (
                  <TableHead className="w-10 pl-3">
                    <Checkbox
                      checked={items.length > 0 && selected.size === items.length}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Seleccionar todos"
                    />
                  </TableHead>
                )}
                <TableHead className={bulkMode ? "pl-1" : "pl-4"}>Código</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Operación</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Publicado</TableHead>
                <TableHead className="pr-4 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={bulkMode ? 10 : 9} className="py-3"><Skeleton className="h-7 w-full" /></TableCell>
              </TableRow>
            ))}
            {!loading && items.map((p) => {
              const isSel = selected.has(p.code);
              return (
              <TableRow
                key={p.id}
                className={cn(
                  "hover:bg-[#FAF6F3]",
                  bulkMode ? "cursor-default" : "cursor-pointer",
                  isSel && "bg-[#F5EBE0]/60"
                )}
                onClick={() => bulkMode ? toggleSelect(p.code) : openProperty(p.code)}
              >
                {bulkMode && (
                  <TableCell className="w-10 pl-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSel}
                      onCheckedChange={() => toggleSelect(p.code)}
                      aria-label={`Seleccionar ${p.code}`}
                    />
                  </TableCell>
                )}
                <TableCell className={cn("font-mono text-xs text-[#B08968]", bulkMode ? "pl-1" : "pl-4")}>
                  <div className="flex items-center gap-2">
                    {isSel && <CheckCheck className="size-3.5 shrink-0 text-[#B08968]" />}
                    {p.code}
                  </div>
                </TableCell>
                <TableCell className="max-w-[260px]">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-medium text-[#4A3D38]">{p.title}</span>
                    {p.featured && <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                  </div>
                  {p.neighborhoodName && <div className="truncate text-xs text-[#A89B96]">{p.neighborhoodName}</div>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn(OPERATION_COLORS[p.operation])}>
                    {OPERATION_LABELS[p.operation] || p.operation}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-[#6B5D5A]">{PROPERTY_TYPE_LABELS[p.propertyType] || p.propertyType}</TableCell>
                <TableCell className="whitespace-nowrap font-medium">{formatPriceShort(p.price, p.currency)}</TableCell>
                <TableCell className="text-sm text-[#6B5D5A]">{p.cityName || "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn(STATUS_BADGES[p.status] || "bg-[#F0EAE5] text-[#6B5D5A] border-[#E8DFD9]")}>
                    {STATUS_LABELS[p.status] || p.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className={cn("inline-block size-2.5 rounded-full", p.published ? "bg-emerald-500" : "bg-slate-300")} title={p.published ? "Publicado" : "No publicado"} />
                </TableCell>
                <TableCell className="pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel className="text-xs text-[#A89B96]">Acciones</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => openProperty(p.code)}>
                        <Eye className="size-4" /> Ver detalle
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(p.code)}>
                        <Pencil className="size-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicate(p)}>
                        <Copy className="size-4" /> Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => updateProperty(p, { published: !p.published })}>
                        <Globe className="size-4" /> {p.published ? "Despublicar" : "Publicar"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateProperty(p, { featured: !p.featured })}>
                        <Star className="size-4" /> {p.featured ? "Quitar destacado" : "Destacar"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-[#C97A7A] focus:text-[#C97A7A]"
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 className="size-4" /> Eliminar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => enterBulkMode(p)}>
                        <CheckSquare className="size-4" /> Selección múltiple
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
              );
            })}
            {!loading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={bulkMode ? 10 : 9} className="py-16">
                  <EmptyState hasFilters={!!hasFilters} onClear={clearFilters} onCreate={() => setView("upload")} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </Card>
      {/* Hint text when in bulk mode */}
      {bulkMode && (
        <p className="text-center text-xs text-[#A89B96]">
          Selecciona los inmuebles a eliminar con las casillas y usa el botón rojo de arriba, o cancela para volver a la vista normal.
        </p>
      )}

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {loading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        {!loading && items.map((p) => {
          const isSel = selected.has(p.code);
          return (
          <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card
              className={cn(
                "gap-2 py-3 hover:bg-[#FAF6F3]",
                bulkMode ? "cursor-default" : "cursor-pointer",
                isSel && "bg-[#F5EBE0]/60 ring-2 ring-[#B08968]"
              )}
              onClick={() => bulkMode ? toggleSelect(p.code) : openProperty(p.code)}
            >
              <div className="flex items-start justify-between gap-2 px-4">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  {bulkMode && (
                    <Checkbox
                      checked={isSel}
                      onCheckedChange={() => toggleSelect(p.code)}
                      aria-label={`Seleccionar ${p.code}`}
                      className="mt-0.5"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-[#B08968]">{p.code}</span>
                      {p.featured && <Star className="size-3 fill-amber-400 text-amber-400" />}
                    </div>
                    <div className="mt-0.5 truncate font-medium text-[#4A3D38]">{p.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className={cn(OPERATION_COLORS[p.operation])}>
                        {OPERATION_LABELS[p.operation] || p.operation}
                      </Badge>
                      <Badge variant="outline" className={cn(STATUS_BADGES[p.status] || "bg-[#F0EAE5] text-[#6B5D5A] border-[#E8DFD9]")}>
                        {STATUS_LABELS[p.status] || p.status}
                      </Badge>
                      <span className={cn("inline-block size-2 rounded-full", p.published ? "bg-emerald-500" : "bg-slate-300")} />
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-[#3D3530]">{formatPriceShort(p.price, p.currency)}</div>
                  <div className="text-xs text-[#A89B96]">{p.cityName || "—"}</div>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 pt-1 text-xs text-[#A89B96]" onClick={(e) => e.stopPropagation()}>
                <span>{formatRelativeTime(p.createdAt)} · {p.views} vistas</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7"><MoreHorizontal className="size-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => openProperty(p.code)}><Eye className="size-4" /> Ver detalle</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEdit(p.code)}><Pencil className="size-4" /> Editar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicate(p)}><Copy className="size-4" /> Duplicar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateProperty(p, { published: !p.published })}>
                      <Globe className="size-4" /> {p.published ? "Despublicar" : "Publicar"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateProperty(p, { featured: !p.featured })}>
                      <Star className="size-4" /> {p.featured ? "Quitar destacado" : "Destacar"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-[#C97A7A] focus:text-[#C97A7A]" onClick={() => setDeleteTarget(p)}>
                      <Trash2 className="size-4" /> Eliminar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => enterBulkMode(p)}>
                      <CheckSquare className="size-4" /> Selección múltiple
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          </motion.div>
          );
        })}
        {!loading && items.length === 0 && (
          <Card><EmptyState hasFilters={!!hasFilters} onClear={clearFilters} onCreate={() => setView("upload")} /></Card>
        )}
      </div>

      {/* Delete confirmation (single) */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar inmueble?</DialogTitle>
            <DialogDescription>
              Estás a punto de eliminar <span className="font-mono text-[#5A4E4B]">{deleteTarget?.code}</span> — {deleteTarget?.title}.
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete confirmation */}
      <Dialog open={bulkConfirmOpen} onOpenChange={(o) => !o && !bulkDeleting && setBulkConfirmOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar {selected.size} inmueble{selected.size !== 1 ? "s" : ""}?</DialogTitle>
            <DialogDescription>
              Se eliminarán los siguientes inmuebles de forma permanente:
              <div className="mt-2 max-h-40 overflow-y-auto rounded-md bg-[#FAF6F3] p-2 font-mono text-xs text-[#5A4E4B]">
                {Array.from(selected).map((c) => (
                  <div key={c}>• {c}</div>
                ))}
              </div>
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkConfirmOpen(false)} disabled={bulkDeleting}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting ? "Eliminando…" : `Eliminar ${selected.size}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ hasFilters, onClear, onCreate }: { hasFilters: boolean; onClear: () => void; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-[#F0EAE5]">
        <Building2 className="size-7 text-[#A89B96]" />
      </div>
      <div>
        <div className="font-semibold text-[#5A4E4B]">No hay inmuebles</div>
        <div className="text-sm text-[#8B7E78]">
          {hasFilters ? "Prueba con otros filtros de búsqueda." : "Empieza publicando tu primer inmueble."}
        </div>
      </div>
      <div className="flex gap-2">
        {hasFilters && <Button variant="outline" size="sm" onClick={onClear}>Limpiar filtros</Button>}
        <Button size="sm" onClick={onCreate}>
          <Plus /> Publicar inmueble <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
