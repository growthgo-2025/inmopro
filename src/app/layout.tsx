import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://inmopro.co"),
  title: {
    default: "InmoPro — Inmuebles en Venta y Arriendo en Colombia | Portal Inmobiliario Profesional",
    template: "%s | InmoPro",
  },
  description:
    "Encuentra casas, apartamentos, fincas, lotes, oficinas y locales en venta y arriendo en toda Colombia. Buscador avanzado, códigos únicos de inmueble, filtros profesionales y contacto directo con asesores certificados.",
  keywords: [
    "inmuebles Colombia",
    "casas en venta",
    "apartamentos en arriendo",
    "finca raíz",
    "inmobiliaria",
    "propiedades",
    "lotes",
    "oficinas",
    "locales",
    "arriendo temporal",
  ],
  authors: [{ name: "InmoPro" }],
  creator: "InmoPro",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "InmoPro — Portal Inmobiliario Profesional",
    description:
      "Inmuebles en venta y arriendo en toda Colombia. Buscador avanzado, filtros profesionales y contacto directo con asesores.",
    url: "https://inmopro.co",
    siteName: "InmoPro",
    locale: "es_CO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "InmoPro — Portal Inmobiliario Profesional",
    description: "Inmuebles en venta y arriendo en toda Colombia.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  alternates: { canonical: "/" },
};

export const viewport = {
  themeColor: "#0F172A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-CO" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jakarta.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
        style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
      >
        {children}
        <Toaster />
        <SonnerToaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
