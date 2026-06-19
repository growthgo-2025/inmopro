/**
 * Navigation store - SPA-style view routing on the single / route.
 * Views: home | results | property | admin | upload | crm | dashboard
 * Uses URL search params for shareability + back button support.
 */
"use client";

import { create } from "zustand";

export type ViewName =
  | "home"
  | "results"
  | "property"
  | "admin"
  | "upload"
  | "crm"
  | "dashboard";

export interface SearchFilters {
  q?: string; // free text / property code
  operation?: string; // VENTA | ARRIENDO | TEMPORAL
  propertyType?: string;
  cityId?: string;
  neighborhoodId?: string;
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;
  areaMax?: number;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  stratum?: number;
  furnished?: boolean;
  petFriendly?: boolean;
  amenities?: string[];
  sort?: string; // recientes | precio-asc | precio-desc | area-desc | relevancia
  page?: number;
}

interface NavState {
  view: ViewName;
  propertyCode: string | null;
  editCode: string | null;
  filters: SearchFilters;
  isFiltersOpen: boolean;
  adminSection: string;

  setView: (v: ViewName) => void;
  openProperty: (code: string) => void;
  openEdit: (code: string) => void;
  openResults: (filters?: SearchFilters) => void;
  goHome: () => void;
  openAdmin: (section?: string) => void;
  setFilters: (f: Partial<SearchFilters>) => void;
  resetFilters: () => void;
  setFiltersOpen: (open: boolean) => void;
  hydrateFromUrl: () => void;
  syncToUrl: () => void;
}

const DEFAULT_FILTERS: SearchFilters = {
  sort: "recientes",
  page: 1,
};

export const useNav = create<NavState>((set, get) => ({
  view: "home",
  propertyCode: null,
  editCode: null,
  filters: { ...DEFAULT_FILTERS },
  isFiltersOpen: false,
  adminSection: "dashboard",

  setView: (v) => {
    // Clear editCode when navigating away from upload view explicitly
    set({ view: v, ...(v === "upload" ? {} : { editCode: null }) });
    // If going to upload via setView (not openEdit), it's a new publish — clear editCode
    if (v === "upload") set({ editCode: null });
    get().syncToUrl();
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },

  openProperty: (code) => {
    set({ view: "property", propertyCode: code });
    get().syncToUrl();
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },

  openEdit: (code) => {
    set({ view: "upload", editCode: code, propertyCode: null });
    get().syncToUrl();
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },

  openResults: (filters) => {
    set({
      view: "results",
      filters: { ...get().filters, ...filters, page: 1 },
    });
    get().syncToUrl();
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },

  goHome: () => {
    set({ view: "home", filters: { ...DEFAULT_FILTERS }, propertyCode: null, editCode: null });
    get().syncToUrl();
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },

  openAdmin: (section = "dashboard") => {
    set({ view: "admin", adminSection: section });
    get().syncToUrl();
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },

  setFilters: (f) => {
    set({ filters: { ...get().filters, ...f, page: f.page ?? 1 } });
    get().syncToUrl();
  },

  resetFilters: () => {
    set({ filters: { ...DEFAULT_FILTERS } });
    get().syncToUrl();
  },

  setFiltersOpen: (open) => set({ isFiltersOpen: open }),

  hydrateFromUrl: () => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const view = (params.get("view") as ViewName) || "home";
    const propertyCode = params.get("code");
    const editCode = view === "upload" ? params.get("edit") : null;
    const adminSection = params.get("section") || "dashboard";

    const filters: SearchFilters = { ...DEFAULT_FILTERS };
    if (params.get("q")) filters.q = params.get("q")!;
    if (params.get("op")) filters.operation = params.get("op")!;
    if (params.get("type")) filters.propertyType = params.get("type")!;
    if (params.get("city")) filters.cityId = params.get("city")!;
    if (params.get("nbh")) filters.neighborhoodId = params.get("nbh")!;
    if (params.get("pmin")) filters.priceMin = Number(params.get("pmin"));
    if (params.get("pmax")) filters.priceMax = Number(params.get("pmax"));
    if (params.get("amin")) filters.areaMin = Number(params.get("amin"));
    if (params.get("amax")) filters.areaMax = Number(params.get("amax"));
    if (params.get("bed")) filters.bedrooms = Number(params.get("bed"));
    if (params.get("bath")) filters.bathrooms = Number(params.get("bath"));
    if (params.get("park")) filters.parking = Number(params.get("park"));
    if (params.get("str")) filters.stratum = Number(params.get("str"));
    if (params.get("fur") === "1") filters.furnished = true;
    if (params.get("pet") === "1") filters.petFriendly = true;
    if (params.get("am")) filters.amenities = params.get("am")!.split(",").filter(Boolean);
    if (params.get("sort")) filters.sort = params.get("sort")!;
    if (params.get("page")) filters.page = Number(params.get("page"));

    set({ view, propertyCode, editCode, filters, adminSection });
  },

  syncToUrl: () => {
    if (typeof window === "undefined") return;
    const { view, propertyCode, editCode, filters, adminSection } = get();
    const params = new URLSearchParams();
    if (view !== "home") params.set("view", view);
    if (propertyCode) params.set("code", propertyCode);
    if (editCode && view === "upload") params.set("edit", editCode);
    if (view === "admin" && adminSection !== "dashboard") params.set("section", adminSection);

    if (view === "results") {
      if (filters.q) params.set("q", filters.q);
      if (filters.operation) params.set("op", filters.operation);
      if (filters.propertyType) params.set("type", filters.propertyType);
      if (filters.cityId) params.set("city", filters.cityId);
      if (filters.neighborhoodId) params.set("nbh", filters.neighborhoodId);
      if (filters.priceMin) params.set("pmin", String(filters.priceMin));
      if (filters.priceMax) params.set("pmax", String(filters.priceMax));
      if (filters.areaMin) params.set("amin", String(filters.areaMin));
      if (filters.areaMax) params.set("amax", String(filters.areaMax));
      if (filters.bedrooms) params.set("bed", String(filters.bedrooms));
      if (filters.bathrooms) params.set("bath", String(filters.bathrooms));
      if (filters.parking) params.set("park", String(filters.parking));
      if (filters.stratum) params.set("str", String(filters.stratum));
      if (filters.furnished) params.set("fur", "1");
      if (filters.petFriendly) params.set("pet", "1");
      if (filters.amenities?.length) params.set("am", filters.amenities.join(","));
      if (filters.sort && filters.sort !== "recientes") params.set("sort", filters.sort);
      if (filters.page && filters.page > 1) params.set("page", String(filters.page));
    }

    const qs = params.toString();
    const newUrl = qs ? `/?${qs}` : "/";
    // Use pushState so browser back/forward buttons work.
    // Avoid pushing duplicate entries when only filters change on the same view
    // by comparing with current URL.
    const currentUrl = window.location.pathname + window.location.search;
    if (currentUrl === newUrl) return;
    window.history.pushState(null, "", newUrl);
  },
}));
