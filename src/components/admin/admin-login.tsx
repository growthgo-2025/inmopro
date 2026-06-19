"use client";
import { useEffect, useState } from "react";
import { ShieldCheck, Loader2, KeyRound, Eye, EyeOff } from "lucide-react";
import { useAdminAuth } from "@/lib/auth-store";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function AdminLogin() {
  const { loginOpen, closeLogin, login } = useAdminAuth();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form state whenever the dialog is opened. This is a legitimate
  // "sync external open-state to local form state" pattern.
  useEffect(() => {
    if (loginOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPassword("");
      setShow(false);
      setError(null);
      setLoading(false);
    }
  }, [loginOpen]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Ingresa la contraseña");
      return;
    }
    setLoading(true);
    setError(null);
    const ok = await login(password);
    setLoading(false);
    if (ok) {
      toast.success("Acceso de administrador concedido");
    } else {
      setError("Contraseña incorrecta");
    }
  };

  return (
    <Dialog open={loginOpen} onOpenChange={(o) => !o && closeLogin()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#6B5D5A] to-[#8A6F4F]">
            <ShieldCheck className="h-6 w-6 text-[#E0B589]" />
          </div>
          <DialogTitle className="flex items-center gap-2 text-[#3D3530]">
            <KeyRound className="h-4 w-4 text-[#B08968]" />
            Acceso restringido
          </DialogTitle>
          <DialogDescription className="text-[#8B7E78]">
            Esta área es exclusiva para el administrador de Innovar Showrooms.
            Ingresa tu contraseña para continuar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="admin-password" className="text-[#5A4E4B]">
              Contraseña de administrador
            </Label>
            <div className="relative">
              <Input
                id="admin-password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                autoFocus
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#A89B96] hover:text-[#6B5D5A]"
                tabIndex={-1}
                aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && (
              <p className="text-xs font-medium text-[#C97A7A]">{error}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeLogin}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !password.trim()}
              className="bg-[#6B5D5A] hover:bg-[#5A4E4B]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando…
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" /> Entrar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>

        <p className="text-center text-[11px] text-[#A89B96]">
          Sesión protegida con cookie firmada · válida 7 días
        </p>
      </DialogContent>
    </Dialog>
  );
}
