/**
 * Client-side admin auth store.
 * The cookie is httpOnly so JS can't read it directly; this store mirrors the
 * session state (hydrated from /api/admin/session) and exposes login/logout.
 */
"use client";

import { create } from "zustand";

interface AuthState {
  isAdmin: boolean;
  hydrated: boolean;
  loginOpen: boolean;
  hydrate: () => Promise<void>;
  openLogin: () => void;
  closeLogin: () => void;
  login: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAdminAuth = create<AuthState>((set, get) => ({
  isAdmin: false,
  hydrated: false,
  loginOpen: false,

  hydrate: async () => {
    try {
      const r = await fetch("/api/admin/session", { cache: "no-store" });
      const d = await r.json();
      set({ isAdmin: !!d.isAdmin, hydrated: true });
    } catch {
      set({ isAdmin: false, hydrated: true });
    }
  },

  openLogin: () => set({ loginOpen: true }),
  closeLogin: () => set({ loginOpen: false }),

  login: async (password) => {
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!r.ok) return false;
      set({ isAdmin: true, loginOpen: false });
      return true;
    } catch {
      return false;
    }
  },

  logout: async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      set({ isAdmin: false });
    }
  },
}));
