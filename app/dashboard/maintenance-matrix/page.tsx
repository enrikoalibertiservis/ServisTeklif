"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Check, Minus, Car, ClipboardList } from "lucide-react"
import { getBrands, getModelsByBrand } from "@/app/actions/vehicle"
import { formatCurrency } from "@/lib/utils"

interface MatrixData {
  periods: Array<{ km: number | null; month: number | null; name: string; templateId: string }>
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
  const [brands, setBrands] = useState<any[]>([])
  const [models, setModels] = useState<any[]>([])
  const [brandId, setBrandId] = useState("")
  const [modelId, setModelId] = useState("")
  const [matrix, setMatrix] = useState<MatrixData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getBrands().then(setBrands)
  }, [])

  useEffect(() => {
    if (brandId) {
      getModelsByBrand(brandId).then(setModels)
      setModelId("")
      setMatrix(null)
    }
  }, [brandId])

  useEffect(() => {
    if (brandId) {
      setLoading(true)
      const url = modelId
        ? `/api/maintenance-matrix?brandId=${brandId}&modelId=${modelId}`
        : `/api/maintenance-matrix?brandId=${brandId}`
      fetch(url)
        .then((r) => r.json())
        .then(setMatrix)
        .finally(() => setLoading(false))
    }
  }, [brandId, modelId])

  const selectedBrand = brands.find((b) => b.id === brandId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-purple-500" />
          Bakım Matrisi
        </h1>
        <p className="text-muted-foreground">
          Periyodik bakımlarda hangi parça ve işçiliklerin uygulandığını tek tabloda görüntüleyin.
        </p>
      </div>

      <div className="flex gap-4 flex-wrap items-end">
        <div className="space-y-1">
          <label className="text-sm font-medium">Marka</label>
          <Select value={brandId} onValueChange={setBrandId}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Marka seçin" />
            </SelectTrigger>
            <SelectContent>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Model (opsiyonel)</label>
          <Select value={modelId} onValueChange={setModelId} disabled={!brandId}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Tümü" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tüm Modeller</SelectItem>
              {models.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!brandId && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Car className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">Lütfen bir marka seçin</p>
            <p className="text-sm mt-1">Bakım matrisini görüntülemek için yukarıdan marka seçin.</p>
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

      {!loading && matrix && matrix.periods.length > 0 && (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">
              {selectedBrand?.name} Bakım Matrisi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="text-left p-3 font-semibold sticky left-0 bg-primary z-10 min-w-[250px]">
                      Parça / İşçilik
                    </th>
                    <th className="text-right p-3 font-semibold min-w-[100px]">Birim Fiyat</th>
                    {matrix.periods.map((p, i) => (
                      <th key={i} className="text-center p-3 font-semibold min-w-[100px]">
                        <div>{p.km ? `${(p.km / 1000)}K` : ""}</div>
                        <div className="text-xs font-normal opacity-80">
                          {p.km ? `${p.km.toLocaleString("tr-TR")} km` : `${p.month} ay`}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Parts section header */}
                  {matrix.partRows.length > 0 && (
                    <tr className="bg-blue-50">
                      <td colSpan={2 + matrix.periods.length} className="p-2 font-bold text-primary text-xs uppercase tracking-wider">
                        Parçalar
                      </td>
                    </tr>
                  )}
                  {matrix.partRows.map((row, ri) => (
                    <tr key={`p-${ri}`} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <td className="p-2.5 sticky left-0 bg-inherit z-10 border-r">
                        <div className="font-medium">{row.name}</div>
                        <div className="text-xs text-muted-foreground">{row.referenceCode}</div>
                      </td>
                      <td className="p-2.5 text-right text-muted-foreground whitespace-nowrap">
                        {formatCurrency(row.unitPrice)}
                      </td>
                      {row.cells.map((cell, ci) => (
                        <td key={ci} className="p-2.5 text-center">
                          {cell.included ? (
                            <div className="flex flex-col items-center">
                              <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                                <Check className="h-4 w-4 text-green-600" />
                              </div>
                              {cell.quantity > 1 && (
                                <span className="text-xs text-muted-foreground mt-0.5">x{cell.quantity}</span>
                              )}
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <Minus className="h-4 w-4 text-gray-300" />
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}

                  {/* Labor section header */}
                  {matrix.laborRows.length > 0 && (
                    <tr className="bg-orange-50">
                      <td colSpan={2 + matrix.periods.length} className="p-2 font-bold text-orange-700 text-xs uppercase tracking-wider">
                        İşçilik
                      </td>
                    </tr>
                  )}
                  {matrix.laborRows.map((row, ri) => (
                    <tr key={`l-${ri}`} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <td className="p-2.5 sticky left-0 bg-inherit z-10 border-r">
                        <div className="font-medium">{row.name}</div>
                        <div className="text-xs text-muted-foreground">{row.referenceCode}</div>
                      </td>
                      <td className="p-2.5 text-right text-muted-foreground whitespace-nowrap">
                        {formatCurrency(row.totalPrice)}
                        <div className="text-xs">{row.durationHours} saat</div>
                      </td>
                      {row.cells.map((cell, ci) => (
                        <td key={ci} className="p-2.5 text-center">
                          {cell.included ? (
                            <div className="flex justify-center">
                              <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                                <Check className="h-4 w-4 text-green-600" />
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <Minus className="h-4 w-4 text-gray-300" />
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}

                  {/* Totals */}
                  <tr className="bg-gray-100 border-t-2 border-primary/20">
                    <td className="p-3 font-bold sticky left-0 bg-gray-100 z-10">Parça Toplamı</td>
                    <td className="p-3"></td>
                    {matrix.periodTotals.map((t, i) => (
                      <td key={i} className="p-3 text-center font-semibold text-sm">
                        {formatCurrency(t.partsTotal)}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-gray-100">
                    <td className="p-3 font-bold sticky left-0 bg-gray-100 z-10">İşçilik Toplamı</td>
                    <td className="p-3"></td>
                    {matrix.periodTotals.map((t, i) => (
                      <td key={i} className="p-3 text-center font-semibold text-sm">
                        {formatCurrency(t.laborTotal)}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-primary text-primary-foreground">
                    <td className="p-3 font-bold sticky left-0 bg-primary z-10 text-lg">GENEL TOPLAM</td>
                    <td className="p-3"></td>
                    {matrix.periodTotals.map((t, i) => (
                      <td key={i} className="p-3 text-center font-bold text-base">
                        {formatCurrency(t.grandTotal)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      {!loading && matrix && matrix.periods.length > 0 && (
        <div className="flex gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-3.5 w-3.5 text-green-600" />
            </div>
            Dahil
          </div>
          <div className="flex items-center gap-2">
            <Minus className="h-4 w-4 text-gray-300" />
            Dahil değil
          </div>
        </div>
      )}
    </div>
  )
}
