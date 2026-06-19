"use client";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Building2, Plus, Users, FileSpreadsheet, ArrowLeft,
} from "lucide-react";
import { useNav } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AdminDashboard } from "./admin-dashboard";
import { AdminProperties } from "./admin-properties";
import { AdminImport } from "./admin-import";

type Section = "dashboard" | "properties" | "import";

const NAV_ITEMS: { section: string; label: string; icon: any; nav: "admin" | "view" }[] = [
  { section: "dashboard", label: "Dashboard", icon: LayoutDashboard, nav: "admin" },
  { section: "properties", label: "Inmuebles", icon: Building2, nav: "admin" },
  { section: "upload", label: "Publicar inmueble", icon: Plus, nav: "view" },
  { section: "crm", label: "CRM y leads", icon: Users, nav: "view" },
  { section: "import", label: "Importar masivo", icon: FileSpreadsheet, nav: "admin" },
];

const SECTION_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  properties: "Inmuebles",
  upload: "Publicar inmueble",
  crm: "CRM y leads",
  import: "Importar masivo",
};

export function AdminView() {
  const { adminSection, openAdmin, setView, goHome } = useNav();
  const section = (adminSection && SECTION_LABELS[adminSection] ? adminSection : "dashboard") as Section;

  const go = (item: (typeof NAV_ITEMS)[number]) => {
    if (item.nav === "view") setView(item.section as any);
    else openAdmin(item.section);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
      {/* Top breadcrumb + title bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={goHome} className="cursor-pointer">Inicio</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink onClick={() => openAdmin("dashboard")} className="cursor-pointer">Panel</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{SECTION_LABELS[section] || section}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#3D3530]">Panel administrativo</h1>
          <p className="text-sm text-[#8B7E78]">Gestiona inmuebles, leads y métricas de tu agencia.</p>
        </div>
        <Button onClick={() => setView("upload")} className="self-start sm:self-auto">
          <Plus /> Publicar inmueble
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden md:block w-60 shrink-0">
          <div className="sticky top-20 rounded-xl bg-[#6B5D5A] p-3 text-[#F5EBE0] shadow-sm">
            <div className="mb-3 flex items-center gap-2 px-1">
              <div className="grid size-8 place-items-center rounded-lg bg-[#B08968] text-sm font-bold text-white">A</div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-[#C9BFB9]">Administrador</div>
                <div className="truncate text-sm font-semibold text-white">Innovar Showrooms</div>
              </div>
            </div>
            <button
              onClick={goHome}
              className="mb-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[#A89B96] transition-colors hover:bg-[#4A3D38] hover:text-white"
            >
              <ArrowLeft className="size-3.5" /> Volver al sitio
            </button>
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = section === item.section || (item.section === "crm" && false);
                return (
                  <button
                    key={item.section}
                    onClick={() => go(item)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active ? "bg-[#B08968] text-white shadow-sm" : "text-[#C9BFB9] hover:bg-[#4A3D38] hover:text-white"
                    )}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="mt-4 rounded-lg bg-[#4A3D38]/60 p-3 text-xs text-[#A89B96]">
              <div className="font-semibold text-[#E8DFD9]">Tip</div>
              <p className="mt-1 leading-relaxed">Usa el CRM para dar seguimiento a tus leads desde el primer contacto hasta el cierre.</p>
            </div>
          </div>
        </aside>

        {/* Mobile tab bar */}
        <div className="md:hidden -mx-4 mb-2 overflow-x-auto px-4 pb-1">
          <div className="flex w-max gap-1.5">
            {NAV_ITEMS.map((item) => {
              const active = section === item.section;
              return (
                <button
                  key={item.section}
                  onClick={() => go(item)}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    active ? "bg-[#B08968] text-white" : "bg-[#F0EAE5] text-[#5A4E4B] hover:bg-slate-200"
                  )}
                >
                  <item.icon className="size-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {section === "dashboard" && <AdminDashboard />}
            {section === "properties" && <AdminProperties />}
            {section === "import" && <AdminImport />}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
