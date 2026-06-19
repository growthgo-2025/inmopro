"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, Plus, Phone, Mail, MessageSquare, ExternalLink, Search, X, StickyNote,
  Building2, Inbox,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useNav } from "@/lib/store";
import {
  formatRelativeTime, formatPriceShort,
  LEAD_STATUS_LABELS, LEAD_STATUS_COLORS,
} from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUSES = ["NUEVO", "CONTACTADO", "INTERESADO", "VISITA", "NEGOCIACION", "CERRADO"] as const;

const SOURCE_LABELS: Record<string, string> = {
  WEB: "Web",
  WHATSAPP: "WhatsApp",
  PHONE: "Teléfono",
  CRM: "CRM",
  REFERIDO: "Referido",
  PORTAL: "Portal",
};
const SOURCE_BADGES: Record<string, string> = {
  WEB: "bg-[#FAF3EC] text-[#9A7558] border-blue-200",
  WHATSAPP: "bg-emerald-50 text-[#7A8B66] border-[#97A97C]/30",
  PHONE: "bg-cyan-50 text-cyan-700 border-cyan-200",
  CRM: "bg-[#F0EAE5] text-[#5A4E4B] border-[#E8DFD9]",
  REFERIDO: "bg-[#FAF0E0] text-[#B89164] border-[#E0B589]/30",
  PORTAL: "bg-violet-50 text-[#7A6E6A] border-[#A89B96]/30",
};

const STATUS_DOT: Record<string, string> = {
  NUEVO: "bg-[#C9A07A]",
  CONTACTADO: "bg-violet-500",
  INTERESADO: "bg-[#FAF0E0]0",
  VISITA: "bg-cyan-500",
  NEGOCIACION: "bg-orange-500",
  CERRADO: "bg-emerald-500",
};

interface Lead {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  source: string;
  status: string;
  propertyCode?: string | null;
  property?: { code: string; title: string; price: number; operation: string } | null;
  agentId?: string | null;
  notes?: string | null;
  createdAt: string;
}

const STATS_SUMMARY = [
  { status: "NUEVO", label: "Nuevos", tint: "border-blue-200 bg-[#FAF3EC] text-[#9A7558]" },
  { status: "CONTACTADO", label: "Contactados", tint: "border-[#A89B96]/30 bg-violet-50 text-[#7A6E6A]" },
  { status: "INTERESADO", label: "Interesados", tint: "border-[#E0B589]/30 bg-[#FAF0E0] text-[#B89164]" },
  { status: "CERRADO", label: "Cerrados", tint: "border-[#97A97C]/30 bg-emerald-50 text-[#7A8B66]" },
];

