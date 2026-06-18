"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2, CheckCircle2, Users, Eye, Star, FileEdit, CheckCircle, MapPin, ArrowRight,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useNav } from "@/lib/store";
import {
  formatNumber, formatPriceShort, formatRelativeTime,
  PROPERTY_TYPE_LABELS, OPERATION_LABELS, OPERATION_COLORS,
  LEAD_STATUS_LABELS, LEAD_STATUS_COLORS,
} from "@/lib/format";
import { cn } from "@/lib/utils";

interface StatsResponse {
  totals: {
    properties: number; published: number; featured: number; leads: number;
    newLeads: number; closedLeads: number; citiesActive: number;
    typesActive: number; totalViews: number;
  };
  charts: {
    viewsByDay: { date: string; views: number; leads: number }[];
    leadsByStatus: { status: string; count: number }[];
    propertiesByOperation: { operation: string; count: number }[];
    propertiesByType: { type: string; count: number }[];
  };
  recentProperties: any[];
  recentLeads: any[];
}

const STATUS_HEX: Record<string, string> = {
  NUEVO: "#3b82f6",
  CONTACTADO: "#8b5cf6",
  INTERESADO: "#f59e0b",
  VISITA: "#06b6d4",
  NEGOCIACION: "#f97316",
  CERRADO: "#10b981",
};
const OP_HEX: Record<string, string> = {
  VENTA: "#10b981",
  ARRIENDO: "#3b82f6",
  TEMPORAL: "#f59e0b",
};
const STATUS_BADGES: Record<string, string> = {
  DISPONIBLE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  RESERVADO: "bg-amber-100 text-amber-700 border-amber-200",
  VENDIDO: "bg-slate-200 text-slate-700 border-slate-300",
  ARRENDADO: "bg-blue-100 text-blue-700 border-blue-200",
  BORRADOR: "bg-slate-100 text-slate-500 border-slate-200",
};

