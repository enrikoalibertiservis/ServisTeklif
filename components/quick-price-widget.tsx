"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  getBrands, getModelsByBrand, getSubModelsByModel,
  getMaintenancePeriods, getServiceTypes,
} from "@/app/actions/vehicle"
import { previewTemplatePrice } from "@/app/actions/quote"
import {
  Zap, Shield, Gauge, Wrench, Car, ChevronRight, ChevronDown,
  Loader2, RotateCcw, PlusCircle, Package,
} from "lucide-react"
import Link from "next/link"

const fmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n)

const SERVICE_TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  NORMAL: { label: "Normal Bakım", color: "border-blue-500 bg-blue-50 text-blue-700",    icon: Gauge  },
  HIZLI:  { label: "Hızlı Servis", color: "border-green-500 bg-green-50 text-green-700", icon: Zap   },
}

type PreviewResult = Awaited<ReturnType<typeof previewTemplatePrice>>

interface QuickPriceWidgetProps {
  onActiveChange?: (active: boolean) => void
}

export function QuickPriceWidget({ onActiveChange }: QuickPriceWidgetProps = {}) {
  const [brands, setBrands]         = useState<any[]>([])
  const [models, setModels]         = useState<any[]>([])
  const [subModels, setSubModels]   = useState<any[]>([])
  const [periods, setPeriods]       = useState<any[]>([])
  const [serviceTypes, setServiceTypes] = useState<any[]>([])

  const [brandId, setBrandId]           = useState("")
  const [modelId, setModelId]           = useState("")
  const [subModelId, setSubModelId]     = useState("")
  const [selectedPeriodKm, setSelectedPeriodKm] = useState<number | null>(null)
  const [templateId, setTemplateId]     = useState("")

  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<PreviewResult | null>(null)
  const [error, setError]       = useState("")

  const [partsOpen, setPartsOpen]   = useState(false)
  const [laborOpen, setLaborOpen]   = useState(false)

  // Dışarıya aktif/pasif durumu bildir
  useEffect(() => {
    onActiveChange?.(!!brandId)
  }, [brandId, onActiveChange])

  // Markalar
  useEffect(() => { getBrands().then(setBrands) }, [])

  // Modeller
  useEffect(() => {
    if (!brandId) return
    getModelsByBrand(brandId).then(setModels)
    setModelId(""); setSubModelId(""); setSelectedPeriodKm(null); setTemplateId("")
    setSubModels([]); setPeriods([]); setServiceTypes([]); setResult(null)
  }, [brandId])

  // Alt modeller
  useEffect(() => {
    if (!modelId) return
    getSubModelsByModel(modelId).then(setSubModels)
    setSubModelId(""); setSelectedPeriodKm(null); setTemplateId("")
    setPeriods([]); setServiceTypes([]); setResult(null)
  }, [modelId])

  // Periyotlar
  useEffect(() => {
    if (!brandId || !modelId) return
    if (subModels.length > 0 && !subModelId) {
      setPeriods([]); setSelectedPeriodKm(null); setTemplateId(""); setServiceTypes([]); return
    }
    getMaintenancePeriods(brandId, modelId, subModelId || undefined).then(setPeriods)
    setSelectedPeriodKm(null); setTemplateId(""); setServiceTypes([]); setResult(null)
  }, [brandId, modelId, subModelId, subModels])

  // Servis tipleri
  useEffect(() => {
    if (selectedPeriodKm === null || !brandId || !modelId) {
      setServiceTypes([]); setTemplateId(""); return
    }
    getServiceTypes(brandId, modelId, subModelId || undefined, selectedPeriodKm).then((types) => {
      setServiceTypes(types)
      setTemplateId(types.length === 1 ? types[0].id : "")
    })
    setResult(null)
  }, [selectedPeriodKm, brandId, modelId, subModelId])

  // Şablon seçilince otomatik fiyat hesapla
  useEffect(() => {
    if (!templateId || !brandId) { setResult(null); return }
    setLoading(true); setError("")
    previewTemplatePrice(templateId, brandId)
      .then(setResult)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [templateId, brandId])

  function reset() {
    setBrandId(""); setModelId(""); setSubModelId("")
    setSelectedPeriodKm(null); setTemplateId("")
    setModels([]); setSubModels([]); setPeriods([]); setServiceTypes([])
    setResult(null); setError("")
  }

  const regularPeriods = periods.filter(p => p.periodKm !== 0)
  const hizliServis    = periods.find(p => p.periodKm === 0)

  // Araç etiketi
  const selectedBrand    = brands.find(b => b.id === brandId)
  const selectedModel    = models.find(m => m.id === modelId)
  const selectedSubModel = subModels.find(s => s.id === subModelId)

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-emerald-500 bg-white shadow-md shadow-emerald-100">
      {/* Başlık */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-200 bg-emerald-50/60">
        <div className="flex items-center gap-2.5">
          <Zap className="h-5 w-5 text-emerald-600" />
          <div>
            <h2 className="text-2xl font-bold text-emerald-900">Hızlı Fiyat Sorgula</h2>
            <p className="text-xs text-emerald-700/60">Teklif oluşturmadan anlık bakım fiyatı görün.</p>
          </div>
        </div>
        {(brandId || result) && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white/80 hover:bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Sıfırla
          </button>
        )}
      </div>

      {/* İçerik alanı */}
      <div className="p-5 space-y-4">
        {/* Araç Seçimi */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Select value={brandId} onValueChange={setBrandId}>
            <SelectTrigger className="border-slate-400 bg-slate-50 shadow-sm">
              <SelectValue placeholder="Marka seçin" />
            </SelectTrigger>
            <SelectContent>
              {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={modelId} onValueChange={setModelId} disabled={!brandId}>
            <SelectTrigger className="border-slate-400 bg-slate-50 shadow-sm">
              <SelectValue placeholder={brandId ? "Model seçin" : "Önce marka"} />
            </SelectTrigger>
            <SelectContent>
              {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select
            value={subModelId}
            onValueChange={setSubModelId}
            disabled={!modelId || subModels.length === 0}
          >
            <SelectTrigger className="border-slate-400 bg-slate-50 shadow-sm">
              <SelectValue placeholder={
                !modelId ? "Önce model" :
                subModels.length === 0 ? "Alt model yok" :
                "Alt model seçin"
              } />
            </SelectTrigger>
            <SelectContent>
              {subModels.map(sm => <SelectItem key={sm.id} value={sm.id}>{sm.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Periyot butonları */}
        {periods.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bakım Periyodu</p>
            <div className="flex flex-wrap gap-2">
              {hizliServis && (
                <button
                  onClick={() => setSelectedPeriodKm(selectedPeriodKm === 0 ? null : 0)}
                  className={`px-3 py-1.5 rounded-md border-2 text-sm font-medium transition-all flex items-center gap-1.5 ${
                    selectedPeriodKm === 0
                      ? "border-green-600 bg-green-500 text-white shadow-sm shadow-green-200"
                      : "border-green-300 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-500"
                  }`}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Hızlı Servis
                </button>
              )}
              {regularPeriods.map(p => (
                <button
                  key={p.periodKm}
                  onClick={() => setSelectedPeriodKm(selectedPeriodKm === p.periodKm ? null : p.periodKm)}
                  className={`px-3 py-1.5 rounded-md border-2 text-sm font-medium transition-all ${
                    selectedPeriodKm === p.periodKm
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-white hover:border-primary/40"
                  }`}
                >
                  {p.periodKm.toLocaleString("tr-TR")} km
                  {p.periodMonth ? <span className="text-xs opacity-60 ml-1">/ {p.periodMonth}ay</span> : null}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Servis tipi */}
        {serviceTypes.length > 1 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Servis Tipi</p>
            <div className="flex flex-wrap gap-2">
              {serviceTypes.filter(st => st.serviceType !== "AGIR").map(st => {
                const cfg = SERVICE_TYPE_CONFIG[st.serviceType || ""] || { label: st.name || st.serviceType, color: "border-gray-300 bg-white", icon: Wrench }
                const Icon = cfg.icon
                return (
                  <button
                    key={st.id}
                    onClick={() => setTemplateId(templateId === st.id ? "" : st.id)}
                    className={`px-3 py-1.5 rounded-md border-2 text-sm font-medium transition-all flex items-center gap-1.5 ${
                      templateId === st.id ? cfg.color : "border-border bg-white hover:border-primary/40"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Yükleniyor */}
        {loading && (
          <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Fiyatlar hesaplanıyor…</span>
          </div>
        )}

        {/* Hata */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
        )}

        {/* Sonuç */}
        {result && !loading && (() => {
          const partItems = result.items.filter(i => i.itemType === "PART")
          const laborItems = result.items.filter(i => i.itemType === "LABOR")
          return (
            <div className="space-y-3">
              {/* Parçalar */}
              {partItems.length > 0 && (
                <div className="rounded-lg border border-cyan-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setPartsOpen(o => !o)}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-cyan-50 border-b-2 border-cyan-200 cursor-pointer hover:bg-cyan-100/60 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <ChevronDown className={`h-4 w-4 text-cyan-500 transition-transform ${partsOpen ? "rotate-0" : "-rotate-90"}`} />
                      <Package className="h-4 w-4 text-cyan-600" />
                      <span className="text-sm font-bold text-cyan-800 uppercase tracking-wide">Parçalar</span>
                      <span className="text-xs text-cyan-500 font-medium ml-1">({partItems.length})</span>
                    </div>
                    <span className="text-sm font-bold text-cyan-700 tabular-nums">{fmt(result.partsSubtotal)}</span>
                  </button>
                  {partsOpen && partItems.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 px-0 py-2 text-sm border-b last:border-0 ${
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"
                      }`}
                    >
                      <div className="w-1 self-stretch rounded-r bg-cyan-400 shrink-0" />
                      <span className="text-[11px] text-slate-400 font-mono w-5 text-right shrink-0">{idx + 1}</span>
                      <div className="flex-1 min-w-0 pr-1">
                        <span className="block truncate font-medium text-slate-800">{item.name}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-mono text-slate-400">{item.referenceCode}</span>
                          {item.quantity > 1 && (
                            <span className="inline-flex items-center rounded bg-cyan-100 text-cyan-700 text-[10px] font-bold px-1.5 py-0">
                              ×{item.quantity}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-semibold text-slate-900 tabular-nums pr-3 shrink-0">{fmt(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* İşçilik */}
              {laborItems.length > 0 && (
                <div className="rounded-lg border border-amber-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setLaborOpen(o => !o)}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-amber-50 border-b-2 border-amber-200 cursor-pointer hover:bg-amber-100/60 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <ChevronDown className={`h-4 w-4 text-amber-500 transition-transform ${laborOpen ? "rotate-0" : "-rotate-90"}`} />
                      <Wrench className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-bold text-amber-800 uppercase tracking-wide">İşçilik</span>
                      <span className="text-xs text-amber-500 font-medium ml-1">({laborItems.length})</span>
                    </div>
                    <span className="text-sm font-bold text-amber-700 tabular-nums">{fmt(result.laborSubtotal)}</span>
                  </button>
                  {laborOpen && laborItems.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 px-0 py-2 text-sm border-b last:border-0 ${
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"
                      }`}
                    >
                      <div className="w-1 self-stretch rounded-r bg-amber-400 shrink-0" />
                      <span className="text-[11px] text-slate-400 font-mono w-5 text-right shrink-0">{idx + 1}</span>
                      <div className="flex-1 min-w-0 pr-1">
                        <span className="block truncate font-medium text-slate-800">{item.name}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-mono text-slate-400">{item.referenceCode}</span>
                          {item.durationHours && (
                            <span className="inline-flex items-center rounded bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0">
                              {item.durationHours} saat
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-semibold text-slate-900 tabular-nums pr-3 shrink-0">{fmt(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Özet */}
              <div className="rounded-lg border overflow-hidden">
                <div className="flex justify-between items-center px-4 py-2.5 text-sm border-b bg-slate-50">
                  <span className="text-slate-500">Ara Toplam</span>
                  <span className="font-medium text-slate-700 tabular-nums">{fmt(result.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-2 text-sm border-b bg-white">
                  <span className="text-slate-400 text-xs">KDV (%{result.taxRate})</span>
                  <span className="text-slate-500 text-xs tabular-nums">{fmt(result.taxAmount)}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-4 bg-slate-800">
                  <span className="font-semibold text-slate-300 text-sm">Genel Toplam</span>
                  <span className="font-extrabold text-emerald-400 text-xl tabular-nums">{fmt(result.grandTotal)}</span>
                </div>
              </div>

              {/* Teklif Oluştur Butonu */}
              <div className="pt-1">
                <Link
                  href={`/dashboard/quotes/new?brandId=${brandId}&modelId=${modelId}&subModelId=${subModelId}&templateId=${templateId}`}
                >
                  <button className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-slate-700 hover:bg-slate-800 active:bg-slate-900 text-white font-bold text-sm py-3.5 px-5 shadow-md shadow-slate-200 transition-all">
                    <PlusCircle className="h-5 w-5 shrink-0 text-emerald-400" />
                    Bu Fiyatla Teklif Oluştur
                    <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                  </button>
                </Link>
              </div>
            </div>
          )
        })()}

        {/* Yönlendirici boş durum */}
        {!loading && !result && !error && (
          <div className="text-center py-4 text-muted-foreground">
            <Car className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">
              {!brandId
                ? "Marka seçerek başlayın."
                : !modelId
                ? "Model seçin."
                : subModels.length > 0 && !subModelId
                ? "Alt model / motor tipi seçin."
                : periods.length === 0
                ? "Bu araç için tanımlı bakım şablonu bulunamadı."
                : selectedPeriodKm === null
                ? "Bakım periyodunu seçin."
                : serviceTypes.length > 1 && !templateId
                ? "Servis tipini seçin."
                : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
