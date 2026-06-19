"use client";
import { useEffect, useState, Suspense } from "react";
import { useNav } from "@/lib/store";
import { useAdminAuth } from "@/lib/auth-store";
import { Header } from "./header";
import { Footer } from "./footer";
import { HomeView } from "@/components/home/home-view";
import { ResultsView } from "@/components/results/results-view";
import { PropertyDetailView } from "@/components/property/property-detail-view";
import { AdminView } from "@/components/admin/admin-view";
import { UploadWizard } from "@/components/admin/upload-wizard";
import { CrmPanel } from "@/components/admin/crm-panel";
import { AdminLogin } from "@/components/admin/admin-login";
import { ShieldAlert, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";

// Hydrate the navigation store from the URL ONCE at module load on the client,
// before React renders. This avoids a flash + avoids setState-in-effect.
if (typeof window !== "undefined") {
  useNav.getState().hydrateFromUrl();
}

const ADMIN_VIEWS = new Set(["admin", "upload", "crm"]);

export function AppShell() {
  const view = useNav((s) => s.view);
  const hydrateFromUrl = useNav((s) => s.hydrateFromUrl);
  const goHome = useNav((s) => s.goHome);
  const { isAdmin, hydrated, hydrate, openLogin } = useAdminAuth();
  const [ready, setReady] = useState(false);

  // Only subscribe to popstate (browser back/forward). The setReady call gates the
  // first client render to avoid a hydration mismatch (server renders the loading
  // state, client upgrades after mount) — a legitimate mount-only side effect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
    hydrate();
    const onPop = () => hydrateFromUrl();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [hydrateFromUrl, hydrate]);

  // Global keyboard shortcut: Ctrl/Cmd + Shift + A → open admin login
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "a" || e.key === "A" || e.key === "A".toLowerCase())) {
        e.preventDefault();
        openLogin();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openLogin]);

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E8DFD9] border-t-[#B08968]" />
            <p className="text-sm text-[#8B7E78]">Cargando Innovar Showrooms…</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Gate admin views: require an authenticated admin session. While we're still
  // hydrating the session, show the spinner to avoid flashing the lock screen.
  const needsAdmin = ADMIN_VIEWS.has(view);
  const showLock = needsAdmin && hydrated && !isAdmin;
  const showAdminSpinner = needsAdmin && !hydrated;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="flex min-h-[60vh] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E8DFD9] border-t-[#B08968]" />
            </div>
          }
        >
          {showLock ? (
            <AccessDenied onLogin={openLogin} onHome={goHome} />
          ) : showAdminSpinner ? (
            <div className="flex min-h-[60vh] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E8DFD9] border-t-[#B08968]" />
                <p className="text-sm text-[#8B7E78]">Verificando acceso…</p>
              </div>
            </div>
          ) : (
            <>
              {view === "home" && <HomeView />}
              {view === "results" && <ResultsView />}
              {view === "property" && <PropertyDetailView />}
              {view === "admin" && <AdminView />}
              {view === "upload" && <UploadWizard />}
              {view === "crm" && <CrmPanel />}
            </>
          )}
        </Suspense>
      </main>
      <Footer />
      <AdminLogin />
    </div>
  );
}

function AccessDenied({ onLogin, onHome }: { onLogin: () => void; onHome: () => void }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6B5D5A] to-[#8A6F4F] shadow-lg">
        <ShieldAlert className="h-8 w-8 text-[#E0B589]" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-[#3D3530]">
        Área restringida
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[#8B7E78]">
        Esta sección es exclusiva para el administrador de Innovar Showrooms.
        Necesitas iniciar sesión con tu contraseña de administrador para
        publicar, editar o eliminar inmuebles.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button onClick={onLogin} className="bg-[#6B5D5A] hover:bg-[#5A4E4B]">
          <LockKeyhole className="mr-2 h-4 w-4" /> Iniciar sesión
        </Button>
        <Button variant="outline" onClick={onHome}>
          Volver al inicio
        </Button>
      </div>
      <p className="mt-6 text-[11px] text-[#A89B96]">
        ¿Eres el administrador? También puedes presionar{" "}
        <kbd className="rounded border border-[#E8DFD9] bg-[#FAF6F3] px-1.5 py-0.5 font-mono text-[10px] text-[#6B5D5A]">
          Ctrl + Shift + A
        </kbd>
      </p>
    </div>
  );
}
