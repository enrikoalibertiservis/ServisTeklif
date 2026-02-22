"use client"

import { useEffect, useState, useTransition, useCallback } from "react"
import * as XLSX from "xlsx"
import { getBrands } from "@/app/actions/vehicle"
import {
  importParts,
  importLabor,
  importTemplates,
  getImportHistory,
} from "@/app/actions/import"
import type { Brand } from "@prisma/client"
import type { PriceListVersion } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Upload,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

type TabType = "parts" | "labor" | "templates"

const PARTS_FIELDS = [
  { key: "partNo", label: "Parça No", required: true },
  { key: "name", label: "Parça Adı", required: true },
  { key: "unitPrice", label: "Birim Fiyat", required: true },
] as const

const LABOR_FIELDS = [
  { key: "operationCode", label: "Operasyon Kodu", required: true },
  { key: "name", label: "Operasyon Adı", required: true },
  { key: "durationHours", label: "Süre (saat)", required: true },
  { key: "hourlyRate", label: "Saat Ücreti", required: true },
  { key: "totalPrice", label: "Toplam", required: false },
] as const

const TEMPLATES_FIELDS = [
  { key: "periodKm", label: "Periyot km", required: true },
  { key: "itemType", label: "Tip (PART/LABOR)", required: true },
  { key: "referenceCode", label: "Parça No / Op. Kodu", required: true },
  { key: "periodMonth", label: "Periyot ay", required: false },
  { key: "name", label: "Ad", required: false },
  { key: "modelName", label: "Model Adı", required: false },
  { key: "quantity", label: "Miktar", required: false },
  { key: "durationOverride", label: "Süre Override", required: false },
] as const

type TabState = {
  file: File | null
  excelColumns: string[]
  excelRows: Record<string, unknown>[]
  columnMapping: Record<string, string>
  importResult: { added: number; updated: number; errors: number; errorDetails: string[] } | null
}

function parseNumber(val: unknown): number | undefined {
  if (val === null || val === undefined || val === "") return undefined
  if (typeof val === "number" && !isNaN(val)) return val
  const s = String(val).replace(",", ".")
  const n = parseFloat(s)
  return isNaN(n) ? undefined : n
}

