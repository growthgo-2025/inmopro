"use client";
import { Building2, Mail, Phone, MapPin, Facebook, Instagram, Linkedin, Twitter, ShieldCheck, Award, Headset } from "lucide-react";
import { useNav } from "@/lib/store";

export function Footer() {
  const { goHome, openResults, setView, openAdmin } = useNav();

  return (
    <footer className="mt-auto border-t border-slate-800 bg-slate-900 text-slate-300">
      {/* Trust strip */}
      <div className="border-b border-slate-800">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6 lg:px-8">
          <TrustItem icon={<ShieldCheck className="h-6 w-6" />} title="Inmuebles verificados" desc="Cada código de inmueble es único y validado." />
          <TrustItem icon={<Award className="h-6 w-6" />} title="Asesores certificados" desc="Profesionales con licencia inmobiliaria activa." />
          <TrustItem icon={<Headset className="h-6 w-6" />} title="Soporte dedicado" desc="Acompañamiento de principio a fin." />
        </div>
      </div>

      {/* Main footer */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-extrabold text-white">
                Inmo<span className="text-blue-400">Pro</span>
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              El portal inmobiliario profesional de Colombia. Encuentra casas, apartamentos,
              fincas, lotes, oficinas y locales en venta y arriendo con códigos únicos
              verificables y contacto directo con asesores certificados.
            </p>
            <div className="mt-5 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <MapPin className="h-4 w-4 text-blue-400" /> Medellín · Bogotá · Barranquilla · Cali
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Phone className="h-4 w-4 text-blue-400" /> +57 604 123 4567
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Mail className="h-4 w-4 text-blue-400" /> contacto@inmopro.co
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <SocialIcon icon={<Facebook className="h-4 w-4" />} label="Facebook" />
              <SocialIcon icon={<Instagram className="h-4 w-4" />} label="Instagram" />
              <SocialIcon icon={<Linkedin className="h-4 w-4" />} label="LinkedIn" />
              <SocialIcon icon={<Twitter className="h-4 w-4" />} label="Twitter" />
            </div>
          </div>

          {/* Inmuebles */}
          <FooterCol title="Inmuebles">
            <FooterLink onClick={() => openResults({ operation: "VENTA" })}>Comprar</FooterLink>
            <FooterLink onClick={() => openResults({ operation: "ARRIENDO" })}>Arrendar</FooterLink>
            <FooterLink onClick={() => openResults({ operation: "TEMPORAL" })}>Arriendo temporal</FooterLink>
            <FooterLink onClick={() => openResults({ propertyType: "CASA" })}>Casas</FooterLink>
            <FooterLink onClick={() => openResults({ propertyType: "APARTAMENTO" })}>Apartamentos</FooterLink>
            <FooterLink onClick={() => openResults({ propertyType: "FINCA" })}>Fincas</FooterLink>
            <FooterLink onClick={() => openResults({ propertyType: "LOTE" })}>Lotes</FooterLink>
          </FooterCol>

          {/* Gestión */}
          <FooterCol title="Gestión">
            <FooterLink onClick={() => openAdmin("dashboard")}>Panel administrativo</FooterLink>
            <FooterLink onClick={() => openAdmin("properties")}>Administrar inmuebles</FooterLink>
            <FooterLink onClick={() => setView("upload")}>Publicar inmueble</FooterLink>
            <FooterLink onClick={() => setView("crm")}>CRM y leads</FooterLink>
            <FooterLink onClick={() => openAdmin("import")}>Importar masivo</FooterLink>
          </FooterCol>

          {/* Empresa */}
          <FooterCol title="Empresa">
            <FooterLink onClick={goHome}>Inicio</FooterLink>
            <FooterLink onClick={() => setView("results")}>Explorar</FooterLink>
            <FooterLink onClick={() => window.open("/sitemap.xml", "_blank")}>Sitemap</FooterLink>
            <FooterLink onClick={() => window.open("/robots.txt", "_blank")}>Robots.txt</FooterLink>
          </FooterCol>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <div>© {new Date().getFullYear()} InmoPro. Todos los derechos reservados. NIT 901.123.456-7</div>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-300">Términos</span>
            <span className="hover:text-slate-300">Privacidad</span>
            <span className="hover:text-slate-300">Cookies</span>
            <span className="flex items-center gap-1 text-slate-400">
              <ShieldCheck className="h-3 w-3" /> Sitio seguro SSL
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function TrustItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="rounded-lg bg-blue-600/15 p-3 text-blue-400">{icon}</div>
      <div>
        <div className="text-sm font-bold text-white">{title}</div>
        <div className="text-xs text-slate-400">{desc}</div>
      </div>
    </div>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-white">{title}</h4>
      <ul className="space-y-2 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <li>
      <button onClick={onClick} className="text-slate-400 transition-colors hover:text-blue-400">
        {children}
      </button>
    </li>
  );
}

function SocialIcon({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition-colors hover:border-blue-500 hover:bg-blue-600 hover:text-white"
    >
      {icon}
    </button>
  );
}
