"use client";
import { Copy, Check, Hash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function PropertyCodeBadge({
  code,
  className,
  variant = "default",
}: {
  code: string;
  className?: string;
  variant?: "default" | "solid" | "light";
}) {
  const [copied, setCopied] = useState(false);

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Código copiado", { description: code });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const styles =
    variant === "solid"
      ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800"
      : variant === "light"
      ? "bg-white/95 text-slate-900 border-white shadow-sm hover:bg-white"
      : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200";

  return (
    <button
      onClick={copy}
      title={`Copiar código ${code}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-mono font-semibold tracking-wide transition-colors",
        styles,
        className
      )}
    >
      <Hash className="h-3 w-3 opacity-70" />
      <span>{code}</span>
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3 opacity-50" />
      )}
    </button>
  );
}
