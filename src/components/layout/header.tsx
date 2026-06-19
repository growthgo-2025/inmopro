"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2, Menu, Search, Heart, ChevronDown, Plus, LayoutDashboard,
  Users, FileSpreadsheet, X, Phone, ShieldCheck, LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu, NavigationMenuContent, NavigationMenuItem,
  NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { useNav } from "@/lib/store";
import { useAdminAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

const PROPERTY_TYPES = [
  { label: "Casas", type: "CASA" },
  { label: "Apartamentos", type: "APARTAMENTO" },
  { label: "Apartaestudios", type: "APARTAESTUDIO" },
  { label: "Fincas", type: "FINCA" },
  { label: "Lotes y terrenos", type: "LOTE" },
  { label: "Locales", type: "LOCAL" },
  { label: "Oficinas", type: "OFICINA" },
  { label: "Bodegas", type: "BODEGA" },
];

export function Header() {
  const { goHome, openResults, openAdmin, setView } = useNav();
  const { isAdmin, openLogin, logout } = useAdminAuth();
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
          ? "border-[#E8DFD9] bg-white/95 shadow-sm backdrop-blur-md"
          : "border-transparent bg-white"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <button onClick={goHome} className="flex shrink-0 items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#6B5D5A] text-white">
            <Building2 className="h-5 w-5 text-[#E0B589]" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-lg font-extrabold tracking-tight text-[#3D3530]">
              Innovar <span className="text-[#B08968]">Showrooms</span>
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#8B7E78]">
              Portal Inmobiliario
            </span>
          </div>
        </button>

        {/* Desktop nav */}
        <NavigationMenu className="hidden lg:flex">
          <NavigationMenuList>
            {/* Comprar / Vender dropdown */}
            <NavigationMenuItem>
              <NavigationMenuTrigger className="bg-transparent text-sm font-semibold text-[#5A4E4B] hover:bg-[#F0EAE5] hover:text-[#3D3530] data-[state=open]:bg-[#F0EAE5]">
                Inmuebles
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="grid w-[560px] grid-cols-2 gap-1 p-4 pt-5">
                  <div className="col-span-2 mb-2 flex items-center gap-2 border-b border-[#F0EAE5] pb-3">
                    <span className="text-sm font-bold text-[#3D3530]">Buscar por operación</span>
                  </div>
                  <NavigationMenuLink
                    asChild
                  >
                    <button
                      onClick={() => openResults({ operation: "VENTA" })}
                      className="flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-[#FAF3EC]"
                    >
                      <div className="rounded-md bg-[#97A97C]/20 p-2 text-[#7A8B66]">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#3D3530]">Comprar</div>
                        <div className="text-xs text-[#8B7E78]">Propiedades en venta</div>
                      </div>
                    </button>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild>
                    <button
                      onClick={() => openResults({ operation: "ARRIENDO" })}
                      className="flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-[#FAF3EC]"
                    >
                      <div className="rounded-md bg-[#F5EBE0] p-2 text-[#9A7558]">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#3D3530]">Arrendar</div>
                        <div className="text-xs text-[#8B7E78]">Propiedades en arriendo</div>
                      </div>
                    </button>
                  </NavigationMenuLink>
                  <NavigationMenuLink asChild>
                    <button
                      onClick={() => openResults({ operation: "TEMPORAL" })}
                      className="flex w-full items-start gap-3 rounded-lg p-3 text-left hover:bg-[#FAF0E0]"
                    >
                      <div className="rounded-md bg-[#E0B589]/20 p-2 text-[#B89164]">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#3D3530]">Arriendo temporal</div>
                        <div className="text-xs text-[#8B7E78]">Por días o semanas</div>
                      </div>
                    </button>
                  </NavigationMenuLink>

                  <div className="col-span-2 mt-3 mb-1 flex items-center gap-2 border-b border-[#F0EAE5] pb-2">
                    <span className="text-sm font-bold text-[#3D3530]">Por tipo de inmueble</span>
                  </div>
                  {PROPERTY_TYPES.map((t) => (
                    <NavigationMenuLink asChild key={t.type}>
                      <button
                        onClick={() => openResults({ propertyType: t.type })}
                        className="flex items-center gap-2 rounded-md p-2 text-left text-sm text-[#6B5D5A] hover:bg-[#F0EAE5] hover:text-[#3D3530]"
                      >
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
                className="inline-flex h-9 items-center rounded-md px-3 text-sm font-semibold text-[#5A4E4B] hover:bg-[#F0EAE5] hover:text-[#3D3530]"
              >
                Explorar
              </button>
            </NavigationMenuItem>

            {/* Admin / CRM — only visible to authenticated admins */}
            {isAdmin && (
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-sm font-semibold text-[#5A4E4B] hover:bg-[#F0EAE5] hover:text-[#3D3530] data-[state=open]:bg-[#F0EAE5]">
                  <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-[#B08968]" />
                  Gestión
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid w-[400px] gap-1 p-3 pt-4">
                    <NavigationMenuLink asChild>
                      <button onClick={() => openAdmin("dashboard")} className="flex items-center gap-3 rounded-lg p-3 text-left hover:bg-[#FAF3EC]">
                        <div className="rounded-md bg-[#F5EBE0] p-2 text-[#9A7558]"><LayoutDashboard className="h-4 w-4" /></div>
                        <div><div className="text-sm font-semibold text-[#3D3530]">Panel administrativo</div><div className="text-xs text-[#8B7E78]">Dashboard, estadísticas e inventario</div></div>
                      </button>
                    </NavigationMenuLink>
                    <NavigationMenuLink asChild>
                      <button onClick={() => openAdmin("properties")} className="flex items-center gap-3 rounded-lg p-3 text-left hover:bg-[#FAF3EC]">
                        <div className="rounded-md bg-[#A89B96]/20 p-2 text-[#7A6E6A]"><Building2 className="h-4 w-4" /></div>
                        <div><div className="text-sm font-semibold text-[#3D3530]">Administrar inmuebles</div><div className="text-xs text-[#8B7E78]">Crear, editar, publicar, eliminar</div></div>
                      </button>
                    </NavigationMenuLink>
                    <NavigationMenuLink asChild>
                      <button onClick={() => setView("upload")} className="flex items-center gap-3 rounded-lg p-3 text-left hover:bg-[#FAF3EC]">
                        <div className="rounded-md bg-[#97A97C]/20 p-2 text-[#7A8B66]"><Plus className="h-4 w-4" /></div>
                        <div><div className="text-sm font-semibold text-[#3D3530]">Publicar inmueble</div><div className="text-xs text-[#8B7E78]">Asistente guiado paso a paso</div></div>
                      </button>
                    </NavigationMenuLink>
                    <NavigationMenuLink asChild>
                      <button onClick={() => setView("crm")} className="flex items-center gap-3 rounded-lg p-3 text-left hover:bg-[#FAF3EC]">
                        <div className="rounded-md bg-[#E0B589]/20 p-2 text-[#B89164]"><Users className="h-4 w-4" /></div>
                        <div><div className="text-sm font-semibold text-[#3D3530]">CRM y leads</div><div className="text-xs text-[#8B7E78]">Gestión de contactos interesados</div></div>
                      </button>
                    </NavigationMenuLink>
                    <div className="my-1 border-t border-[#F0EAE5]" />
                    <button
                      onClick={() => { logout(); setMobileOpen(false); }}
                      className="flex items-center gap-3 rounded-lg p-3 text-left text-[#C97A7A] hover:bg-[#FBEAEA]"
                    >
                      <div className="rounded-md bg-[#C97A7A]/15 p-2 text-[#C97A7A]"><LogOut className="h-4 w-4" /></div>
                      <div><div className="text-sm font-semibold">Cerrar sesión</div><div className="text-xs text-[#8B7E78]">Salir del panel administrativo</div></div>
                    </button>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            )}
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
          {isAdmin ? (
            <>
              <Button
                size="sm"
                className="hidden sm:inline-flex bg-[#B08968] hover:bg-[#9A7558]"
                onClick={() => setView("upload")}
              >
                <Plus className="mr-1 h-4 w-4" /> Publicar
              </Button>
              <button
                onClick={logout}
                title="Cerrar sesión de administrador"
                className="hidden h-9 w-9 items-center justify-center rounded-md border border-[#E8DFD9] text-[#6B5D5A] transition-colors hover:bg-[#F0EAE5] sm:inline-flex"
                aria-label="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : null}

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
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6B5D5A]">
                    <Building2 className="h-4 w-4 text-[#E0B589]" />
                  </div>
                  Innovar Showrooms
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-1 px-2">
                <MobileLink icon={<Search className="h-4 w-4" />} label="Explorar inmuebles" onClick={() => { setView("results"); setMobileOpen(false); }} />
                <MobileLink icon={<Building2 className="h-4 w-4" />} label="Comprar" onClick={() => { openResults({ operation: "VENTA" }); setMobileOpen(false); }} />
                <MobileLink icon={<Building2 className="h-4 w-4" />} label="Arrendar" onClick={() => { openResults({ operation: "ARRIENDO" }); setMobileOpen(false); }} />
                {isAdmin && (
                  <>
                    <div className="my-2 border-t border-[#F0EAE5]" />
                    <div className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-[#A89B96]">Gestión (admin)</div>
                    <MobileLink icon={<LayoutDashboard className="h-4 w-4" />} label="Panel administrativo" onClick={() => { openAdmin("dashboard"); setMobileOpen(false); }} />
                    <MobileLink icon={<Building2 className="h-4 w-4" />} label="Administrar inmuebles" onClick={() => { openAdmin("properties"); setMobileOpen(false); }} />
                    <MobileLink icon={<Plus className="h-4 w-4" />} label="Publicar inmueble" onClick={() => { setView("upload"); setMobileOpen(false); }} />
                    <MobileLink icon={<Users className="h-4 w-4" />} label="CRM y leads" onClick={() => { setView("crm"); setMobileOpen(false); }} />
                    <MobileLink icon={<FileSpreadsheet className="h-4 w-4" />} label="Importar CSV / Excel" onClick={() => { openAdmin("import"); setMobileOpen(false); }} />
                    <MobileLink icon={<LogOut className="h-4 w-4" />} label="Cerrar sesión" onClick={() => { logout(); setMobileOpen(false); }} />
                  </>
                )}
                <div className="my-2 border-t border-[#F0EAE5]" />
                <div className="rounded-lg bg-[#3D3530] p-4 text-white">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Phone className="h-4 w-4 text-[#E0B589]" /> Atención al cliente
                  </div>
                  <div className="mt-1 text-xs text-[#C9BFB9]">Lun a Sáb, 8am - 7pm</div>
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
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm font-medium text-[#5A4E4B] hover:bg-[#F0EAE5]"
    >
      <span className="text-[#A89B96]">{icon}</span>
      {label}
    </button>
  );
}
