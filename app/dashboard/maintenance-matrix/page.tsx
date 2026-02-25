"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Car, ClipboardList, Loader2 } from "lucide-react"
import { getBrands, getModelsByBrand } from "@/app/actions/vehicle"
import { formatCurrency } from "@/lib/utils"

interface Period {
  key: string
  km: number | null
  month: number | null
  label: string
}

interface PivotRow {
  subModelId: string
  subModelName: string
  modelName: string
  totals: Record<string, { grandTotal: number; withKdv: number } | null>
}

interface PivotData {
  periods: Period[]
  rows: PivotRow[]
}

export default function MaintenanceMatrixPage() {
  const [brands, setBrands]   = useState<any[]>([])
  const [models, setModels]   = useState<any[]>([])
  const [brandId, setBrandId] = useState("")
  const [modelId, setModelId] = useState("")
  const [data, setData]       = useState<PivotData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { getBrands().then(setBrands) }, [])

  useEffect(() => {
    if (brandId) {
      getModelsByBrand(brandId).then(setModels)
      setModelId(""); setData(null)
    }
  }, [brandId])

  useEffect(() => {
    if (!brandId) return
    setLoading(true)
    const params = new URLSearchParams({ brandId })
    if (modelId && modelId !== "ALL") params.set("modelId", modelId)
    fetch(`/api/maintenance-pivot?${params}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [brandId, modelId])

  const selectedBrand = brands.find(b => b.id === brandId)
  const selectedModel = models.find(m => m.id === modelId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-purple-500" />
          Bakım Fiyat Matrisi
        </h1>
        <p className="text-muted-foreground">
          Alt model bazında periyodik bakım fiyetlerini tek tabloda görüntüleyin.
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
      </div>

      {/* Boş durum */}
      {!brandId && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Car className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">Lütfen bir marka seçin</p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Yükleniyor...
          </CardContent>
        </Card>
      )}

      {!loading && data && data.periods.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Bu seçim için onaylı bakım şablonu bulunamadı.
          </CardContent>
        </Card>
      )}

      {/* Pivot Tablo */}
      {!loading && data && data.periods.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    {/* Sol üst köşe: marka/model bilgisi */}
                    <th className="sticky left-0 bg-primary z-20 text-left px-4 py-3 font-semibold min-w-[180px] border-r border-primary-foreground/20">
                      <div className="text-base">{selectedBrand?.name}</div>
                      {selectedModel && selectedModel.id !== "ALL" && (
                        <div className="text-xs font-normal opacity-80">{selectedModel.name}</div>
                      )}
                    </th>
                    {/* Periyot başlıkları */}
                    {data.periods.map(p => (
                      <th key={p.key} className="text-center px-3 py-3 font-semibold min-w-[120px] border-r border-primary-foreground/20 last:border-0">
                        <div className="text-sm tabular-nums">
                          {p.km ? `${(p.km / 1000).toLocaleString("tr-TR")}K km` : `${p.month} ay`}
                        </div>
                        {p.month && p.km ? (
                          <div className="text-[11px] font-normal opacity-70">/ {p.month} ay</div>
                        ) : null}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, ri) => (
                    <tr
                      key={row.subModelId}
                      className={`border-b last:border-0 hover:bg-primary/5 transition-colors ${ri % 2 === 0 ? "bg-white" : "bg-slate-50/60"}`}
                    >
                      {/* Sol sütun: model / alt model adı */}
                      <td className="sticky left-0 bg-inherit z-10 px-4 py-2.5 border-r border-border">
                        <div className="font-medium text-sm">{row.subModelName}</div>
                        {row.modelName !== row.subModelName && (
                          <div className="text-xs text-muted-foreground">{row.modelName}</div>
                        )}
                      </td>
                      {/* Fiyat hücreleri */}
                      {data.periods.map(p => {
                        const cell = row.totals[p.key]
                        return (
                          <td key={p.key} className="px-3 py-2.5 text-center border-r border-border/40 last:border-0">
                            {cell ? (
                              <div>
                                <div className="font-semibold tabular-nums text-sm text-foreground">
                                  {formatCurrency(cell.withKdv)}
                                </div>
                                <div className="text-[11px] text-muted-foreground tabular-nums">
                                  KDV dahil
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40 text-base">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 text-xs text-muted-foreground border-t bg-muted/20">
              {data.rows.length} alt model · {data.periods.length} periyot · KDV %20 dahil fiyatlar · Yalnızca onaylı şablonlar
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
