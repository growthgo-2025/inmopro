"use client";
import {
  Waves, Dumbbell, Sun, Building2, Flame, Trees, ArrowUpDown, Snowflake,
  Box, Flower2, Mountain, Baby, Trophy, Droplets, Thermometer, Users, DoorOpen,
  ShieldCheck, Cctv, Zap, Droplet, Wifi, Tv, CheckCircle2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  piscina: Waves,
  gimnasio: Dumbbell,
  terraza: Sun,
  balcon: Building2,
  bbq: Flame,
  jardin: Trees,
  ascensor: ArrowUpDown,
  "aire-acondicionado": Snowflake,
  deposito: Box,
  patio: Flower2,
  "vista-panoramica": Mountain,
  "zona-infantil": Baby,
  "cancha-deportiva": Trophy,
  jacuzzi: Droplets,
  sauna: Thermometer,
  "salon-social": Users,
  porteria: DoorOpen,
  "seguridad-24h": ShieldCheck,
  "circuito-cerrado": Cctv,
  "porton-electrico": Zap,
  agua: Droplet,
  gas: Flame,
  internet: Wifi,
  tv: Tv,
};

export function AmenityIcon({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const Icon = MAP[slug] || CheckCircle2;
  return <Icon className={className} />;
}

export function amenityLabel(slug: string): string {
  const labels: Record<string, string> = {
    piscina: "Piscina",
    gimnasio: "Gimnasio",
    terraza: "Terraza",
    balcon: "Balcón",
    bbq: "Zona BBQ",
    jardin: "Jardín",
    ascensor: "Ascensor",
    "aire-acondicionado": "Aire acondicionado",
    deposito: "Depósito",
    patio: "Patio",
    "vista-panoramica": "Vista panorámica",
    "zona-infantil": "Zona infantil",
    "cancha-deportiva": "Cancha deportiva",
    jacuzzi: "Jacuzzi",
    sauna: "Sauna",
    "salon-social": "Salón social",
    porteria: "Portería",
    "seguridad-24h": "Seguridad 24h",
    "circuito-cerrado": "CCTV",
    "porton-electrico": "Portón eléctrico",
    agua: "Agua",
    gas: "Gas natural",
    internet: "Internet",
    tv: "TV por cable",
  };
  return labels[slug] || slug;
}
