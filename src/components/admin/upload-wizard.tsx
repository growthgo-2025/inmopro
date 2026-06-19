"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ImagePlus,
  GripVertical,
  Star,
  X,
  Save,
  RotateCcw,
  Building2,
  MapPin,
  BedDouble,
  Bath,
  Car,
  Maximize,
  Phone,
  Mail,
  User,
  Sparkles,
  Eye,
  FileText,
  Image as ImageIcon,
  ListChecks,
  Send,
  Loader2,
  Pencil,
  Hash,
} from "lucide-react";

import { useNav } from "@/lib/store";
import {
  formatPrice,
  formatPriceShort,
  formatArea,
  PROPERTY_TYPE_LABELS,
  OPERATION_LABELS,
} from "@/lib/format";
import {
  OPERATIONS,
  PROPERTY_TYPES,
  STRATUM_OPTIONS,
} from "@/lib/constants";
import { AmenityIcon, amenityLabel } from "@/components/property/amenity-icon";
import { PropertyCodeBadge } from "@/components/property/property-code-badge";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ========================================================================== */
/*  Constants + types                                                          */
/* ========================================================================== */

const STEPS = [
  { id: 1, label: "Info básica" },
  { id: 2, label: "Imágenes" },
  { id: 3, label: "Características" },
  { id: 4, label: "Descripción" },
  { id: 5, label: "Contacto" },
  { id: 6, label: "Vista previa" },
  { id: 7, label: "Publicar" },
];

const DRAFT_KEY = "inmopro_upload_draft";

interface CityOption { id: string; name: string; code: string; stateName: string; propertyCount: number; }
interface NeighborhoodOption { id: string; name: string; zone: string; cityId: string; propertyCount: number; }
interface AmenityOption { id: string; name: string; slug: string; icon: string; category: string; }

interface WizardImage {
  id: string;
  url: string; // URL principal (variante "large" o Unsplash)
  caption: string;
  isMain: boolean;
  // Variantes para srcset responsive (Supabase Storage)
  variants?: {
    thumb: string;
    medium: string;
    large: string;
    original: string;
  };
  // Paths en Storage para poder borrar al eliminar
  paths?: string[];
  uploading?: boolean; // true mientras se sube al backend
  uploadError?: string; // mensaje si falla la subida
}

interface WizardForm {
  // Step 1
  operation: string;
  propertyType: string;
  cityId: string;
  neighborhoodId: string;
  address: string;
  price: string;
  currency: string;
  area: string;
  bedrooms: string;
  bathrooms: string;
  parking: string;
  stratum: string;
  // Step 3
  amenities: string[];
  furnished: boolean;
  petFriendly: boolean;
  floor: string;
  floorsTotal: string;
  ageYears: string;
  builtArea: string;
  adminFee: string;
  status: string;
  // Step 4
  title: string;
  shortDesc: string;
  description: string;
  // Step 5
  agentName: string;
  agentPhone: string;
  agentWhatsapp: string;
  agentEmail: string;
  // Step 2
  images: WizardImage[];
}

const DEFAULT_FORM: WizardForm = {
  operation: "",
  propertyType: "",
  cityId: "",
  neighborhoodId: "",
  address: "",
  price: "",
  currency: "COP",
  area: "",
  bedrooms: "0",
  bathrooms: "0",
  parking: "0",
  stratum: "",
  amenities: [],
  furnished: false,
  petFriendly: false,
  floor: "",
  floorsTotal: "",
  ageYears: "",
  builtArea: "",
  adminFee: "",
  status: "DISPONIBLE",
  title: "",
  shortDesc: "",
  description: "",
  agentName: "Asesor Innovar Showrooms",
  agentPhone: "",
  agentWhatsapp: "",
  agentEmail: "",
  images: [],
};

/* ========================================================================== */
/*  Helpers                                                                     */
/* ========================================================================== */

function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function formatCOPInput(value: string): string {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("es-CO").format(Number(digits));
}

function parseNumeric(value: string): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/* ========================================================================== */
/*  Main component                                                              */
/* ========================================================================== */