export default function ImportPage() {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [brands, setBrands] = useState<Brand[]>([])
  const [history, setHistory] = useState<(PriceListVersion & { uploadedBy: { name: string | null } })[]>([])
  const [activeTab, setActiveTab] = useState<TabType>("parts")

  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([])

  const [tabState, setTabState] = useState<Record<TabType, TabState>>({
    parts: { file: null, excelColumns: [], excelRows: [], columnMapping: {}, importResult: null },
    labor: { file: null, excelColumns: [], excelRows: [], columnMapping: {}, importResult: null },
    templates: { file: null, excelColumns: [], excelRows: [], columnMapping: {}, importResult: null },
  })
  const [isDragging, setIsDragging] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const loadBrands = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await getBrands()
        setBrands(data)
        // Otomatik marka seçimi YOK — kullanıcı kendisi seçmeli
      } catch (err) {
        toast({
          title: "Hata",
          description: "Markalar yüklenirken bir hata oluştu.",
          variant: "destructive",
        })
      }
    })
  }, [toast])

  const loadHistory = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await getImportHistory()
        setHistory(data)
      } catch (err) {
        toast({
          title: "Hata",
          description: "İçe aktarma geçmişi yüklenirken bir hata oluştu.",
          variant: "destructive",
        })
      }
    })
  }, [toast])

  useEffect(() => {
    loadBrands()
    loadHistory()
  }, [loadBrands, loadHistory])

  const getFields = () => {
    if (activeTab === "parts") return PARTS_FIELDS
    if (activeTab === "labor") return LABOR_FIELDS
    return TEMPLATES_FIELDS
  }

  const handleFile = useCallback(
    (f: File | null) => {
      if (!f) {
        setTabState((prev) => ({
          ...prev,
          [activeTab]: {
            file: null,
            excelColumns: [],
            excelRows: [],
            columnMapping: {},
            importResult: null,
          },
        }))
        return
      }
      if (!f.name.endsWith(".xlsx") && !f.name.endsWith(".xls")) {
        toast({
          title: "Geçersiz dosya",
          description: "Lütfen .xlsx veya .xls formatında bir Excel dosyası seçin.",
          variant: "destructive",
        })
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: "array" })
          const sheet = workbook.Sheets[workbook.SheetNames[0]]
          const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)
          if (json.length === 0) {
            toast({
              title: "Boş dosya",
              description: "Excel dosyasında veri bulunamadı.",
              variant: "destructive",
            })
            return
          }
          const cols = Object.keys(json[0])
          setTabState((prev) => ({
            ...prev,
            [activeTab]: {
              file: f,
              excelColumns: cols,
              excelRows: json,
              columnMapping: {},
              importResult: null,
            },
          }))
        } catch (err) {
          toast({
            title: "Okuma hatası",
            description: "Excel dosyası okunamadı.",
            variant: "destructive",
          })
        }
      }
      reader.readAsArrayBuffer(f)
    },
    [toast, activeTab]
  )

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0] ?? null)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = () => setIsDragging(false)

  const handleImport = async () => {
    if (selectedBrandIds.length === 0) {
      toast({ title: "En az bir marka seçin", variant: "destructive" })
      return
    }
    const state = tabState[activeTab]
    if (!state.file || state.excelRows.length === 0) {
      toast({ title: "Dosya yükleyin", variant: "destructive" })
      return
    }
    const fields = getFields()
    const required = fields.filter((f) => f.required)
    const columnMapping = state.columnMapping
    for (const f of required) {
      if (!columnMapping[f.key]) {
        toast({ title: "Eşleme eksik", description: `${f.label} alanı için sütun eşlemesi yapın.`, variant: "destructive" })
        return
      }
    }

    setIsImporting(true)
    setTabState((prev) => ({ ...prev, [activeTab]: { ...prev[activeTab], importResult: null } }))

    const combined = { added: 0, updated: 0, errors: 0, errorDetails: [] as string[] }

    try {
      for (const brandId of selectedBrandIds) {
        const brand = brands.find((b) => b.id === brandId)!
        if (activeTab === "parts") {
          const rows = state.excelRows.map((r) => ({
            partNo: String(r[columnMapping.partNo] ?? "").trim(),
            name: String(r[columnMapping.name] ?? "").trim(),
            unitPrice: parseNumber(r[columnMapping.unitPrice]) ?? 0,
          }))
          const result = await importParts(brand.name, rows)
          combined.added += result.added; combined.updated += result.updated
          combined.errors += result.errors; combined.errorDetails.push(...result.errorDetails)
        } else if (activeTab === "labor") {
          const rows = state.excelRows.map((r) => ({
            operationCode: String(r[columnMapping.operationCode] ?? "").trim(),
            name: String(r[columnMapping.name] ?? "").trim(),
            durationHours: parseNumber(r[columnMapping.durationHours]) ?? 0,
            hourlyRate: parseNumber(r[columnMapping.hourlyRate]) ?? 0,
            totalPrice: columnMapping.totalPrice ? parseNumber(r[columnMapping.totalPrice]) : undefined,
          }))
          const result = await importLabor(brand.name, rows)
          combined.added += result.added; combined.updated += result.updated
          combined.errors += result.errors; combined.errorDetails.push(...result.errorDetails)
        } else {
          const rows = state.excelRows.map((r) => {
            const itemType = columnMapping.itemType ? String(r[columnMapping.itemType] ?? "").trim().toUpperCase() : ""
            return {
              periodKm: columnMapping.periodKm ? parseNumber(r[columnMapping.periodKm]) : undefined,
              periodMonth: columnMapping.periodMonth ? parseNumber(r[columnMapping.periodMonth]) : undefined,
              name: columnMapping.name ? String(r[columnMapping.name] ?? "").trim() : undefined,
              modelName: columnMapping.modelName ? String(r[columnMapping.modelName] ?? "").trim() : undefined,
              itemType: itemType === "LABOR" ? "LABOR" : "PART",
              referenceCode: columnMapping.referenceCode ? String(r[columnMapping.referenceCode] ?? "").trim() : "",
              quantity: columnMapping.quantity ? parseNumber(r[columnMapping.quantity]) : undefined,
              durationOverride: columnMapping.durationOverride ? parseNumber(r[columnMapping.durationOverride]) : undefined,
            }
          })
          const result = await importTemplates(brand.name, rows)
          combined.added += result.added; combined.errors += result.errors
          combined.errorDetails.push(...result.errorDetails)
        }
      }
      setTabState((prev) => ({ ...prev, [activeTab]: { ...prev[activeTab], importResult: combined } }))
      const brandNames = selectedBrandIds.map(id => brands.find(b => b.id === id)?.name).join(", ")
      toast({
        title: `${selectedBrandIds.length} marka için aktarma tamamlandı`,
        description: `${brandNames} → ${combined.added} eklendi, ${combined.updated} güncellendi, ${combined.errors} hata.`,
      })
      loadHistory()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata"
      toast({ title: "İçe aktarma hatası", description: msg, variant: "destructive" })
      setTabState((prev) => ({ ...prev, [activeTab]: { ...prev[activeTab], importResult: { added: 0, updated: 0, errors: 1, errorDetails: [msg] } } }))
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Upload className="h-6 w-6 text-teal-500" />
          Excel İçe Aktarma
        </h1>
        <p className="text-muted-foreground">
          Parça fiyat listesi, işçilik listesi veya bakım şablonlarını Excel dosyasından içe aktarın.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="parts">Parça Fiyat Listesi</TabsTrigger>
          <TabsTrigger value="labor">İşçilik Listesi</TabsTrigger>
          <TabsTrigger value="templates">Bakım Şablonları</TabsTrigger>
        </TabsList>

        <TabsContent value="parts" className="mt-6">
          <ImportTabContent
            tabId="parts"
            brandIds={selectedBrandIds}
            brands={brands}
            onBrandChange={setSelectedBrandIds}
            state={tabState.parts}
            onStateChange={(s) => setTabState((p) => ({ ...p, parts: s }))}
            onFileChange={handleFile}
            isDragging={isDragging}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            fields={PARTS_FIELDS}
            isImporting={isImporting}
            onImport={handleImport}
          />
        </TabsContent>

        <TabsContent value="labor" className="mt-6">
          <ImportTabContent
            tabId="labor"
            brandIds={selectedBrandIds}
            brands={brands}
            onBrandChange={setSelectedBrandIds}
            state={tabState.labor}
            onStateChange={(s) => setTabState((p) => ({ ...p, labor: s }))}
            onFileChange={handleFile}
            isDragging={isDragging}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            fields={LABOR_FIELDS}
            isImporting={isImporting}
            onImport={handleImport}
          />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <ImportTabContent
            tabId="templates"
            brandIds={selectedBrandIds}
            brands={brands}
            onBrandChange={setSelectedBrandIds}
            state={tabState.templates}
            onStateChange={(s) => setTabState((p) => ({ ...p, templates: s }))}
            onFileChange={handleFile}
            isDragging={isDragging}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            fields={TEMPLATES_FIELDS}
            isImporting={isImporting}
            onImport={handleImport}
          />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>İçe Aktarma Geçmişi</CardTitle>
          <p className="text-sm text-muted-foreground">
            Son 50 içe aktarma işlemi
          </p>
        </CardHeader>
        <CardContent>
          {isPending && history.length === 0 ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Yükleniyor...
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz içe aktarma yok.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Marka</TableHead>
                  <TableHead>Kayıt</TableHead>
                  <TableHead>Eklenen</TableHead>
                  <TableHead>Güncellenen</TableHead>
                  <TableHead>Hata</TableHead>
                  <TableHead>Yükleyen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>
                      {new Date(h.createdAt).toLocaleString("tr-TR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {h.type === "PART"
                          ? "Parça"
                          : h.type === "LABOR"
                            ? "İşçilik"
                            : h.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{h.brandName}</TableCell>
                    <TableCell>{h.recordCount}</TableCell>
                    <TableCell className="text-green-600">{h.added}</TableCell>
                    <TableCell className="text-blue-600">{h.updated}</TableCell>
                    <TableCell className="text-destructive">{h.errors}</TableCell>
                    <TableCell>{h.uploadedBy?.name ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface ImportTabContentProps {
  tabId: string
  brandIds: string[]
  brands: Brand[]
  onBrandChange: (ids: string[]) => void
  state: TabState
  onStateChange: (s: TabState) => void
  onFileChange: (f: File | null) => void
  isDragging: boolean
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  fields: readonly { key: string; label: string; required: boolean }[]
  isImporting: boolean
  onImport: () => void
}

function ImportTabContent({
  tabId,
  brandIds,
  brands,
  onBrandChange,
  state,
  onStateChange,
  onFileChange,
  isDragging,
  onDrop,
  onDragOver,
  onDragLeave,
  fields,
  isImporting,
  onImport,
}: ImportTabContentProps) {
  function toggleBrand(id: string) {
    if (brandIds.includes(id)) {
      onBrandChange(brandIds.filter(b => b !== id))
    } else {
      onBrandChange([...brandIds, id])
    }
  }
  const { file, excelColumns, excelRows, columnMapping, importResult } = state
  const previewRows = excelRows.slice(0, 5)
  const setColumnMapping = (m: Record<string, string>) =>
    onStateChange({ ...state, columnMapping: m })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dosya ve Marka</CardTitle>
          <p className="text-sm text-muted-foreground">
            Marka seçin ve Excel dosyasını yükleyin (.xlsx)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>
              Marka
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                (birden fazla seçilebilir)
              </span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {brands.map((b) => {
                const checked = brandIds.includes(b.id)
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggleBrand(b.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all",
                      checked
                        ? "border-teal-500 bg-teal-50 text-teal-700"
                        : "border-muted-foreground/25 bg-background text-foreground hover:border-teal-300 hover:bg-teal-50/50"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded border",
                        checked ? "border-teal-500 bg-teal-500" : "border-muted-foreground"
                      )}
                    >
                      {checked && <Check className="h-3 w-3 text-white" />}
                    </span>
                    {b.name}
                  </button>
                )
              })}
            </div>
            {brandIds.length > 0 && (
              <p className="text-xs text-teal-600">
                {brandIds.length} marka seçildi: {brandIds.map(id => brands.find(b => b.id === id)?.name).join(", ")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Excel Dosyası</Label>
            <div
              className={cn(
                "flex min-h-[160px] flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
                isDragging && "border-primary bg-primary/5",
                !isDragging && "border-muted-foreground/25 hover:border-muted-foreground/50"
              )}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
            >
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                id={`file-upload-${tabId}`}
                onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileSpreadsheet className="h-12 w-12 text-green-600" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {excelColumns.length} sütun, {excelRows.length} satır
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onFileChange(null)}
                  >
                    Dosyayı Kaldır
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Dosyayı sürükleyip bırakın veya
                  </p>
                  <label htmlFor={`file-upload-${tabId}`}>
                    <Button variant="outline" size="sm" asChild>
                      <span>Dosya Seç</span>
                    </Button>
                  </label>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {excelColumns.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Sütun Eşlemesi</CardTitle>
              <p className="text-sm text-muted-foreground">
                Excel sütunlarını alanlara eşleyin
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {fields.map((f) => (
                  <div key={f.key} className="space-y-2">
                    <Label className="flex items-center gap-2">
                      {f.label}
                      {f.required && (
                        <span className="text-destructive">*</span>
                      )}
                    </Label>
                    <Select
                      value={columnMapping[f.key] ?? "__none__"}
                      onValueChange={(v) =>
                        setColumnMapping({
                          ...columnMapping,
                          [f.key]: v === "__none__" ? "" : v,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sütun seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Seçilmedi —</SelectItem>
                        {excelColumns.map((col) => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Önizleme (İlk 5 Satır)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {fields.map((f) => (
                        <TableHead key={f.key}>{f.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, i) => (
                      <TableRow key={i}>
                        {fields.map((f) => {
                          const col = columnMapping[f.key]
                          const val = col ? row[col] : ""
                          return (
                            <TableCell key={f.key}>
                              {val !== null && val !== undefined
                                ? String(val)
                                : "—"}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <Button
              onClick={onImport}
              disabled={isImporting}
              className="w-fit"
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  İçe Aktarılıyor...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  İçe Aktar
                </>
              )}
            </Button>

            {importResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Sonuç Özeti</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Eklenen: {importResult.added}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-blue-600" />
                      <span>Güncellenen: {importResult.updated}</span>
                    </div>
                    {importResult.errors > 0 && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span>Hatalar: {importResult.errors}</span>
                      </div>
                    )}
                  </div>
                  {importResult.errorDetails.length > 0 && (
                    <div className="space-y-2">
                      <Label>Hata Detayları</Label>
                      <ul className="max-h-40 overflow-y-auto rounded-md border bg-muted/50 p-3 text-sm">
                        {importResult.errorDetails.slice(0, 20).map((err, i) => (
                          <li key={i} className="text-destructive">
                            {err}
                          </li>
                        ))}
                        {importResult.errorDetails.length > 20 && (
                          <li className="text-muted-foreground">
                            ... ve {importResult.errorDetails.length - 20} hata daha
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  )
}
