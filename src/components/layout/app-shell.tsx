"use client";
import { useEffect, useState, Suspense } from "react";
import { useNav } from "@/lib/store";
import { Header } from "./header";
import { Footer } from "./footer";
import { HomeView } from "@/components/home/home-view";
import { ResultsView } from "@/components/results/results-view";
import { PropertyDetailView } from "@/components/property/property-detail-view";
import { AdminView } from "@/components/admin/admin-view";
import { UploadWizard } from "@/components/admin/upload-wizard";
import { CrmPanel } from "@/components/admin/crm-panel";

// Hydrate the navigation store from the URL ONCE at module load on the client,
// before React renders. This avoids a flash + avoids setState-in-effect.
if (typeof window !== "undefined") {
  useNav.getState().hydrateFromUrl();
}

export function AppShell() {
  const view = useNav((s) => s.view);
  const hydrateFromUrl = useNav((s) => s.hydrateFromUrl);
  const [ready, setReady] = useState(false);

  // Only subscribe to popstate (browser back/forward). The setReady call gates the
  // first client render to avoid a hydration mismatch (server renders the loading
  // state, client upgrades after mount) — a legitimate mount-only side effect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
    const onPop = () => hydrateFromUrl();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [hydrateFromUrl]);

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
          {view === "home" && <HomeView />}
          {view === "results" && <ResultsView />}
          {view === "property" && <PropertyDetailView />}
          {view === "admin" && <AdminView />}
          {view === "upload" && <UploadWizard />}
          {view === "crm" && <CrmPanel />}
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
