"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { searchParts, searchLabor } from "@/app/actions/quote"
import { formatCurrency } from "@/lib/utils"
import { Search, Plus, Loader2, Clock } from "lucide-react"

const MAX_RECENT = 8

function recentKey(brandName: string, type: "PART" | "LABOR") {
  return `recent_${type}_${brandName}`
}

function loadRecent(brandName: string, type: "PART" | "LABOR"): any[] {
  try {
    const raw = localStorage.getItem(recentKey(brandName, type))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRecent(brandName: string, type: "PART" | "LABOR", item: any) {
  try {
    const key = recentKey(brandName, type)
    const list: any[] = loadRecent(brandName, type)
    const idField = type === "PART" ? "partNo" : "operationCode"
    // Aynı kalem varsa başa taşı
    const filtered = list.filter((r) => r[idField] !== item[idField])
    const updated = [item, ...filtered].slice(0, MAX_RECENT)
    localStorage.setItem(key, JSON.stringify(updated))
  } catch {}
}

interface PartSearchDialogProps {
  open: boolean
  onClose: () => void
  searchType: "PART" | "LABOR"
  brandName: string
  onAdd: (item: any) => void
}

export function PartSearchDialog({ open, onClose, searchType, brandName, onAdd }: PartSearchDialogProps) {
  const [query, setQuery]       = useState("")
  const [results, setResults]   = useState<any[]>([])
  const [recent, setRecent]     = useState<any[]>([])
  const [loading, setLoading]   = useState(false)
  const timerRef = useRef<any>(null)

  // Dialog açılınca son eklenenler yükle, arama sıfırla
  useEffect(() => {
    if (open) {
      setQuery("")
      setResults([])
      setRecent(loadRecent(brandName, searchType))
    }
  }, [open, brandName, searchType])

  // Arama
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (query.length < 2) { setResults([]); return }

    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = searchType === "PART"
          ? await searchParts(brandName, query)
          : await searchLabor(brandName, query)
        setResults(data)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, searchType, brandName])

  function handleSelect(item: any) {
    // Son eklenenler listesine kaydet
    saveRecent(brandName, searchType, item)
    setRecent(loadRecent(brandName, searchType))

    if (searchType === "PART") {
      onAdd({
        itemType: "PART",
        referenceCode: item.partNo,
        name: item.name,
        quantity: 1,
        unitPrice: item.unitPrice,
        totalPrice: item.unitPrice,
      })
    } else {
      const total = item.totalPrice ?? (item.durationHours * item.hourlyRate)
      onAdd({
        itemType: "LABOR",
        referenceCode: item.operationCode,
        name: item.name,
        quantity: 1,
        unitPrice: item.totalPrice ?? item.hourlyRate,
        totalPrice: total,
        durationHours: item.durationHours,
        hourlyRate: item.hourlyRate,
      })
    }
  }

  const showRecent  = query.length < 2 && recent.length > 0
  const showResults = query.length >= 2 && !loading && results.length > 0
  const showEmpty   = query.length >= 2 && !loading && results.length === 0
  const showHint    = query.length < 2 && recent.length === 0

  function ItemRow({ item, isRecent = false }: { item: any; isRecent?: boolean }) {
    const code  = searchType === "PART" ? item.partNo : item.operationCode
    const price = searchType === "PART"
      ? formatCurrency(item.unitPrice)
      : formatCurrency(item.totalPrice ?? (item.durationHours * item.hourlyRate))

    return (
      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border hover:bg-muted/50 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isRecent && <Clock className="h-3 w-3 text-muted-foreground shrink-0" />}
            <span className="text-xs text-muted-foreground">{code}</span>
          </div>
          <div className="font-medium text-sm truncate">{item.name}</div>
          {searchType === "LABOR" && (
            <div className="text-xs text-muted-foreground">
              {item.durationHours} saat &middot; {formatCurrency(item.hourlyRate)}/saat
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 ml-4 shrink-0">
          <span className="font-semibold text-sm">{price}</span>
          <Button size="sm" className="h-7 w-7 p-0" onClick={() => handleSelect(item)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col gap-3">
        <DialogHeader>
          <DialogTitle>
            {searchType === "PART" ? "Parça Ara & Ekle" : "İşçilik Ara & Ekle"}
          </DialogTitle>
        </DialogHeader>

        {/* Arama */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={searchType === "PART" ? "Parça no veya adı..." : "Operasyon kodu veya adı..."}
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Sonuç alanı */}
        <div className="flex-1 overflow-y-auto space-y-3">

          {/* Yükleniyor */}
          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}

          {/* Arama sonuçları */}
          {showResults && (
            <div className="space-y-1">
              {results.map((item) => (
                <ItemRow key={item.id} item={item} />
              ))}
            </div>
          )}

          {/* Sonuç yok */}
          {showEmpty && (
            <div className="text-center py-10 text-sm text-muted-foreground">
              "{query}" için sonuç bulunamadı
            </div>
          )}

          {/* Son eklenenler */}
          {showRecent && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Son Eklenenler
              </p>
              <div className="space-y-1">
                {recent.map((item) => (
                  <ItemRow
                    key={searchType === "PART" ? item.partNo : item.operationCode}
                    item={item}
                    isRecent
                  />
                ))}
              </div>
            </div>
          )}

          {/* İlk açılış ipucu */}
          {showHint && (
            <div className="text-center py-10 text-sm text-muted-foreground">
              En az 2 karakter yazarak arayın
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
