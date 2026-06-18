# 🏠 InmoPro — Plataforma Inmobiliaria Profesional

Plataforma web inmobiliaria profesional inspirada en la experiencia de portales líderes de Real Estate (tipo Mitula/Idealista), con diseño, arquitectura y código completamente originales. Preparada para escalar a nivel nacional e internacional como marketplace inmobiliario.

> **Inmuebles en venta y arriendo en Colombia** con códigos únicos verificables (`INV-2026-MED-000001`), buscador avanzado, filtros profesionales, CRM de leads y panel administrativo completo.

---

## ✨ Características principales

### 🏘️ Portal público
- **Inicio con buscador avanzado** — operación (venta/arriendo/temporal) + texto libre (ciudad, barrio o código de inmueble) + tipo + ciudad
- **Categorías rápidas** — casas, apartamentos, fincas, lotes, locales, oficinas, bodegas, apartaestudios
- **Ciudades destacadas** con conteo de inmuebles por ciudad
- **Inmuebles destacados y recientes** con tabs
- **Sección SEO** con contenido optimizado y FAQ

### 🔎 Resultados con filtros profesionales
- **11 secciones de filtros**: ubicación (país/departamento/ciudad/barrio), operación, tipo, precio, área, habitaciones, baños, parqueaderos, estrato, características (amoblado/pet friendly) y amenidades
- **Chips de filtros activos** removibles individualmente
- **Ordenamiento**: más recientes, menor/mayor precio, mayor área, relevancia
- **Paginación** + grid responsive de tarjetas de inmueble
- **Vista móvil** con filtros en bottom-sheet

### 🏠 Detalle del inmueble
- **Galería profesional** con zoom, fullscreen y navegación por teclado
- **Código único copiable** (`INV-2026-{CITY}-{SEQ}`)
- **Características principales** (hab/baños/área/parqueaderos/estrato/antigüedad)
- **Descripción completa** + características adicionales + amenidades con iconos
- **Mapa interactivo** (OpenStreetMap) con dirección privacy-blurred
- **Tarjeta del asesor** + **formulario de contacto** que crea leads reales
- **Propiedades similares** + botones de compartir (Facebook/WhatsApp/LinkedIn/X/copiar enlace)
- **JSON-LD schema.org RealEstateListing** para SEO

### 📊 Panel administrativo
- **Dashboard** con 8 KPIs + 4 gráficos (visitas/leads 7 días, leads por estado, inmuebles por operación/tipo)
- **Tabla de inmuebles** con acciones: ver, editar, duplicar, publicar/despublicar, destacar/quitar, eliminar
- **Importación masiva CSV/Excel** con plantilla descargable y preview
- **CRM de leads** — tablero Kanban de 6 columnas (Nuevo → Contactado → Interesado → Visita → Negociación → Cerrado)

### ➕ Asistente de publicación (7 pasos)
Diseñado para **asesores no técnicos**:
1. Información básica (operación, tipo, ciudad, barrio, dirección, precio, área, hab/baños/parqueaderos, estrato)
2. Imágenes con **drag & drop + reordenado** (@dnd-kit) + selección de imagen principal
3. Características y amenidades (checkboxes agrupadas por categoría)
4. Descripción (título, descripción corta SEO, descripción larga con contadores)
5. Contacto del asesor (nombre, teléfono, WhatsApp, correo)
6. Vista previa fiel del anuncio
7. Publicación — **genera código único automáticamente** + crea slug SEO + success screen

Funciones adicionales: autoguardado en localStorage, recuperación de borrador, validación por paso.

---

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Lenguaje** | TypeScript 5 |
| **Estilos** | Tailwind CSS 4 + shadcn/ui (New York) |
| **Iconos** | lucide-react |
| **Animaciones** | Framer Motion |
| **Gráficos** | Recharts |
| **State** | Zustand (client) + React Query (server) |
| **Forms** | React Hook Form + Zod |
| **Drag & Drop** | @dnd-kit |
| **BD / ORM** | Prisma + SQLite (dev) |
| **Mapas** | OpenStreetMap static |
| **Toasts** | Sonner |

---

## 🎨 Identidad visual

Paleta corporativa:

| Color | Hex | Uso |
|-------|-----|-----|
| Primario | `#0F172A` | Header, footer, secciones oscuras |
| Secundario | `#1E40AF` | Acentos secundarios |
| Apoyo | `#3B82F6` | Links, highlights |
| CTA | `#2563EB` | Botones primarios |
| Fondo | `#F8FAFC` | Fondo de página |
| Texto | `#1E293B` | Body text |
| Texto muted | `#64748B` | Texto secundario |
| Éxito | `#10B981` | Estados positivos |
| Alerta | `#F59E0B` | Advertencias |
| Error | `#EF4444` | Errores |

Tipografías: **Plus Jakarta Sans** (display) + **Inter** (body).

---

## 📂 Estructura del proyecto

