"use client";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Search, MoreHorizontal, Eye, Pencil, Copy, Globe, Star, Trash2,
  Building2, ArrowRight, Filter, X,
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

export function AdminProperties() {
  const { openProperty, setView } = useNav();
  const [items, setItems] = useState<AdminProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [operation, setOperation] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [published, setPublished] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<AdminProperty | null>(null);
  const [deleting, setDeleting] = useState(false);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setQ(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (operation !== "all") params.set("operation", operation);
      if (status !== "all" && status !== "BORRADOR") params.set("status", status);
      if (published !== "all") params.set("published", published === "true" ? "true" : "false");
      const r = await fetch(`/api/admin/properties?${params.toString()}`);
      const d = await r.json();
      let list: AdminProperty[] = d.items || [];
      // client-side filter for BORRADOR since it's not a separate status server-side
      if (status === "BORRADOR") list = list.filter((p) => p.status === "BORRADOR" || !p.published);
      setItems(list);
    } catch {
      toast.error("No se pudo cargar el listado");
      setItems([]);
    } finally {
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

      {/* Result count */}
      <div className="flex items-center justify-between text-sm text-[#8B7E78]">
        <span className="flex items-center gap-1.5"><Filter className="size-3.5" />
          {loading ? "Cargando…" : `Mostrando ${items.length} de ${items.length} inmueble(s)`}
        </span>
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block py-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#FAF6F3]/80">
              <TableHead className="pl-4">Código</TableHead>
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
                <TableCell colSpan={9} className="py-3"><Skeleton className="h-7 w-full" /></TableCell>
              </TableRow>
            ))}
            {!loading && items.map((p) => (
              <TableRow
                key={p.id}
                className="cursor-pointer hover:bg-[#FAF6F3]"
                onClick={() => openProperty(p.code)}
              >
                <TableCell className="pl-4 font-mono text-xs text-[#B08968]">{p.code}</TableCell>
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
                      <DropdownMenuItem onClick={() => setView("upload")}>
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
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {!loading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-16">
                  <EmptyState hasFilters={!!hasFilters} onClear={clearFilters} onCreate={() => setView("upload")} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {loading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        {!loading && items.map((p) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card
              className="cursor-pointer gap-2 py-3 hover:bg-[#FAF6F3]"
              onClick={() => openProperty(p.code)}
            >
              <div className="flex items-start justify-between gap-2 px-4">
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
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          </motion.div>
        ))}
        {!loading && items.length === 0 && (
          <Card><EmptyState hasFilters={!!hasFilters} onClear={clearFilters} onCreate={() => setView("upload")} /></Card>
        )}
      </div>

      {/* Delete confirmation */}
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