export function CrmPanel() {
  const { openProperty } = useNav();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/leads");
      const d = await r.json();
      setLeads(d.items || []);
    } catch {
      toast.error("No se pudieron cargar los leads");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of STATUSES) m[s] = 0;
    for (const l of leads) m[l.status] = (m[l.status] || 0) + 1;
    return m;
  }, [leads]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (!s) return true;
      return (
        l.name?.toLowerCase().includes(s) ||
        l.phone?.toLowerCase().includes(s) ||
        l.propertyCode?.toLowerCase().includes(s)
      );
    });
  }, [leads, search, statusFilter]);

  const openLead = (l: Lead) => {
    setSelected(l);
    setNotesDraft(l.notes || "");
  };

  const changeStatus = async (lead: Lead, status: string) => {
    // optimistic
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    if (selected?.id === lead.id) setSelected({ ...selected, status });
    try {
      const r = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error();
      toast.success("Estado actualizado", { description: `${LEAD_STATUS_LABELS[status]} · ${lead.name}` });
    } catch {
      toast.error("No se pudo actualizar el estado");
      // rollback
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: lead.status } : l)));
      if (selected?.id === lead.id) setSelected({ ...selected, status: lead.status });
    }
  };

  const saveNotes = async () => {
    if (!selected) return;
    setSavingNotes(true);
    try {
      const r = await fetch(`/api/leads/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesDraft }),
      });
      if (!r.ok) throw new Error();
      setLeads((prev) => prev.map((l) => (l.id === selected.id ? { ...l, notes: notesDraft } : l)));
      setSelected({ ...selected, notes: notesDraft });
      toast.success("Notas guardadas");
    } catch {
      toast.error("No se pudieron guardar las notas");
    } finally {
      setSavingNotes(false);
    }
  };

  const visibleStatuses = statusFilter === "all" ? STATUSES : [statusFilter as any];

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#3D3530]">CRM · Gestión de leads</h1>
          <p className="text-sm text-[#8B7E78]">Da seguimiento a tus contactos desde el primer mensaje hasta el cierre.</p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus /> Nuevo lead
        </Button>
      </div>

      {/* Stats strip */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS_SUMMARY.map((s) => (
          <Card key={s.status} className="gap-1 py-3">
            <CardContent className="flex items-center gap-3">
              <div className={cn("grid size-9 place-items-center rounded-lg border", s.tint)}>
                <span className={cn("size-2 rounded-full", STATUS_DOT[s.status])} />
              </div>
              <div>
                <div className="text-xl font-bold leading-tight text-[#3D3530]">{counts[s.status] || 0}</div>
                <div className="text-xs text-[#8B7E78]">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          <FilterPill active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
            Todos <span className="ml-1 rounded-full bg-slate-200 px-1.5 text-[10px] font-semibold text-[#6B5D5A]">{leads.length}</span>
          </FilterPill>
          {STATUSES.map((s) => (
            <FilterPill key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
              {LEAD_STATUS_LABELS[s]}
              <span className="ml-1 rounded-full bg-slate-200 px-1.5 text-[10px] font-semibold text-[#6B5D5A]">{counts[s] || 0}</span>
            </FilterPill>
          ))}
        </div>
        <div className="relative lg:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#A89B96]" />
          <Input
            placeholder="Buscar por nombre, teléfono o código…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="grid size-14 place-items-center rounded-full bg-[#F0EAE5]">
              <Inbox className="size-7 text-[#A89B96]" />
            </div>
            <div>
              <div className="font-semibold text-[#5A4E4B]">No hay leads todavía</div>
              <div className="text-sm text-[#8B7E78]">Crea tu primer lead o espera que lleguen contactos desde la web.</div>
            </div>
            <Button size="sm" onClick={() => setNewOpen(true)}><Plus /> Nuevo lead</Button>
          </CardContent>
        </Card>
      ) : (
        <div className={cn(
          "grid gap-3",
          statusFilter === "all" ? "lg:grid-cols-6" : "grid-cols-1"
        )}>
          {visibleStatuses.map((status) => {
            const col = filtered.filter((l) => l.status === status);
            return (
              <div key={status} className="flex flex-col rounded-xl bg-[#F0EAE5]/70 ring-1 ring-[#E8DFD9]/70">
                <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[status])} />
                    <span className="truncate text-sm font-semibold text-[#4A3D38]">{LEAD_STATUS_LABELS[status]}</span>
                  </div>
                  <Badge variant="outline" className={cn("shrink-0", LEAD_STATUS_COLORS[status])}>
                    {col.length}
                  </Badge>
                </div>
                <div className="flex-1 space-y-2 px-2 pb-2 lg:max-h-[calc(100vh-260px)] lg:overflow-y-auto">
                  {col.map((l) => (
                    <LeadCard
                      key={l.id}
                      lead={l}
                      onClick={() => openLead(l)}
                      onStatusChange={(s) => changeStatus(l, s)}
                    />
                  ))}
                  {col.length === 0 && (
                    <div className="rounded-lg border border-dashed border-[#D8CFC9] bg-white/40 px-3 py-6 text-center text-xs text-[#A89B96]">
                      Sin leads en este estado
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lead detail sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="text-lg">{selected.name}</SheetTitle>
                <SheetDescription>
                  Lead creado {formatRelativeTime(selected.createdAt)}
                  {selected.source && <> · Origen: {SOURCE_LABELS[selected.source] || selected.source}</>}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={LEAD_STATUS_COLORS[selected.status]}>
                    {LEAD_STATUS_LABELS[selected.status] || selected.status}
                  </Badge>
                  {selected.source && (
                    <Badge variant="outline" className={SOURCE_BADGES[selected.source] || "bg-[#F0EAE5] text-[#5A4E4B] border-[#E8DFD9]"}>
                      {SOURCE_LABELS[selected.source] || selected.source}
                    </Badge>
                  )}
                </div>

                {/* Contact */}
                <div className="space-y-2 rounded-lg border border-[#E8DFD9] p-3">
                  {selected.phone && (
                    <a href={`tel:${selected.phone}`} className="flex items-center gap-2 text-sm text-[#5A4E4B] hover:text-[#9A7558]">
                      <Phone className="size-4 text-[#A89B96]" /> {selected.phone}
                    </a>
                  )}
                  {selected.email && (
                    <a href={`mailto:${selected.email}`} className="flex items-center gap-2 truncate text-sm text-[#5A4E4B] hover:text-[#9A7558]">
                      <Mail className="size-4 shrink-0 text-[#A89B96]" /> <span className="truncate">{selected.email}</span>
                    </a>
                  )}
                  {!selected.phone && !selected.email && (
                    <div className="text-xs text-[#A89B96]">Sin datos de contacto</div>
                  )}
                </div>

                {/* Property */}
                {selected.propertyCode && (
                  <div className="space-y-2 rounded-lg border border-[#E8DFD9] p-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-[#A89B96]">Inmueble</div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono text-xs text-[#B08968]">{selected.propertyCode}</div>
                        <div className="truncate text-sm font-medium text-[#4A3D38]">
                          {selected.property?.title || "(sin título)"}
                        </div>
                        {selected.property && (
                          <div className="text-xs text-[#8B7E78]">
                            {formatPriceShort(selected.property.price)} · {selected.property.operation}
                          </div>
                        )}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => { openProperty(selected.propertyCode!); setSelected(null); }}>
                        <ExternalLink className="size-3.5" /> Abrir
                      </Button>
                    </div>
                  </div>
                )}

                {/* Message */}
                {selected.message && (
                  <div className="space-y-1.5 rounded-lg border border-[#E8DFD9] p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#A89B96]">
                      <MessageSquare className="size-3.5" /> Mensaje
                    </div>
                    <p className="text-sm text-[#5A4E4B] whitespace-pre-wrap">{selected.message}</p>
                  </div>
                )}

                {/* Status change */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-[#A89B96]">Cambiar estado</Label>
                  <Select value={selected.status} onValueChange={(v) => changeStatus(selected, v)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{LEAD_STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#A89B96]">
                    <StickyNote className="size-3.5" /> Notas internas
                  </Label>
                  <Textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="Agrega observaciones, recordatorios o acuerdos…"
                    className="min-h-24"
                  />
                </div>
              </div>
              <SheetFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>Cerrar</Button>
                <Button onClick={saveNotes} disabled={savingNotes || notesDraft === (selected.notes || "")}>
                  {savingNotes ? "Guardando…" : "Guardar notas"}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* New lead dialog */}
      <NewLeadDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={() => { setNewOpen(false); fetchLeads(); }}
      />
    </div>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "bg-[#3D3530] text-white" : "bg-[#F0EAE5] text-[#5A4E4B] hover:bg-slate-200"
      )}
    >
      {children}
    </button>
  );
}

function LeadCard({
  lead, onClick, onStatusChange,
}: { lead: Lead; onClick: () => void; onStatusChange: (s: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="cursor-pointer rounded-lg border border-[#E8DFD9] bg-white p-2.5 shadow-sm transition-colors hover:border-blue-300 hover:bg-[#FAF3EC]/30"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-[#3D3530]">{lead.name}</div>
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 truncate text-xs text-[#8B7E78] hover:text-[#9A7558]"
            >
              <Phone className="size-3" /> {lead.phone}
            </a>
          )}
          {lead.email && (
            <div className="flex items-center gap-1 truncate text-xs text-[#A89B96]">
              <Mail className="size-3 shrink-0" /> <span className="truncate">{lead.email}</span>
            </div>
          )}
        </div>
        <Badge variant="outline" className={cn("shrink-0", SOURCE_BADGES[lead.source] || "bg-[#F0EAE5] text-[#5A4E4B] border-[#E8DFD9]")}>
          {SOURCE_LABELS[lead.source] || lead.source}
        </Badge>
      </div>

      {lead.propertyCode && (
        <div className="mt-1.5 font-mono text-[11px] text-[#B08968]">{lead.propertyCode}</div>
      )}

      {lead.message && (
        <p className="mt-1.5 line-clamp-2 text-xs text-[#8B7E78]">{lead.message}</p>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[10px] text-[#A89B96]">{formatRelativeTime(lead.createdAt)}</span>
        <Select
          value={lead.status}
          onValueChange={(v) => { onStatusChange(v); }}
        >
          <SelectTrigger
            size="sm"
            className="h-6 w-auto min-w-[110px] gap-1 px-2 py-0 text-[11px]"
            onClick={(e) => e.stopPropagation()}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent onClick={(e) => e.stopPropagation()}>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">{LEAD_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </motion.div>
  );
}

function NewLeadDialog({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", message: "", propertyCode: "", source: "CRM",
  });
  const [saving, setSaving] = useState(false);

  const reset = () => setForm({ name: "", email: "", phone: "", message: "", propertyCode: "", source: "CRM" });

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status: "NUEVO" }),
      });
      if (!r.ok) throw new Error();
      toast.success("Lead creado");
      reset();
      onCreated();
    } catch {
      toast.error("No se pudo crear el lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo lead</DialogTitle>
          <DialogDescription>Registra un contacto manualmente en el CRM.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="lead-name">Nombre *</Label>
            <Input id="lead-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. María González" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lead-phone">Teléfono</Label>
              <Input id="lead-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+57 300 123 4567" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-email">Email</Label>
              <Input id="lead-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="correo@ejemplo.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lead-code">Código inmueble</Label>
              <Input id="lead-code" value={form.propertyCode} onChange={(e) => setForm({ ...form, propertyCode: e.target.value })} placeholder="INV-2026-MED-000001" className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Origen</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-msg">Mensaje</Label>
            <Textarea id="lead-msg" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="¿Qué busca el cliente?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Guardando…" : "Crear lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