```
.
├── prisma/
│   ├── schema.prisma          # Esquema completo (16 modelos)
│   └── seed.ts                # Seed: 57 inmuebles, 10 ciudades, 78 barrios, 6 asesores, 14 leads
├── src/
│   ├── app/
│   │   ├── api/               # 9 route handlers (properties, leads, stats, cities, etc.)
│   │   ├── globals.css        # Design system + paleta corporativa
│   │   ├── layout.tsx         # Metadata SEO + fonts
│   │   ├── page.tsx           # Entry point (renderiza AppShell)
│   │   ├── sitemap.ts         # Sitemap dinámico
│   │   └── robots.ts
│   ├── components/
│   │   ├── admin/             # admin-view, dashboard, properties, import, crm-panel, upload-wizard
│   │   ├── home/              # home-view
│   │   ├── layout/            # header, footer, app-shell
│   │   ├── property/          # property-card, property-detail-view, property-code-badge, amenity-icon
│   │   ├── results/           # results-view (filtros + grid + paginación)
│   │   └── ui/                # shadcn/ui components
│   └── lib/
│       ├── constants.ts       # Filtros, opciones, tipos de inmueble
│       ├── db.ts              # Prisma client singleton
│       ├── format.ts          # Formateo de precios/fechas en es-CO
│       ├── queries.ts         # Lógica de búsqueda/propiedades
│       ├── store.ts           # Zustand store (navegación + filtros)
│       └── utils.ts
├── public/
└── package.json
```

---

## 🚀 Puesta en marcha

### Prerrequisitos
- Node.js 20+ o Bun
- Una base de datos (SQLite por defecto para dev)

### Instalación

```bash
# 1. Instalar dependencias
bun install        # o npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Edita .env con tu DATABASE_URL (por defecto usa SQLite local)

# 3. Generar el cliente de Prisma y crear la BD
bun run db:generate
bun run db:push

# 4. Cargar datos de ejemplo (seed)
bun run db:seed
# Esto crea: 1 país, 10 departamentos, 10 ciudades, 78 barrios,
# 24 amenidades, 3 agencias, 6 asesores, 57 inmuebles, 14 leads

# 5. Iniciar el servidor de desarrollo
bun run dev
# Abre http://localhost:3000
```

### Scripts disponibles

```bash
bun run dev          # Servidor de desarrollo (puerto 3000)
bun run build        # Build de producción
bun run start        # Servidor de producción
bun run lint         # ESLint
bun run db:push      # Sincronizar schema Prisma con la BD
bun run db:generate  # Regenerar cliente Prisma
bun run db:seed      # Cargar datos de ejemplo
bun run db:reset     # Resetear BD y migrations
```

---

## 🔑 Sistema de códigos de inmueble

Cada inmueble tiene un código **único, no repetible, indexado, copiable y buscable**:

```
INV-2026-MED-000001
│    │    │   │
│    │    │   └── Secuencia global (6 dígitos, padding con ceros)
│    │    └────── Código de ciudad (MED, BOG, BQ, CALI, CTG...)
│    └─────────── Año actual
└──────────────── Prefijo fijo (INV = Inmueble)
```

El código se genera automáticamente al crear un inmueble (en el backend o en el asistente de publicación) y se puede buscar desde el home, el catálogo, el CRM y el panel administrativo.

---

## 🗺️ Arquitectura de navegación

La plataforma funciona como una **SPA sobre una única ruta `/`** con view-routing vía URL search params (compartible + soporta back/forward):

| View | URL | Descripción |
|------|-----|-------------|
| Home | `/` | Landing con buscador |
| Results | `/?view=results&city=...&operation=...` | Catálogo con filtros |
| Property | `/?view=property&code=INV-2026-MED-000001` | Detalle del inmueble |
| Admin | `/?view=admin&section=dashboard` | Panel administrativo |
| Upload | `/?view=upload` | Asistente de publicación |
| CRM | `/?view=crm` | Gestión de leads |

---

## 🗄️ Esquema de base de datos

Modelos principales (ver `prisma/schema.prisma`):

- **Geography**: `Country`, `State`, `City`, `Neighborhood`
- **Users**: `User` (roles: ADMIN/AGENCY_ADMIN/AGENT/CLIENT), `Agency`
- **Catalog**: `Amenity` (general/security/services)
- **Core**: `Property` (con código único, slug, JSON amenities, JSON images, coordenadas, SEO meta)
- **CRM**: `Lead` (estados: NUEVO → CONTACTADO → INTERESADO → VISITA → NEGOCIACION → CERRADO)
- **Engagement**: `Favorite`, `SavedSearch`
- **Audit**: `AuditLog`

---

## 🔒 Seguridad

- Validación de inputs (frontend + backend con Zod)
- Sanitización de entradas
- Rate limiting preparado (middleware)
- Logs de auditoría para acciones críticas (crear/editar/eliminar inmuebles y leads)
- `.env` excluido del control de versiones

---

## 📈 SEO

- **SSR** para todas las vistas críticas
- **Sitemap dinámico** (`/sitemap.xml`) con todas las propiedades y ciudades
- **robots.txt** configurado
- **Metadata** dinámica por vista (Open Graph + Twitter Cards)
- **JSON-LD** schema.org RealEstateListing en cada detalle
- **URLs amigables** con slugs optimizados
- **Canonical** configurado

---

## 📝 Roadmap

- [ ] Autenticación con NextAuth.js (JWT + roles)
- [ ] Perfil público de asesores
- [ ] Búsquedas guardadas con alertas
- [ ] Integración real con Google Maps / Mapbox
- [ ] Almacenamiento S3 / Cloudinary para imágenes
- [ ] Elasticsearch para búsqueda full-text a escala
- [ ] App móvil (React Native)
- [ ] Integración CRM externo (HubSpot/Pipedrive)
- [ ] Migración a PostgreSQL para producción
- [ ] Rate limiting con Redis
- [ ] Tests E2E con Playwright

---

## 📄 Licencia

Este proyecto es privado. Todos los derechos reservados.

---

## 👥 Contacto

- **Sitio**: https://inmopro.co
- **Email**: contacto@inmopro.co
- **Teléfono**: +57 604 123 4567

---

**Hecho con ❤️ en Colombia** 🇨🇴