export function UploadWizard() {
  const { setView, openProperty, goHome } = useNav();

  const [form, setForm] = useState<WizardForm>(DEFAULT_FORM);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<{ code: string; id: string } | null>(null);
  const [confirmChecked, setConfirmChecked] = useState(false);

  // Lookup data
  const [cities, setCities] = useState<CityOption[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodOption[]>([]);
  const [amenities, setAmenities] = useState<AmenityOption[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  /* -------- Load cities + amenities on mount; check for draft -------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingLookups(true);
      try {
        const [cRes, aRes] = await Promise.all([
          fetch("/api/cities"),
          fetch("/api/amenities"),
        ]);
        const cJson = await cRes.json();
        const aJson = await aRes.json();
        if (!cancelled) {
          if (Array.isArray(cJson.items)) setCities(cJson.items);
          if (Array.isArray(aJson.items)) setAmenities(aJson.items);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoadingLookups(false);
      }
    })();

    // Draft recovery prompt
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WizardForm;
        if (parsed && parsed.title !== undefined) {
          toast.info("Borrador encontrado", {
            description: "Tienes un borrador guardado. ¿Recuperarlo?",
            duration: 8000,
            action: {
              label: "Recuperar",
              onClick: () => {
                // Strip blob URLs from images (they won't survive reload)
                const cleanImages = (parsed.images || []).filter(
                  (i) => !i.url.startsWith("blob:")
                );
                setForm({ ...DEFAULT_FORM, ...parsed, images: cleanImages });
                toast.success("Borrador recuperado");
              },
            },
            cancel: {
              label: "Descartar",
              onClick: () => {
                localStorage.removeItem(DRAFT_KEY);
              },
            },
          });
        }
      }
    } catch {
      /* ignore */
    }

    return () => {
      cancelled = true;
    };
  }, []);

  /* -------- Load neighborhoods when city changes -------- */
  useEffect(() => {
    if (!form.cityId) {
      setNeighborhoods([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/neighborhoods?cityId=${form.cityId}`);
        const json = await res.json();
        if (!cancelled && Array.isArray(json.items)) setNeighborhoods(json.items);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.cityId]);

  /* -------- Persist draft to localStorage on form change -------- */
  useEffect(() => {
    try {
      // Don't persist blob URLs (they won't be valid on reload)
      const persistable: WizardForm = {
        ...form,
        images: form.images.filter((i) => !i.url.startsWith("blob:")),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(persistable));
    } catch {
      /* ignore quota errors */
    }
  }, [form]);

  /* -------- Update helper -------- */
  const update = <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key as string]) {
      setErrors((e) => {
        const c = { ...e };
        delete c[key as string];
        return c;
      });
    }
  };

  /* -------- Validation per step -------- */
  const validateStep = (s: number): { ok: boolean; errs: Record<string, string> } => {
    const errs: Record<string, string> = {};
    if (s === 1) {
      if (!form.operation) errs.operation = "Selecciona una operación";
      if (!form.propertyType) errs.propertyType = "Selecciona un tipo";
      if (!form.cityId) errs.cityId = "Selecciona una ciudad";
      if (!form.neighborhoodId) errs.neighborhoodId = "Selecciona un barrio";
      if (!form.address.trim()) errs.address = "La dirección es obligatoria";
      if (!form.price || Number(form.price) <= 0) errs.price = "Ingresa un precio válido";
      if (!form.area || Number(form.area) <= 0) errs.area = "Ingresa el área";
    }
    if (s === 2) {
      const uploading = form.images.some((i) => i.uploading);
      const validCount = form.images.filter((i) => !i.uploadError && !i.uploading).length;
      if (form.images.length < 1) errs.images = "Agrega al menos 1 imagen";
      else if (uploading) errs.images = "Espera a que terminen de subir las imágenes";
      else if (validCount === 0) errs.images = "Todas las imágenes fallaron. Sube al menos una válida.";
    }
    if (s === 4) {
      if (!form.title.trim()) errs.title = "El título es obligatorio";
      else if (form.title.length > 100) errs.title = "Máximo 100 caracteres";
      if (!form.shortDesc.trim()) errs.shortDesc = "La descripción corta es obligatoria";
      else if (form.shortDesc.length > 160) errs.shortDesc = "Máximo 160 caracteres";
      if (!form.description.trim()) errs.description = "La descripción larga es obligatoria";
      else if (form.description.length < 30)
        errs.description = "Describe al menos 30 caracteres";
    }
    if (s === 5) {
      if (!form.agentName.trim()) errs.agentName = "Nombre requerido";
      if (!form.agentPhone.trim()) errs.agentPhone = "Teléfono requerido";
      if (!form.agentEmail.trim()) errs.agentEmail = "Correo requerido";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.agentEmail))
        errs.agentEmail = "Correo inválido";
    }
    return { ok: Object.keys(errs).length === 0, errs };
  };

  const handleNext = () => {
    const { ok, errs } = validateStep(step);
    if (!ok) {
      setErrors(errs);
      toast.error("Revisa los campos requeridos", {
        description: Object.values(errs)[0],
      });
      // scroll to first error
      setTimeout(() => {
        const firstKey = Object.keys(errs)[0];
        const el = document.querySelector(`[data-field="${firstKey}"]`);
        if (el) (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }
    setErrors({});
    if (step < 7) {
      setStep((s) => s + 1);
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handlePrev = () => {
    setErrors({});
    if (step > 1) {
      setStep((s) => s - 1);
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const saveDraft = () => {
    try {
      const persistable: WizardForm = {
        ...form,
        images: form.images.filter((i) => !i.url.startsWith("blob:")),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(persistable));
      toast.success("Borrador guardado", {
        description: "Puedes continuar más tarde desde este navegador.",
      });
    } catch {
      toast.error("No se pudo guardar el borrador");
    }
  };

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setErrors({});
    setStep(1);
    setConfirmChecked(false);
    setPublished(null);
    localStorage.removeItem(DRAFT_KEY);
  };

  /* -------- Publish -------- */
  const handlePublish = async () => {
    if (!confirmChecked) {
      toast.error("Debes confirmar que la información es correcta");
      return;
    }
    setPublishing(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        shortDesc: form.shortDesc.trim(),
        description: form.description.trim(),
        operation: form.operation,
        propertyType: form.propertyType,
        status: form.status || "DISPONIBLE",
        published: true,
        price: Number(form.price),
        currency: form.currency,
        adminFee: parseNumeric(form.adminFee),
        cityId: form.cityId,
        neighborhoodId: form.neighborhoodId || null,
        address: form.address.trim(),
        area: Number(form.area),
        builtArea: parseNumeric(form.builtArea),
        bedrooms: parseNumeric(form.bedrooms),
        bathrooms: parseNumeric(form.bathrooms),
        parking: parseNumeric(form.parking),
        stratum: parseNumeric(form.stratum),
        ageYears: parseNumeric(form.ageYears),
        floor: parseNumeric(form.floor),
        floorsTotal: parseNumeric(form.floorsTotal),
        furnished: form.furnished,
        petFriendly: form.petFriendly,
        amenities: form.amenities,
        images: form.images
          .filter((i) => !i.uploadError && !i.uploading && !i.url.startsWith("blob:"))
          .map((i) => ({
            url: i.url,
            caption: i.caption || "",
            isMain: i.isMain,
          })),
        agentName: form.agentName.trim(),
        agentPhone: form.agentPhone.trim(),
        agentEmail: form.agentEmail.trim(),
      };

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "No se pudo publicar");
      }
      setPublished({ code: json.code, id: json.id });
      localStorage.removeItem(DRAFT_KEY);
      toast.success("¡Inmueble publicado!", { description: json.code });
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      toast.error("Error al publicar", { description: msg });
    } finally {
      setPublishing(false);
    }
  };

  /* -------- Derived -------- */
  const selectedCity = useMemo(
    () => cities.find((c) => c.id === form.cityId) || null,
    [cities, form.cityId]
  );
  const selectedNeighborhood = useMemo(
    () => neighborhoods.find((n) => n.id === form.neighborhoodId) || null,
    [neighborhoods, form.neighborhoodId]
  );

  /* -------- Success screen -------- */
  if (published) {
    return (
      <div ref={containerRef} className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, type: "spring" }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
            className="mx-auto mb-6 grid size-24 place-items-center rounded-full bg-[#97A97C]/20"
          >
            <CheckCircle2 className="size-14 text-[#7A8B66]" />
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight text-[#3D3530]">
            ¡Inmueble publicado!
          </h1>
          <p className="mt-2 text-[#6B5D5A]">
            Tu inmueble ya está disponible en el portal. Comparte su código con tus clientes.
          </p>

          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="text-xs font-medium uppercase tracking-wider text-[#8B7E78]">
              Código generado
            </div>
            <PropertyCodeBadge code={published.code} variant="solid" className="text-base" />
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => openProperty(published.code)} size="lg">
              <Eye className="size-4" /> Ver inmueble publicado
            </Button>
            <Button onClick={resetForm} variant="outline" size="lg">
              <RotateCcw className="size-4" /> Publicar otro
            </Button>
            <Button onClick={() => setView("admin")} variant="ghost" size="lg">
              <Building2 className="size-4" /> Ir al panel
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* -------- Wizard shell -------- */
  return (
    <div ref={containerRef} className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => setView("admin")}
          className="mb-3 inline-flex items-center gap-1 text-sm text-[#8B7E78] transition-colors hover:text-[#3D3530]"
        >
          <ArrowLeft className="size-4" /> Volver
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-[#3D3530] sm:text-3xl">
          Publicar inmueble
        </h1>
        <p className="mt-1 text-sm text-[#8B7E78]">
          Asistente guiado · Paso {step} de 7
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <Progress value={(step / 7) * 100} className="h-2" />
        <div className="mt-3 -mx-1 overflow-x-auto pb-1">
          <div className="flex w-max gap-1 px-1">
            {STEPS.map((s) => {
              const isComplete = s.id < step;
              const isCurrent = s.id === step;
              return (
                <div
                  key={s.id}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    isComplete && "bg-[#F5EBE0] text-[#9A7558]",
                    isCurrent && "bg-[#B08968] text-white",
                    !isComplete && !isCurrent && "bg-[#F0EAE5] text-[#8B7E78]"
                  )}
                >
                  {isComplete ? (
                    <Check className="size-3" />
                  ) : (
                    <span className="size-3 grid place-items-center text-[10px] font-bold">
                      {s.id}
                    </span>
                  )}
                  <span className="whitespace-nowrap">{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step content with animated transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
        >
          {step === 1 && (
            <Step1Basic
              form={form}
              errors={errors}
              update={update}
              cities={cities}
              neighborhoods={neighborhoods}
              loadingLookups={loadingLookups}
            />
          )}
          {step === 2 && <Step2Images form={form} update={update} />}
          {step === 3 && (
            <Step3Features
              form={form}
              update={update}
              amenities={amenities}
              loading={loadingLookups}
            />
          )}
          {step === 4 && <Step4Description form={form} errors={errors} update={update} />}
          {step === 5 && <Step5Contact form={form} errors={errors} update={update} />}
          {step === 6 && (
            <Step6Preview
              form={form}
              selectedCity={selectedCity}
              selectedNeighborhood={selectedNeighborhood}
              onEdit={() => setStep(1)}
              onPublish={() => setStep(7)}
            />
          )}
          {step === 7 && (
            <Step7Publish
              form={form}
              selectedCity={selectedCity}
              selectedNeighborhood={selectedNeighborhood}
              confirmChecked={confirmChecked}
              setConfirmChecked={setConfirmChecked}
              publishing={publishing}
              onPublish={handlePublish}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom navigation */}
      <div className="sticky bottom-0 z-20 mt-8 -mx-4 border-t border-[#E8DFD9] bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-b-xl sm:border-x">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={step === 1}
            >
              <ChevronLeft className="size-4" /> Anterior
            </Button>
            <Button variant="ghost" onClick={saveDraft}>
              <Save className="size-4" /> Guardar borrador
            </Button>
          </div>

          {step < 7 ? (
            <Button onClick={handleNext}>
              Siguiente <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button
              onClick={handlePublish}
              disabled={!confirmChecked || publishing}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              size="lg"
            >
              {publishing ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Publicando…
                </>
              ) : (
                <>
                  <Send className="size-4" /> PUBLICAR INMUEBLE
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/*  Field error helper                                                          */
/* ========================================================================== */

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-medium text-[#C97A7A]">{message}</p>;
}

/* ========================================================================== */
/*  STEP 1: Información básica                                                  */
/* ========================================================================== */

function Step1Basic({
  form,
  errors,
  update,
  cities,
  neighborhoods,
  loadingLookups,
}: {
  form: WizardForm;
  errors: Record<string, string>;
  update: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
  cities: CityOption[];
  neighborhoods: NeighborhoodOption[];
  loadingLookups: boolean;
}) {
  return (
    <Card className="border-[#E8DFD9]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="size-5 text-[#B08968]" /> Información básica
        </CardTitle>
        <CardDescription>
          Los campos marcados con <span className="text-red-500">*</span> son obligatorios.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Operación */}
        <div data-field="operation">
          <Label className="mb-2 text-sm font-medium">
            Operación <span className="text-red-500">*</span>
          </Label>
          <RadioGroup
            value={form.operation}
            onValueChange={(v) => update("operation", v)}
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            {OPERATIONS.map((op) => (
              <Label
                key={op.value}
                htmlFor={`op-${op.value}`}
                className={cn(
                  "cursor-pointer rounded-xl border-2 p-4 transition-all",
                  form.operation === op.value
                    ? "border-[#C9A07A] bg-[#FAF3EC] shadow-sm"
                    : "border-[#E8DFD9] hover:border-[#D8CFC9]"
                )}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value={op.value} id={`op-${op.value}`} />
                  <div>
                    <div className="text-sm font-semibold text-[#3D3530]">{op.label}</div>
                    <div className="text-xs text-[#8B7E78]">
                      {op.value === "VENTA"
                        ? "Comprar propiedad"
                        : op.value === "ARRIENDO"
                        ? "Arrendamiento mensual"
                        : "Arriendo por días/semanas"}
                    </div>
                  </div>
                </div>
              </Label>
            ))}
          </RadioGroup>
          <FieldError message={errors.operation} />
        </div>

        {/* Tipo + Estrato */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div data-field="propertyType">
            <Label className="mb-2">
              Tipo de inmueble <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.propertyType}
              onValueChange={(v) => update("propertyType", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona…" />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="mr-1">{t.icon}</span> {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.propertyType} />
          </div>

          <div>
            <Label className="mb-2">Estrato</Label>
            <Select
              value={form.stratum}
              onValueChange={(v) => update("stratum", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sin estrato" />
              </SelectTrigger>
              <SelectContent>
                {STRATUM_OPTIONS.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    Estrato {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Ciudad + Barrio */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div data-field="cityId">
            <Label className="mb-2">
              Ciudad <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.cityId}
              onValueChange={(v) => {
                update("cityId", v);
                update("neighborhoodId", "");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={loadingLookups ? "Cargando…" : "Selecciona ciudad"}
                />
              </SelectTrigger>
              <SelectContent>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} · {c.stateName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.cityId} />
          </div>

          <div data-field="neighborhoodId">
            <Label className="mb-2">
              Barrio <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.neighborhoodId}
              onValueChange={(v) => update("neighborhoodId", v)}
              disabled={!form.cityId}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    !form.cityId
                      ? "Primero selecciona ciudad"
                      : neighborhoods.length === 0
                      ? "Sin barrios"
                      : "Selecciona barrio"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {neighborhoods.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.name} {n.zone ? `· ${n.zone}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.neighborhoodId} />
          </div>
        </div>

        {/* Dirección */}
        <div data-field="address">
          <Label className="mb-2" htmlFor="address">
            Dirección <span className="text-red-500">*</span>
          </Label>
          <Input
            id="address"
            placeholder="Ej: Cra. 43A #1-50, El Poblado"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
          />
          <FieldError message={errors.address} />
        </div>

        {/* Precio + Moneda */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_140px]">
          <div data-field="price">
            <Label className="mb-2" htmlFor="price">
              Precio <span className="text-red-500">*</span>
            </Label>
            <Input
              id="price"
              inputMode="numeric"
              placeholder="Ej: 450000000"
              value={form.price}
              onChange={(e) =>
                update("price", e.target.value.replace(/[^\d]/g, ""))
              }
            />
            {form.price && (
              <p className="mt-1 text-xs font-medium text-[#9A7558]">
                {formatPrice(Number(form.price), form.currency)} ·{" "}
                {formatPriceShort(Number(form.price), form.currency)}
              </p>
            )}
            <FieldError message={errors.price} />
          </div>
          <div>
            <Label className="mb-2">Moneda</Label>
            <Select
              value={form.currency}
              onValueChange={(v) => update("currency", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COP">COP (Pesos)</SelectItem>
                <SelectItem value="USD">USD (Dólares)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Área construida */}
        <div data-field="area" className="max-w-xs">
          <Label className="mb-2" htmlFor="area">
            Área construida (m²) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="area"
            type="number"
            min={0}
            placeholder="Ej: 92"
            value={form.area}
            onChange={(e) => update("area", e.target.value)}
          />
          {form.area && (
            <p className="mt-1 text-xs text-[#8B7E78]">{formatArea(Number(form.area))}</p>
          )}
          <FieldError message={errors.area} />
        </div>

        <Separator />

        {/* Habitaciones / Baños / Parqueaderos */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label className="mb-2">Habitaciones</Label>
            <Select
              value={form.bedrooms}
              onValueChange={(v) => update("bedrooms", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 11 }, (_, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2">Baños</Label>
            <Select
              value={form.bathrooms}
              onValueChange={(v) => update("bathrooms", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 11 }, (_, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2">Parqueaderos</Label>
            <Select
              value={form.parking}
              onValueChange={(v) => update("parking", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 11 }, (_, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ========================================================================== */
/*  STEP 2: Imágenes                                                            */
/* ========================================================================== */

function Step2Images({
  form,
  update,
}: {
  form: WizardForm;
  update: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) {
      toast.error("Solo se permiten imágenes");
      return;
    }
    // Verificar límite contra estado actual
    const currentImages = form.images;
    const remaining = 20 - currentImages.length;
    if (remaining <= 0) {
      toast.error("Límite alcanzado", { description: "Máximo 20 imágenes." });
      return;
    }
    const toAdd = arr.slice(0, remaining);

    // Generar IDs y URLs blob temporales para preview inmediato
    const placeholders: WizardImage[] = toAdd.map((file, i) => ({
      id: genId(),
      url: URL.createObjectURL(file),
      caption: "",
      isMain: currentImages.length === 0 && i === 0,
      uploading: true,
    }));
    update("images", [...currentImages, ...placeholders]);
    toast.info(`Subiendo ${toAdd.length} imagen${toAdd.length > 1 ? "es" : ""}...`);

    // Subir cada imagen al backend (que la procesa con sharp + sube a Supabase)
    let successCount = 0;
    await Promise.all(
      placeholders.map(async (placeholder, idx) => {
        const file = toAdd[idx];
        try {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP ${res.status}`);
          }
          const data = await res.json();

          // Revocar blob URL temporal y reemplazar con URL real de Supabase
          URL.revokeObjectURL(placeholder.url);

          setForm((f) => ({
            ...f,
            images: f.images.map((img) =>
              img.id === placeholder.id
                ? {
                    ...img,
                    url: data.url,
                    variants: data.variants,
                    paths: data.paths,
                    uploading: false,
                    uploadError: undefined,
                  }
                : img
            ),
          }));
          successCount++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Error subiendo imagen";
          console.error("Upload error:", msg);
          setForm((f) => ({
            ...f,
            images: f.images.map((img) =>
              img.id === placeholder.id
                ? { ...img, uploading: false, uploadError: msg }
                : img
            ),
          }));
          toast.error(`Falló una imagen: ${msg}`);
        }
      })
    );

    if (successCount > 0) {
      toast.success(
        `${successCount} imagen${successCount > 1 ? "es" : ""} subida${successCount > 1 ? "s" : ""} a Supabase`
      );
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const removeImage = async (id: string) => {
    const img = form.images.find((i) => i.id === id);
    if (img && img.url.startsWith("blob:")) URL.revokeObjectURL(img.url);
    // Si la imagen ya está subida a Supabase, borrarla del Storage también
    if (img?.paths && img.paths.length > 0) {
      try {
        await fetch(
          `/api/upload?paths=${encodeURIComponent(img.paths.join(","))}`,
          { method: "DELETE" }
        );
      } catch (err) {
        console.warn("No se pudo borrar del Storage:", err);
      }
    }
    const next = form.images.filter((i) => i.id !== id);
    // Ensure one image is main
    if (next.length > 0 && !next.some((i) => i.isMain)) {
      next[0].isMain = true;
    }
    update("images", next);
  };

  const setMain = (id: string) => {
    update(
      "images",
      form.images.map((i) => ({ ...i, isMain: i.id === id }))
    );
  };

  const updateCaption = (id: string, caption: string) => {
    update(
      "images",
      form.images.map((i) => (i.id === id ? { ...i, caption } : i))
    );
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = form.images.findIndex((i) => i.id === active.id);
    const newIndex = form.images.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    update("images", arrayMove(form.images, oldIndex, newIndex));
  };

  return (
    <Card className="border-[#E8DFD9]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ImageIcon className="size-5 text-[#B08968]" /> Imágenes del inmueble
        </CardTitle>
        <CardDescription>
          Mínimo 1 imagen. La primera o la marcada como Principal será la foto principal del anuncio.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
            dragOver
              ? "border-[#C9A07A] bg-[#FAF3EC]"
              : "border-[#D8CFC9] bg-[#FAF6F3] hover:border-[#E0B589] hover:bg-[#FAF3EC]/40"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <div className="grid size-12 place-items-center rounded-full bg-white shadow-sm">
            <ImagePlus className="size-6 text-[#B08968]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[#3D3530]">
              Arrastra tus fotos o haz clic para subir
            </div>
            <div className="mt-0.5 text-xs text-[#8B7E78]">
              JPG, PNG, WebP · hasta 20 imágenes · {form.images.length}/20
            </div>
          </div>
        </div>

        {/* Image grid */}
        {form.images.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={form.images.map((i) => i.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {form.images.map((img, idx) => (
                  <SortableImage
                    key={img.id}
                    image={img}
                    index={idx}
                    onRemove={removeImage}
                    onSetMain={setMain}
                    onCaption={updateCaption}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#8B7E78]">
            <Badge
              variant="outline"
              className={cn(
                "border-[#E8DFD9]",
                form.images.length >= 1
                  ? "bg-emerald-50 text-[#7A8B66]"
                  : "bg-[#FAF0E0] text-[#B89164]"
              )}
            >
              {form.images.length} imagen{form.images.length !== 1 ? "es" : ""}
            </Badge>
            <span>Arrastra para reordenar · marca una como principal</span>
          </div>
          {form.images.length > 0 && form.images.length < 20 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="size-4" /> Añadir más imágenes
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SortableImage({
  image,
  index,
  onRemove,
  onSetMain,
  onCaption,
}: {
  image: WizardImage;
  index: number;
  onRemove: (id: string) => void;
  onSetMain: (id: string) => void;
  onCaption: (id: string, caption: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative overflow-hidden rounded-lg border border-[#E8DFD9] bg-white"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[#F0EAE5]">
        <img
          src={image.url}
          alt={image.caption || `Imagen ${index + 1}`}
          className={cn(
            "h-full w-full object-cover transition-opacity",
            image.uploading && "opacity-40",
            image.uploadError && "opacity-30 grayscale"
          )}
        />
        {/* Overlay: subiendo a Supabase */}
        {image.uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#3D3530]/30">
            <Loader2 className="size-6 animate-spin text-white" />
            <span className="rounded-full bg-[#3D3530]/80 px-2 py-0.5 text-[10px] font-medium text-white">
              Subiendo a Supabase...
            </span>
          </div>
        )}
        {/* Overlay: error de subida */}
        {image.uploadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-900/50 p-2 text-center">
            <span className="text-xs font-semibold text-white">Falló</span>
            <span className="line-clamp-2 text-[10px] text-white/80">
              {image.uploadError}
            </span>
          </div>
        )}
        {/* Top overlay: drag handle + main badge + remove */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/60 to-transparent p-1.5">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab rounded bg-white/80 p-1 text-[#5A4E4B] active:cursor-grabbing disabled:opacity-50"
            title="Arrastrar para reordenar"
            onClick={(e) => e.stopPropagation()}
            disabled={image.uploading}
          >
            <GripVertical className="size-3.5" />
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onSetMain(image.id)}
              title={image.isMain ? "Foto principal" : "Marcar como principal"}
              disabled={image.uploading || !!image.uploadError}
              className={cn(
                "rounded p-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                image.isMain
                  ? "bg-amber-400 text-amber-950"
                  : "bg-white/80 text-[#6B5D5A] hover:bg-[#E0B589]/20 hover:text-[#B89164]"
              )}
            >
              <Star className={cn("size-3.5", image.isMain && "fill-current")} />
            </button>
            <button
              onClick={() => onRemove(image.id)}
              title="Eliminar"
              className="rounded bg-white/80 p-1 text-[#6B5D5A] hover:bg-[#C97A7A]/20 hover:text-[#C97A7A]"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
        {image.isMain && (
          <div className="absolute bottom-0 left-0 right-0 bg-amber-400/95 px-2 py-0.5 text-center text-[10px] font-bold uppercase tracking-wide text-amber-950">
            Principal
          </div>
        )}
      </div>
      <Input
        placeholder="Descripción (opcional)"
        value={image.caption}
        onChange={(e) => onCaption(image.id, e.target.value)}
        className="h-8 rounded-none border-0 border-t text-xs"
      />
    </div>
  );
}

/* ========================================================================== */
/*  STEP 3: Características                                                     */
/* ========================================================================== */

function Step3Features({
  form,
  update,
  amenities,
  loading,
}: {
  form: WizardForm;
  update: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
  amenities: AmenityOption[];
  loading: boolean;
}) {
  const grouped = useMemo(() => {
    const groups: Record<string, AmenityOption[]> = {};
    for (const a of amenities) {
      const k = a.category || "general";
      if (!groups[k]) groups[k] = [];
      groups[k].push(a);
    }
    return groups;
  }, [amenities]);

  const CATEGORY_LABELS: Record<string, string> = {
    general: "Generales",
    security: "Seguridad",
    services: "Servicios",
  };

  const toggleAmenity = (slug: string) => {
    const has = form.amenities.includes(slug);
    update(
      "amenities",
      has ? form.amenities.filter((s) => s !== slug) : [...form.amenities, slug]
    );
  };

  return (
    <Card className="border-[#E8DFD9]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ListChecks className="size-5 text-[#B08968]" /> Características y amenities
        </CardTitle>
        <CardDescription>
          Selecciona las características que aplican al inmueble.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Amenities grouped */}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[#8B7E78]">
            <Loader2 className="size-4 animate-spin" /> Cargando características…
          </div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8B7E78]">
                {CATEGORY_LABELS[cat] || cat}
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {items.map((a) => {
                  const checked = form.amenities.includes(a.slug);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAmenity(a.slug)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-2.5 text-left text-sm transition-all",
                        checked
                          ? "border-[#C9A07A] bg-[#FAF3EC] text-blue-900"
                          : "border-[#E8DFD9] hover:border-[#D8CFC9] hover:bg-[#FAF6F3]"
                      )}
                    >
                      <Checkbox checked={checked} className="pointer-events-none" />
                      <AmenityIcon
                        slug={a.slug}
                        className={cn(
                          "size-4 shrink-0",
                          checked ? "text-[#B08968]" : "text-[#A89B96]"
                        )}
                      />
                      <span className="truncate">{a.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}

        <Separator />

        {/* Switches */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border border-[#E8DFD9] p-3">
            <div>
              <div className="text-sm font-medium">Amoblado</div>
              <div className="text-xs text-[#8B7E78]">¿El inmueble viene amoblado?</div>
            </div>
            <Switch
              checked={form.furnished}
              onCheckedChange={(v) => update("furnished", v)}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[#E8DFD9] p-3">
            <div>
              <div className="text-sm font-medium">Pet friendly</div>
              <div className="text-xs text-[#8B7E78]">¿Permite mascotas?</div>
            </div>
            <Switch
              checked={form.petFriendly}
              onCheckedChange={(v) => update("petFriendly", v)}
            />
          </div>
        </div>

        <Separator />

        {/* Numeric details */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label className="mb-2">Piso #</Label>
            <Input
              type="number"
              min={0}
              placeholder="Ej: 5"
              value={form.floor}
              onChange={(e) => update("floor", e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-2">Total pisos</Label>
            <Input
              type="number"
              min={0}
              placeholder="Ej: 12"
              value={form.floorsTotal}
              onChange={(e) => update("floorsTotal", e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-2">Antigüedad (años)</Label>
            <Input
              type="number"
              min={0}
              placeholder="Ej: 5"
              value={form.ageYears}
              onChange={(e) => update("ageYears", e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-2">Área privada (m²)</Label>
            <Input
              type="number"
              min={0}
              placeholder="Ej: 80"
              value={form.builtArea}
              onChange={(e) => update("builtArea", e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-2">Administración ($)</Label>
            <Input
              type="number"
              min={0}
              placeholder="Ej: 350000"
              value={form.adminFee}
              onChange={(e) => update("adminFee", e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-2">Estado</Label>
            <Select
              value={form.status}
              onValueChange={(v) => update("status", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DISPONIBLE">Disponible</SelectItem>
                <SelectItem value="RESERVADO">Reservado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ========================================================================== */
/*  STEP 4: Descripción                                                         */
/* ========================================================================== */

function Step4Description({
  form,
  errors,
  update,
}: {
  form: WizardForm;
  errors: Record<string, string>;
  update: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
}) {
  return (
    <Card className="border-[#E8DFD9]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="size-5 text-[#B08968]" /> Descripción del anuncio
        </CardTitle>
        <CardDescription>
          Textos que aparecerán en la tarjeta y detalle del inmueble.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div data-field="title">
          <div className="flex items-center justify-between">
            <Label className="mb-2" htmlFor="title">
              Título del anuncio <span className="text-red-500">*</span>
            </Label>
            <span
              className={cn(
                "text-xs",
                form.title.length > 100 ? "text-[#C97A7A]" : "text-[#A89B96]"
              )}
            >
              {form.title.length}/100
            </span>
          </div>
          <Input
            id="title"
            maxLength={120}
            placeholder="Ej: Hermoso apartamento en El Poblado con vista a la ciudad"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
          />
          <FieldError message={errors.title} />
        </div>

        <div data-field="shortDesc">
          <div className="flex items-center justify-between">
            <Label className="mb-2" htmlFor="shortDesc">
              Descripción corta <span className="text-red-500">*</span>
            </Label>
            <span
              className={cn(
                "text-xs",
                form.shortDesc.length > 160 ? "text-[#C97A7A]" : "text-[#A89B96]"
              )}
            >
              {form.shortDesc.length}/160
            </span>
          </div>
          <Input
            id="shortDesc"
            maxLength={180}
            placeholder="Ej: Apartamento de 92m², 3 hab, 2 baños, con vista panorámica."
            value={form.shortDesc}
            onChange={(e) => update("shortDesc", e.target.value)}
          />
          <p className="mt-1 text-xs text-[#8B7E78]">
            Se usa en las tarjetas y resultados de búsqueda (SEO).
          </p>
          <FieldError message={errors.shortDesc} />
        </div>

        <div data-field="description">
          <div className="flex items-center justify-between">
            <Label className="mb-2" htmlFor="description">
              Descripción larga <span className="text-red-500">*</span>
            </Label>
            <span
              className={cn(
                "text-xs",
                form.description.length > 3000 ? "text-[#C97A7A]" : "text-[#A89B96]"
              )}
            >
              {form.description.length}/3000
            </span>
          </div>
          <Textarea
            id="description"
            rows={8}
            maxLength={3200}
            placeholder="Describe el inmueble, ubicación, características especiales, cercanías, transporte público, etc."
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
          <p className="mt-1 text-xs text-[#8B7E78]">
            Recomendado: mínimo 100 caracteres. Detalla ubicación, características y cercanías.
          </p>
          <FieldError message={errors.description} />
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-[#FAF3EC]/60 p-3 text-xs text-[#8A6549]">
          <Sparkles className="mt-0.5 size-3.5 shrink-0" />
          <span>
            El slug (URL) y los meta-tags SEO se generarán automáticamente al publicar.
            No necesitas preocuparte por ellos.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ========================================================================== */
/*  STEP 5: Contacto                                                            */
/* ========================================================================== */

function Step5Contact({
  form,
  errors,
  update,
}: {
  form: WizardForm;
  errors: Record<string, string>;
  update: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
}) {
  return (
    <Card className="border-[#E8DFD9]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="size-5 text-[#B08968]" /> Información de contacto
        </CardTitle>
        <CardDescription>
          Estos datos se mostrarán en el detalle del inmueble para que los clientes te contacten.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div data-field="agentName">
          <Label className="mb-2" htmlFor="agentName">
            Nombre del asesor <span className="text-red-500">*</span>
          </Label>
          <Input
            id="agentName"
            placeholder="Ej: Carlos Marín"
            value={form.agentName}
            onChange={(e) => update("agentName", e.target.value)}
          />
          <FieldError message={errors.agentName} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div data-field="agentPhone">
            <Label className="mb-2" htmlFor="agentPhone">
              Teléfono <span className="text-red-500">*</span>
            </Label>
            <Input
              id="agentPhone"
              inputMode="tel"
              placeholder="Ej: +57 300 123 4567"
              value={form.agentPhone}
              onChange={(e) => update("agentPhone", e.target.value)}
            />
            <FieldError message={errors.agentPhone} />
          </div>
          <div>
            <Label className="mb-2" htmlFor="agentWhatsapp">
              WhatsApp <span className="text-[#A89B96]">(opcional)</span>
            </Label>
            <Input
              id="agentWhatsapp"
              inputMode="tel"
              placeholder="Por defecto igual al teléfono"
              value={form.agentWhatsapp}
              onChange={(e) => update("agentWhatsapp", e.target.value)}
            />
          </div>
        </div>

        <div data-field="agentEmail">
          <Label className="mb-2" htmlFor="agentEmail">
            Correo electrónico <span className="text-red-500">*</span>
          </Label>
          <Input
            id="agentEmail"
            type="email"
            placeholder="Ej: carlos.marin@innovarshowrooms.co"
            value={form.agentEmail}
            onChange={(e) => update("agentEmail", e.target.value)}
          />
          <FieldError message={errors.agentEmail} />
        </div>
      </CardContent>
    </Card>
  );
}

/* ========================================================================== */
/*  STEP 6: Vista previa                                                        */
/* ========================================================================== */

function Step6Preview({
  form,
  selectedCity,
  selectedNeighborhood,
  onEdit,
  onPublish,
}: {
  form: WizardForm;
  selectedCity: CityOption | null;
  selectedNeighborhood: NeighborhoodOption | null;
  onEdit: () => void;
  onPublish: () => void;
}) {
  const mainImage = form.images.find((i) => i.isMain) || form.images[0];
  const opLabel = OPERATION_LABELS[form.operation] || form.operation;
  const typeLabel = PROPERTY_TYPE_LABELS[form.propertyType] || form.propertyType;

  return (
    <div className="space-y-4">
      <Card className="border-[#E8DFD9]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="size-5 text-[#B08968]" /> Vista previa del anuncio
          </CardTitle>
          <CardDescription>
            Así se verá tu anuncio. El código único se generará automáticamente al publicar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Preview card mimicking the live card */}
          <div className="overflow-hidden rounded-xl border border-[#E8DFD9] bg-white">
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F0EAE5]">
              {mainImage ? (
                <img
                  src={mainImage.url}
                  alt={form.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-[#A89B96]">
                  <Maximize className="h-12 w-12" />
                </div>
              )}
              <div className="absolute left-3 top-3 flex gap-1.5">
                <span className="rounded-md border border-[#97A97C]/30 bg-[#97A97C]/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#7A8B66]">
                  {opLabel}
                </span>
                {form.status === "RESERVADO" && (
                  <span className="rounded-md border border-[#E0B589]/30 bg-[#E0B589]/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#B89164]">
                    Reservado
                  </span>
                )}
              </div>
              <div className="absolute right-3 top-3">
                <div className="inline-flex items-center gap-1.5 rounded-md border border-white bg-white/95 px-2 py-1 text-xs font-mono font-semibold tracking-wide text-[#5A4E4B] shadow-sm">
                  <Hash className="h-3 w-3 opacity-70" />
                  INV-2026-XXX-######
                </div>
              </div>
              <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-lg bg-[#3D3530]/80 px-3 py-1.5 text-white backdrop-blur-sm">
                <span className="flex items-center gap-1 text-xs font-medium">
                  <BedDouble className="h-3.5 w-3.5" /> {form.bedrooms || "—"}
                </span>
                <span className="flex items-center gap-1 text-xs font-medium">
                  <Bath className="h-3.5 w-3.5" /> {form.bathrooms || "—"}
                </span>
                <span className="flex items-center gap-1 text-xs font-medium">
                  <Car className="h-3.5 w-3.5" /> {form.parking || "—"}
                </span>
                <span className="flex items-center gap-1 text-xs font-medium">
                  <Maximize className="h-3.5 w-3.5" /> {form.area ? formatArea(Number(form.area)) : "—"}
                </span>
              </div>
            </div>

            <div className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xl font-bold tracking-tight text-[#3D3530]">
                    {form.price ? formatPrice(Number(form.price), form.currency) : "$ —"}
                  </div>
                  <div className="text-xs font-medium text-[#8B7E78]">
                    {typeLabel}
                    {form.stratum ? ` · Estrato ${form.stratum}` : ""}
                    {form.furnished ? " · Amoblado" : ""}
                    {form.petFriendly ? " · Pet friendly" : ""}
                  </div>
                </div>
              </div>

              <h3 className="text-[15px] font-semibold leading-snug text-[#3D3530]">
                {form.title || "Sin título"}
              </h3>

              <div className="flex items-center gap-1 text-xs text-[#8B7E78]">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {[
                    selectedNeighborhood?.name,
                    selectedCity?.name,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Sin ubicación"}
                </span>
              </div>

              {form.shortDesc && (
                <p className="text-sm text-[#6B5D5A]">{form.shortDesc}</p>
              )}

              {form.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {form.amenities.slice(0, 6).map((slug) => (
                    <span
                      key={slug}
                      className="inline-flex items-center gap-1 rounded-full bg-[#FAF3EC] px-2 py-0.5 text-[11px] font-medium text-[#9A7558]"
                    >
                      <AmenityIcon slug={slug} className="h-3 w-3" />
                      {amenityLabel(slug)}
                    </span>
                  ))}
                  {form.amenities.length > 6 && (
                    <span className="rounded-full bg-[#F0EAE5] px-2 py-0.5 text-[11px] font-medium text-[#8B7E78]">
                      +{form.amenities.length - 6}
                    </span>
                  )}
                </div>
              )}

              <Separator />

              {/* Agent info */}
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-[#B08968] text-sm font-bold text-white">
                  {form.agentName.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[#3D3530]">
                    {form.agentName || "Asesor"}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#8B7E78]">
                    {form.agentPhone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {form.agentPhone}
                      </span>
                    )}
                    {form.agentEmail && (
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3" /> {form.agentEmail}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onEdit}>
              <Pencil className="size-4" /> Editar
            </Button>
            <Button onClick={onPublish}>
              <Send className="size-4" /> Publicar inmueble
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ========================================================================== */
/*  STEP 7: Publicación                                                         */
/* ========================================================================== */

function Step7Publish({
  form,
  selectedCity,
  selectedNeighborhood,
  confirmChecked,
  setConfirmChecked,
  publishing,
  onPublish,
}: {
  form: WizardForm;
  selectedCity: CityOption | null;
  selectedNeighborhood: NeighborhoodOption | null;
  confirmChecked: boolean;
  setConfirmChecked: (v: boolean) => void;
  publishing: boolean;
  onPublish: () => void;
}) {
  const rows: { label: string; value: string }[] = [
    { label: "Operación", value: OPERATION_LABELS[form.operation] || form.operation || "—" },
    { label: "Tipo", value: PROPERTY_TYPE_LABELS[form.propertyType] || form.propertyType || "—" },
    { label: "Ciudad", value: selectedCity?.name || "—" },
    { label: "Barrio", value: selectedNeighborhood?.name || "—" },
    { label: "Dirección", value: form.address || "—" },
    {
      label: "Precio",
      value: form.price ? formatPrice(Number(form.price), form.currency) : "—",
    },
    { label: "Área", value: form.area ? formatArea(Number(form.area)) : "—" },
    {
      label: "Hab / Baños / Parqueo",
      value: `${form.bedrooms || 0} / ${form.bathrooms || 0} / ${form.parking || 0}`,
    },
    { label: "Estrato", value: form.stratum || "—" },
    { label: "Estado", value: form.status === "RESERVADO" ? "Reservado" : "Disponible" },
    { label: "Amoblado", value: form.furnished ? "Sí" : "No" },
    { label: "Pet friendly", value: form.petFriendly ? "Sí" : "No" },
    { label: "Imágenes", value: `${form.images.length}` },
    { label: "Amenities", value: `${form.amenities.length}` },
    { label: "Título", value: form.title || "—" },
    { label: "Asesor", value: form.agentName || "—" },
  ];

  return (
    <Card className="border-[#E8DFD9]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Send className="size-5 text-[#7A8B66]" /> Revisión final
        </CardTitle>
        <CardDescription>
          Confirma que toda la información es correcta antes de publicar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Summary checklist */}
        <div className="overflow-hidden rounded-lg border border-[#E8DFD9]">
          <div className="grid grid-cols-1 divide-y divide-[#F0EAE5] sm:grid-cols-2 sm:divide-y-0">
            {rows.map((r, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start justify-between gap-3 px-4 py-2.5 text-sm",
                  i % 2 === 0 ? "sm:bg-[#FAF6F3]/40" : ""
                )}
              >
                <span className="text-[#8B7E78]">{r.label}</span>
                <span className="text-right font-medium text-[#3D3530]">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Preview main image */}
        {form.images.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-[#E8DFD9] p-3">
            <img
              src={(form.images.find((i) => i.isMain) || form.images[0]).url}
              alt="Principal"
              className="size-16 rounded-md object-cover"
            />
            <div className="text-sm text-[#6B5D5A]">
              Foto principal lista. {form.images.length} imagen(es) en total.
            </div>
          </div>
        )}

        <Separator />

        {/* Confirmation */}
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#E8DFD9] p-4 transition-colors hover:bg-[#FAF6F3]">
          <Checkbox
            checked={confirmChecked}
            onCheckedChange={(v) => setConfirmChecked(v === true)}
            className="mt-0.5"
          />
          <span className="text-sm text-[#5A4E4B]">
            Confirmo que la información es correcta y autorizo la publicación de este inmueble
            en el portal Innovar Showrooms.
          </span>
        </label>

        <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-[#FAF0E0]/60 p-3 text-xs text-[#A8814E]">
          <Sparkles className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Al publicar, el sistema generará automáticamente el código único
            <span className="font-mono"> INV-2026-XXX-######</span> y el slug de la URL.
          </span>
        </div>

        <Button
          onClick={onPublish}
          disabled={!confirmChecked || publishing}
          className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
          size="lg"
        >
          {publishing ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Publicando…
            </>
          ) : (
            <>
              <Send className="size-4" /> PUBLICAR INMUEBLE
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
