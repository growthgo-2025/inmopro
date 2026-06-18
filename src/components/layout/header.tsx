"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2, Menu, Search, Heart, ChevronDown, Plus, LayoutDashboard,
  Users, FileSpreadsheet, X, Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu, NavigationMenuContent, NavigationMenuItem,
  NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { useNav } from "@/lib/store";
import { cn } from "@/lib/utils";

const PROPERTY_TYPES = [
  { label: "Casas", type: "CASA", icon: "🏠" },
  { label: "Apartamentos", type: "APARTAMENTO", icon: "🏢" },
  { label: "Apartaestudios", type: "APARTAESTUDIO", icon: "🛏️" },
  { label: "Fincas", type: "FINCA", icon: "🌳" },
  { label: "Lotes y terrenos", type: "LOTE", icon: "📐" },
  { label: "Locales", type: "LOCAL", icon: "🏪" },
  { label: "Oficinas", type: "OFICINA", icon: "💼" },
  { label: "Bodegas", type: "BODEGA", icon: "🏭" },
];

export function Header() {
  const { goHome, openResults, openAdmin, setView } = useNav();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-all duration-300",
        scrolled
          ? "border-slate-200 bg-white/95 shadow-sm backdrop-blur-md"
          : "border-transparent bg-white"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <button onClick={goHome} className="flex shrink-0 items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Building2 className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-lg font-extrabold tracking-tight text-slate-900">
              Inmo<span className="text-blue-600">Pro</span>
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Portal Inmobiliario
            </span>
          </div>
        </button>

        {/* Desktop nav */}
        <NavigationMenu className="hidden lg:flex">
          <NavigationMenuList>
            {/* Comprar / Vender dropdown */}
            <NavigationMenuItem>
              <NavigationMenuTrigger className="bg-transparent text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 data-[state=open]:bg-slate-100">
                Inmuebles
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="grid w-[560px] grid-cols-2 gap-1 p-4">
                  <div className="col-span-2 mb-2 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span className="text-sm font-bold text-slate-900">Buscar por operación</span>
                  </div>
                  <NavigationMenuLink
                    asChild
                  >
                    <button
                      onClick={() => openResults({ operation: "VENTA" })}
                      className="flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-blue-50"
                    >
                      <div className="rounded-md bg-emerald-100 p-2 text-emerald-700">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Comprar</div>
                        <div className="text-xs text-slate-500">Propiedades en venta</div>
                      </div>
                    </button>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild>
                    <button
                      onClick={() => openResults({ operation: "ARRIENDO" })}
                      className="flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-blue-50"
                    >
                      <div className="rounded-md bg-blue-100 p-2 text-blue-700">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Arrendar</div>
                        <div className="text-xs text-slate-500">Propiedades en arriendo</div>
                      </div>
                    </button>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild>
                    <button
                      onClick={() => openResults({ operation: "TEMPORAL" })}
                      className="flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-amber-50"
                    >
                      <div className="rounded-md bg-amber-100 p-2 text-amber-700">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Arriendo temporal</div>
                        <div className="text-xs text-slate-500">Por días o semanas</div>
                      </div>
                    </button>
                  </NavigationMenuLink>

                  <div className="col-span-2 mt-3 mb-1 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <span className="text-sm font-bold text-slate-900">Por tipo de inmueble</span>
                  </div>
                  {PROPERTY_TYPES.map((t) => (
                    <NavigationMenuLink asChild key={t.type}>
                      <button
                        onClick={() => openResults({ propertyType: t.type })}
                        className="flex items-center gap-2 rounded-md p-2 text-left text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      >
                        <span>{t.icon}</span>
                        <span>{t.label}</span>
                      </button>
                    </NavigationMenuLink>
                  ))}
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <button
                onClick={() => setView("results")}
                className="inline-flex h-9 items-center rounded-md px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              >
                Explorar
              </button>
            </NavigationMenuItem>

            {/* Admin / CRM */}
            <NavigationMenuItem>
              <NavigationMenuTrigger className="bg-transparent text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 data-[state=open]:bg-slate-100">
                Gestión
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="grid w-[400px] gap-1 p-3">
                  <NavigationMenuLink asChild>
                    <button onClick={() => openAdmin("dashboard")} className="flex items-center gap-3 rounded-lg p-3 text-left hover:bg-blue-50">
                      <div className="rounded-md bg-blue-100 p-2 text-blue-700"><LayoutDashboard className="h-4 w-4" /></div>
                      <div><div className="text-sm font-semibold text-slate-900">Panel administrativo</div><div className="text-xs text-slate-500">Dashboard, estadísticas e inventario</div></div>
                    </button>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild>
                    <button onClick={() => openAdmin("properties")} className="flex items-center gap-3 rounded-lg p-3 text-left hover:bg-blue-50">
                      <div className="rounded-md bg-violet-100 p-2 text-violet-700"><Building2 className="h-4 w-4" /></div>
                      <div><div className="text-sm font-semibold text-slate-900">Administrar inmuebles</div><div className="text-xs text-slate-500">Crear, editar, publicar, duplicar</div></div>
                    </button>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild>
                    <button onClick={() => setView("upload")} className="flex items-center gap-3 rounded-lg p-3 text-left hover:bg-blue-50">
                      <div className="rounded-md bg-emerald-100 p-2 text-emerald-700"><Plus className="h-4 w-4" /></div>
                      <div><div className="text-sm font-semibold text-slate-900">Publicar inmueble</div><div className="text-xs text-slate-500">Asistente guiado paso a paso</div></div>
                    </button>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild>
                    <button onClick={() => setView("crm")} className="flex items-center gap-3 rounded-lg p-3 text-left hover:bg-blue-50">
                      <div className="rounded-md bg-amber-100 p-2 text-amber-700"><Users className="h-4 w-4" /></div>
                      <div><div className="text-sm font-semibold text-slate-900">CRM y leads</div><div className="text-xs text-slate-500">Gestión de contactos interesados</div></div>
                    </button>
                  </NavigationMenuLink>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={() => setView("results")}
          >
            <Search className="mr-1.5 h-4 w-4" /> Buscar
          </Button>
          <Button
            size="sm"
            className="hidden sm:inline-flex bg-blue-600 hover:bg-blue-700"
            onClick={() => setView("upload")}
          >
            <Plus className="mr-1 h-4 w-4" /> Publicar
          </Button>

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[320px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
                    <Building2 className="h-4 w-4 text-blue-500" />
                  </div>
                  InmoPro
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-1 px-2">
                <MobileLink icon={<Search className="h-4 w-4" />} label="Explorar inmuebles" onClick={() => { setView("results"); setMobileOpen(false); }} />
                <MobileLink icon={<Building2 className="h-4 w-4" />} label="Comprar" onClick={() => { openResults({ operation: "VENTA" }); setMobileOpen(false); }} />
                <MobileLink icon={<Building2 className="h-4 w-4" />} label="Arrendar" onClick={() => { openResults({ operation: "ARRIENDO" }); setMobileOpen(false); }} />
                <div className="my-2 border-t border-slate-100" />
                <div className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-slate-400">Gestión</div>
                <MobileLink icon={<LayoutDashboard className="h-4 w-4" />} label="Panel administrativo" onClick={() => { openAdmin("dashboard"); setMobileOpen(false); }} />
                <MobileLink icon={<Building2 className="h-4 w-4" />} label="Administrar inmuebles" onClick={() => { openAdmin("properties"); setMobileOpen(false); }} />
                <MobileLink icon={<Plus className="h-4 w-4" />} label="Publicar inmueble" onClick={() => { setView("upload"); setMobileOpen(false); }} />
                <MobileLink icon={<Users className="h-4 w-4" />} label="CRM y leads" onClick={() => { setView("crm"); setMobileOpen(false); }} />
                <MobileLink icon={<FileSpreadsheet className="h-4 w-4" />} label="Importar CSV / Excel" onClick={() => { openAdmin("import"); setMobileOpen(false); }} />
                <div className="my-2 border-t border-slate-100" />
                <div className="rounded-lg bg-slate-900 p-4 text-white">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Phone className="h-4 w-4 text-blue-400" /> Atención al cliente
                  </div>
                  <div className="mt-1 text-xs text-slate-300">Lun a Sáb, 8am - 7pm</div>
                  <div className="mt-2 text-sm font-bold">+57 604 123 4567</div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function MobileLink({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
    >
      <span className="text-slate-400">{icon}</span>
      {label}
    </button>
  );
}
