"use client";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FileEdit, Pencil, Trash2, Plus, RefreshCw, Building2, ArrowRight, X,
} from "lucide-react";
import { useNav } from "@/lib/store";
import {
  formatPriceShort, formatRelativeTime,
  PROPERTY_TYPE_LABELS, OPERATION_LABELS, OPERATION_COLORS,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface DraftItem {
  id: string;
  code: string;
  title: string;
  operation: string;
  propertyType: string;
  status: string;
  price: number;
  currency: string;
  cityName?: string;
  neighborhoodName?: string;
  createdAt: string;
  updatedAt?: string;
}

export function AdminDrafts() {
  const { openEdit, setView } = useNav();
  const [items, setItems] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<DraftItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      // Pedimos solo los no publicados (borradores) — el endpoint admin ya
      // soporta el filtro published=false.
      const r = await fetch(`/api/admin/properties?published=false`);
      const d = await r.json();
      const list: DraftItem[] = (d.items || []).filter(
        (p: DraftItem) => !p.published || p.status === "BORRADOR"
      );
      setItems(list);
    } catch {
      toast.error("No se pudieron cargar los borradores");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/properties/${deleteTarget.code}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      toast.success("Borrador eliminado");
      setItems((prev) => prev.filter((x) => x.code !== deleteTarget.code));
      setDeleteTarget(null);
    } catch {
      toast.error("No se pudo eliminar el borrador");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#3D3530]">Borradores</h2>
          <p className="text-sm text-[#8B7E78]">
            Inmuebles guardados como borrador. Continúa la publicación o elimina los que ya no necesites.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchItems} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} /> Recargar
          </Button>
          <Button onClick={() => setView("upload")}>
            <Plus /> Publicar inmueble
          </Button>
        </div>
      </div>

      {/* Count */}
      <div className="text-sm text-[#8B7E78]">
        {loading ? "Cargando…" : `${items.length} borrador${items.length !== 1 ? "es" : ""}`}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="py-12">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="grid size-14 place-items-center rounded-full bg-[#F0EAE5]">
              <FileEdit className="size-7 text-[#A89B96]" />
            </div>
            <div>
              <div className="font-semibold text-[#5A4E4B]">No hay borradores</div>
              <div className="text-sm text-[#8B7E78]">
                Cuando guardes un inmueble como borrador durante la publicación, aparecerá aquí para que puedas terminarlo después.
              </div>
            </div>
            <Button size="sm" onClick={() => setView("upload")}>
              <Plus /> Publicar inmueble <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className="gap-2 py-3 hover:bg-[#FAF6F3]">
                <div className="flex items-start justify-between gap-3 px-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#F0EAE5] text-[#8B7E78]">
                      <Building2 className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs text-[#B08968]">{p.code}</span>
                        <Badge variant="outline" className={cn("bg-[#F0EAE5] text-[#8B7E78] border-[#E8DFD9]")}>
                          Borrador
                        </Badge>
                        {p.operation && (
                          <Badge variant="outline" className={cn(OPERATION_COLORS[p.operation])}>
                            {OPERATION_LABELS[p.operation] || p.operation}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-0.5 truncate font-medium text-[#4A3D38]">
                        {p.title}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#A89B96]">
                        {p.propertyType && (
                          <span>{PROPERTY_TYPE_LABELS[p.propertyType] || p.propertyType}</span>
                        )}
                        {p.cityName && <span>· {p.cityName}</span>}
                        {p.neighborhoodName && <span>· {p.neighborhoodName}</span>}
                        {p.price > 0 && (
                          <span className="font-medium text-[#6B5D5A]">
                            · {formatPriceShort(p.price, p.currency)}
                          </span>
                        )}
                        <span>· Actualizado {formatRelativeTime(p.updatedAt || p.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => openEdit(p.code)}
                      className="bg-[#B08968] text-white hover:bg-[#9A7558]"
                    >
                      <Pencil className="size-3.5" /> Continuar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteTarget(p)}
                      className="text-[#C97A7A] hover:text-[#C97A7A]"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar borrador?</DialogTitle>
            <DialogDescription>
              Se eliminará permanentemente el borrador{" "}
              <span className="font-mono text-[#5A4E4B]">{deleteTarget?.code}</span> —{" "}
              {deleteTarget?.title}. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