export function AdminDashboard() {
  const { openAdmin, setView, openProperty } = useNav();
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/stats");
        const d = await r.json();
        if (alive) { setData(d); setLoading(false); }
      } catch {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading || !data) return <DashboardSkeleton />;

  const t = data.totals;
  const drafts = Math.max(0, t.properties - t.published);
  const totalLeadsByStatus = data.charts.leadsByStatus.reduce((s, x) => s + x.count, 0);
  const viewsData = data.charts.viewsByDay.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit" }),
  }));

  const primaryKpis = [
    { label: "Total inmuebles", value: t.properties, icon: Building2, tint: "bg-blue-100 text-blue-700", trend: `${t.published} publicados` },
    { label: "Publicados", value: t.published, icon: CheckCircle2, tint: "bg-emerald-100 text-emerald-700", trend: `${t.featured} destacados` },
    { label: "Leads nuevos", value: t.newLeads, icon: Users, tint: "bg-amber-100 text-amber-700", trend: `${t.leads} totales` },
    { label: "Visitas totales", value: t.totalViews, icon: Eye, tint: "bg-violet-100 text-violet-700", trend: "acumulado" },
  ];
  const secondaryKpis = [
    { label: "Destacados", value: t.featured, icon: Star, tint: "bg-amber-100 text-amber-700" },
    { label: "Borradores", value: drafts, icon: FileEdit, tint: "bg-slate-100 text-slate-700" },
    { label: "Leads cerrados", value: t.closedLeads, icon: CheckCircle, tint: "bg-emerald-100 text-emerald-700" },
    { label: "Ciudades activas", value: t.citiesActive, icon: MapPin, tint: "bg-cyan-100 text-cyan-700" },
  ];

  return (
    <div className="space-y-5">
      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryKpis.map((k, i) => <KpiCard key={k.label} {...k} delay={i * 0.05} />)}
      </div>
      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {secondaryKpis.map((k, i) => <KpiCard key={k.label} {...k} delay={i * 0.05} />)}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visitas y leads · últimos 7 días</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={viewsData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <RTooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="views" name="Visitas" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="leads" name="Leads" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads por estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.charts.leadsByStatus.map((l) => ({ name: LEAD_STATUS_LABELS[l.status] || l.status, value: l.count }))}
                    dataKey="value" nameKey="name" innerRadius={70} outerRadius={100} paddingAngle={2}
                  >
                    {data.charts.leadsByStatus.map((l) => (
                      <Cell key={l.status} fill={STATUS_HEX[l.status] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <RTooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-900">{formatNumber(totalLeadsByStatus)}</span>
                <span className="text-xs text-slate-500">leads totales</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inmuebles por operación</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={data.charts.propertiesByOperation.map((p) => ({ name: OPERATION_LABELS[p.operation] || p.operation, count: p.count, op: p.operation }))}
                layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={100} />
                <RTooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {data.charts.propertiesByOperation.map((p) => (
                    <Cell key={p.operation} fill={OP_HEX[p.operation] || "#3b82f6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inmuebles por tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={data.charts.propertiesByType.map((p) => ({ name: PROPERTY_TYPE_LABELS[p.type] || p.type, count: p.count }))}
                margin={{ top: 4, right: 16, left: -8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <RTooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: recent properties + recent leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inmuebles recientes</CardTitle>
            <CardAction>
              <Button size="sm" variant="ghost" onClick={() => openAdmin("properties")} className="text-blue-600 hover:text-blue-700">
                Ver todos <ArrowRight className="size-3.5" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Op.</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentProperties.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-slate-50" onClick={() => openProperty(p.code)}>
                    <TableCell className="font-mono text-xs text-blue-600">{p.code}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{p.title}</TableCell>
                    <TableCell className="whitespace-nowrap font-medium">{formatPriceShort(p.price, p.currency)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(OPERATION_COLORS[p.operation])}>
                        {OPERATION_LABELS[p.operation] || p.operation}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(STATUS_BADGES[p.status] || "bg-slate-100 text-slate-600 border-slate-200")}>
                        {(p.status || "").toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-500">{formatRelativeTime(p.createdAt)}</TableCell>
                  </TableRow>
                ))}
                {data.recentProperties.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-400">Sin inmuebles recientes</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads recientes</CardTitle>
            <CardAction>
              <Button size="sm" variant="ghost" onClick={() => setView("crm")} className="text-blue-600 hover:text-blue-700">
                Ver todos <ArrowRight className="size-3.5" />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-slate-100">
              {data.recentLeads.map((l) => (
                <li key={l.id} className="flex items-center gap-3 py-2.5">
                  <div className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {l.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-slate-900">{l.name}</span>
                      <span className="shrink-0 text-xs text-slate-400">{formatRelativeTime(l.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 truncate text-xs text-slate-500">
                      <span className="font-mono">{l.propertyCode || "—"}</span>
                      {l.phone && <span>· {l.phone}</span>}
                    </div>
                  </div>
                  <Badge variant="outline" className={cn(LEAD_STATUS_COLORS[l.status])}>
                    {LEAD_STATUS_LABELS[l.status] || l.status}
                  </Badge>
                </li>
              ))}
              {data.recentLeads.length === 0 && (
                <li className="py-8 text-center text-sm text-slate-400">Sin leads recientes</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  label, value, icon: Icon, tint, trend, delay = 0,
}: {
  label: string; value: number; icon: any; tint: string; trend?: string; delay?: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay }}>
      <Card className="gap-3 py-4">
        <CardContent className="flex items-start gap-3">
          <div className={cn("grid size-10 shrink-0 place-items-center rounded-lg", tint)}>
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-slate-500">{label}</div>
            <div className="text-2xl font-bold leading-tight text-slate-900">{formatNumber(value)}</div>
            {trend && <div className="text-xs text-slate-400">{trend}</div>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
