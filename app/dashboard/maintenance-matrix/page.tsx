"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Car, ClipboardList, ChevronDown, ChevronRight, Wrench, Package } from "lucide-react"
import { getBrands, getModelsByBrand, getSubModelsByModel } from "@/app/actions/vehicle"
import { formatCurrency } from "@/lib/utils"

const KDV_RATE = 0.20

interface Period {
  km: number | null
  month: number | null
  name: string
  templateId: string
}

interface MatrixData {
  periods: Period[]
  partRows: Array<{
    referenceCode: string
    name: string
    unitPrice: number
    cells: Array<{ included: boolean; quantity: number }>
  }>
  laborRows: Array<{
    referenceCode: string
    name: string
    totalPrice: number
    durationHours: number
    cells: Array<{ included: boolean; quantity: number }>
  }>
  periodTotals: Array<{ partsTotal: number; laborTotal: number; grandTotal: number }>
}

export default function MaintenanceMatrixPage() {
  const [brands, setBrands]       = useState<any[]>([])
  const [models, setModels]       = useState<any[]>([])
  const [subModels, setSubModels] = useState<any[]>([])
  const [brandId, setBrandId]     = useState("")
  const [modelId, setModelId]     = useState("")
  const [subModelId, setSubModelId] = useState("")
  const [matrix, setMatrix]       = useState<MatrixData | null>(null)
  const [loading, setLoading]     = useState(false)
  const [expanded, setExpanded]   = useState<Set<number>>(new Set())

  useEffect(() => { getBrands().then(setBrands) }, [])

  useEffect(() => {
    if (brandId) {
      getModelsByBrand(brandId).then(setModels)
      setModelId(""); setSubModelId(""); setSubModels([]); setMatrix(null)
    }
  }, [brandId])

  useEffect(() => {
    if (modelId && modelId !== "ALL") {
      getSubModelsByModel(modelId).then(setSubModels)
      setSubModelId("")
    } else {
      setSubModels([]); setSubModelId("")
    }
  }, [modelId])

  useEffect(() => {
    if (!brandId) return
    setLoading(true)
    const params = new URLSearchParams({ brandId })
    if (modelId && modelId !== "ALL") params.set("modelId", modelId)
    if (subModelId && subModelId !== "ALL") params.set("subModelId", subModelId)
    fetch(`/api/maintenance-matrix?${params}`)
      .then(r => r.json())
      .then(data => { setMatrix(data); setExpanded(new Set()) })
      .finally(() => setLoading(false))
  }, [brandId, modelId, subModelId])

  function toggleExpand(idx: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(idx)) { next.delete(idx) } else { next.add(idx) }
      return next
    })
  }

  const selectedBrand    = brands.find(b => b.id === brandId)
  const selectedModel    = models.find(m => m.id === modelId)
  const selectedSubModel = subModels.find(sm => sm.id === subModelId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-purple-500" />
          Bakım Periyot Fiyatları
        </h1>
        <p className="text-muted-foreground">
          Seçili araç için tanımlı bakım periyotlarını ve maliyet özetini görüntüleyin.
        </p>
      </div>

      {/* Filtreler */}
      <div className="flex gap-4 flex-wrap items-end">
        <div className="space-y-1">
          <label className="text-sm font-medium">Marka</label>
          <Select value={brandId} onValueChange={setBrandId}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Marka seçin" /></SelectTrigger>
            <SelectContent>
              {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Model</label>
          <Select value={modelId} onValueChange={setModelId} disabled={!brandId}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Tüm Modeller" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tüm Modeller</SelectItem>
              {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Alt Model</label>
          <Select
            value={subModelId}
            onValueChange={setSubModelId}
            disabled={!modelId || modelId === "ALL" || subModels.length === 0}
          >
            <SelectTrigger className="w-44"><SelectValue placeholder="Tüm Alt Modeller" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tüm Alt Modeller</SelectItem>
              {subModels.map(sm => <SelectItem key={sm.id} value={sm.id}>{sm.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Boş durum */}
      {!brandId && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Car className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">Lütfen bir marka seçin</p>
            <p className="text-sm mt-1">Bakım periyotlarını görüntülemek için yukarıdan marka seçin.</p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <div className="animate-pulse">Yükleniyor...</div>
          </CardContent>
        </Card>
      )}

      {!loading && matrix && matrix.periods.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <p>Bu seçim için tanımlı bakım şablonu bulunamadı.</p>
          </CardContent>
        </Card>
      )}

      {/* Periyot Listesi */}
      {!loading && matrix && matrix.periods.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {selectedBrand?.name}
              {selectedModel && ` / ${selectedModel.name}`}
              {selectedSubModel && ` / ${selectedSubModel.name}`}
            </span>
            <span>·</span>
            <span>{matrix.periods.length} periyot tanımlı</span>
          </div>

          {/* Özet tablo (masaüstü) */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Periyot Fiyat Özeti
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left p-3 pl-5 font-semibold">Periyot</th>
                      <th className="text-right p-3 font-semibold">Parça Toplamı</th>
                      <th className="text-right p-3 font-semibold">İşçilik Toplamı</th>
                      <th className="text-right p-3 font-semibold">Ara Toplam</th>
                      <th className="text-right p-3 font-semibold text-muted-foreground">KDV (%20)</th>
                      <th className="text-right p-3 pr-5 font-semibold text-primary">Genel Toplam</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.periods.map((p, i) => {
                      const t = matrix.periodTotals[i]
                      const kdv = t.grandTotal * KDV_RATE
                      const withKdv = t.grandTotal + kdv
                      return (
                        <tr key={i} className={`border-b last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                          <td className="p-3 pl-5">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs font-semibold tabular-nums">
                                {p.km ? `${p.km.toLocaleString("tr-TR")} km` : `${p.month} ay`}
                              </Badge>
                              {p.month && p.km ? (
                                <span className="text-xs text-muted-foreground">/ {p.month} ay</span>
                              ) : null}
                            </div>
                          </td>
                          <td className="p-3 text-right tabular-nums text-muted-foreground">{formatCurrency(t.partsTotal)}</td>
                          <td className="p-3 text-right tabular-nums text-muted-foreground">{formatCurrency(t.laborTotal)}</td>
                          <td className="p-3 text-right tabular-nums font-medium">{formatCurrency(t.grandTotal)}</td>
                          <td className="p-3 text-right tabular-nums text-muted-foreground text-xs">{formatCurrency(kdv)}</td>
                          <td className="p-3 pr-5 text-right tabular-nums font-bold text-primary">{formatCurrency(withKdv)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Periyot detay kartları (genişletilebilir) */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Periyot Detayları</p>
            {matrix.periods.map((p, i) => {
              const t = matrix.periodTotals[i]
              const kdv = t.grandTotal * KDV_RATE
              const withKdv = t.grandTotal + kdv
              const isOpen = expanded.has(i)

              const periodParts  = matrix.partRows.filter(r => r.cells[i]?.included)
              const periodLabors = matrix.laborRows.filter(r => r.cells[i]?.included)

              return (
                <Card key={i} className="overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors text-left"
                    onClick={() => toggleExpand(i)}
                  >
                    <div className="flex items-center gap-3">
                      {isOpen
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      }
                      <Badge variant="outline" className="text-sm font-semibold tabular-nums px-3 py-0.5">
                        {p.km ? `${p.km.toLocaleString("tr-TR")} km` : `${p.month} ay`}
                        {p.km && p.month ? ` / ${p.month} ay` : ""}
                      </Badge>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {periodParts.length} parça · {periodLabors.length} işçilik
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground hidden md:inline">
                        Ara: <span className="font-medium text-foreground tabular-nums">{formatCurrency(t.grandTotal)}</span>
                      </span>
                      <span className="font-bold text-primary tabular-nums">{formatCurrency(withKdv)}</span>
                      <span className="text-xs text-muted-foreground hidden sm:inline">KDV dahil</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t px-5 py-4 space-y-4 bg-muted/10">
                      {/* Parçalar */}
                      {periodParts.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-blue-700 uppercase tracking-wide">
                            <Package className="h-3.5 w-3.5" /> Parçalar
                          </div>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs text-muted-foreground border-b">
                                <th className="text-left pb-1.5 font-medium">Parça Adı</th>
                                <th className="text-left pb-1.5 font-medium">Kodu</th>
                                <th className="text-center pb-1.5 font-medium">Adet</th>
                                <th className="text-right pb-1.5 font-medium">Birim Fiyat</th>
                                <th className="text-right pb-1.5 font-medium">Toplam</th>
                              </tr>
                            </thead>
                            <tbody>
                              {periodParts.map((row, ri) => (
                                <tr key={ri} className="border-b last:border-0">
                                  <td className="py-1.5 font-medium">{row.name}</td>
                                  <td className="py-1.5 text-muted-foreground text-xs">{row.referenceCode}</td>
                                  <td className="py-1.5 text-center">{row.cells[i].quantity}</td>
                                  <td className="py-1.5 text-right tabular-nums text-muted-foreground">{formatCurrency(row.unitPrice)}</td>
                                  <td className="py-1.5 text-right tabular-nums font-medium">{formatCurrency(row.unitPrice * row.cells[i].quantity)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* İşçilik */}
                      {periodLabors.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-orange-700 uppercase tracking-wide">
                            <Wrench className="h-3.5 w-3.5" /> İşçilik
                          </div>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs text-muted-foreground border-b">
                                <th className="text-left pb-1.5 font-medium">Operasyon</th>
                                <th className="text-left pb-1.5 font-medium">Kodu</th>
                                <th className="text-right pb-1.5 font-medium">Süre (saat)</th>
                                <th className="text-right pb-1.5 font-medium">Toplam</th>
                              </tr>
                            </thead>
                            <tbody>
                              {periodLabors.map((row, ri) => (
                                <tr key={ri} className="border-b last:border-0">
                                  <td className="py-1.5 font-medium">{row.name}</td>
                                  <td className="py-1.5 text-muted-foreground text-xs">{row.referenceCode}</td>
                                  <td className="py-1.5 text-right tabular-nums text-muted-foreground">{row.durationHours}</td>
                                  <td className="py-1.5 text-right tabular-nums font-medium">{formatCurrency(row.totalPrice)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Özet */}
                      <div className="flex justify-end">
                        <div className="text-sm space-y-1 min-w-[220px]">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Parça Toplamı</span>
                            <span className="tabular-nums">{formatCurrency(t.partsTotal)}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>İşçilik Toplamı</span>
                            <span className="tabular-nums">{formatCurrency(t.laborTotal)}</span>
                          </div>
                          <div className="flex justify-between font-medium border-t pt-1">
                            <span>Ara Toplam</span>
                            <span className="tabular-nums">{formatCurrency(t.grandTotal)}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground text-xs">
                            <span>KDV (%20)</span>
                            <span className="tabular-nums">{formatCurrency(kdv)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-primary text-base border-t pt-1">
                            <span>Genel Toplam</span>
                            <span className="tabular-nums">{formatCurrency(withKdv)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
