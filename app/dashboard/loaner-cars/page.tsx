"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import {
  Car, Plus, ArrowRightLeft, ArrowLeft, AlertTriangle,
  CheckCircle2, Clock, Wrench, Search, RefreshCw, Pencil, X, Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────

interface LoanerCar {
  id: string
  plate: string
  usagePurpose: string
  taxNo: string
  registrationDate: string
  inspectionDate: string
  trafficInsDate: string
  kaskoDate: string
  brand: string
  modelYear: number
  specs: string | null
  registrationNo: string
  engineNo: string
  chassisNo: string
  isActive: boolean
  loans: ActiveLoan[]
}

interface ActiveLoan {
  id: string
  advisorName: string
  customerPlate: string
  jobCardNo: string
  jobCardDate: string
  deliveryDate: string
  deliveryKm: number
  deliveryNotes: string
  userName: string
  registrationOwner: string
  returnDate: string | null
  returnKm: number | null
  isReturned: boolean
}

interface LoanRecord {
  id: string
  loanerCarId: string
  advisorName: string
  customerPlate: string
  jobCardNo: string
  jobCardDate: string
  deliveryDate: string
  deliveryKm: number
  deliveryNotes: string
  userName: string
  registrationOwner: string
  returnDate: string | null
  returnKm: number | null
  returnedAt: string | null
  isReturned: boolean
  loanerCar: { plate: string; brand: string; specs: string | null; modelYear: number }
  createdByUser: { name: string }
}

// ─── Helpers ─────────────────────────────────────────────────

function daysSince(dateStr: string): number {
  const d = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
}

function fmtDate(dateStr?: string | null) {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString("tr-TR")
}

function toInputDate(dateStr?: string | null) {
  if (!dateStr) return ""
  return new Date(dateStr).toISOString().split("T")[0]
}

const OVERDUE_DAYS = 10

// ─── Empty forms ─────────────────────────────────────────────

const emptyCarForm = {
  plate: "", usagePurpose: "YEDEK ARAÇ/İKAME", taxNo: "",
  registrationDate: "", inspectionDate: "", trafficInsDate: "", kaskoDate: "",
  brand: "", modelYear: new Date().getFullYear().toString(), specs: "",
  registrationNo: "", engineNo: "", chassisNo: "",
}

const emptyLoanForm = {
  loanerCarId: "", advisorName: "", customerPlate: "", jobCardNo: "",
  jobCardDate: "", deliveryDate: new Date().toISOString().split("T")[0],
  deliveryKm: "", deliveryNotes: "", userName: "", registrationOwner: "",
}

const emptyReturnForm = { loanId: "", returnDate: new Date().toISOString().split("T")[0], returnKm: "" }

// ─── Page ────────────────────────────────────────────────────

export default function LoanerCarsPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const isAdmin = session?.user?.role === "ADMIN"

  const [tab, setTab] = useState<"active" | "history" | "fleet">("active")
  const [cars, setCars] = useState<LoanerCar[]>([])
  const [loans, setLoans] = useState<LoanRecord[]>([])
  const [advisors, setAdvisors] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  // Modals
  const [carModal, setCarModal] = useState(false)
  const [editCar, setEditCar] = useState<LoanerCar | null>(null)
  const [carForm, setCarForm] = useState({ ...emptyCarForm })
  const [carSaving, setCarSaving] = useState(false)

  const [loanModal, setLoanModal] = useState(false)
  const [loanForm, setLoanForm] = useState({ ...emptyLoanForm })
  const [loanSaving, setLoanSaving] = useState(false)

  const [returnModal, setReturnModal] = useState(false)
  const [returnTarget, setReturnTarget] = useState<LoanRecord | null>(null)
  const [returnForm, setReturnForm] = useState({ ...emptyReturnForm })
  const [returnSaving, setReturnSaving] = useState(false)

  // ── Load data ──────────────────────────────────────────────

  const loadCars = useCallback(async () => {
    const r = await fetch("/api/loaner-cars")
    if (r.ok) {
      const d = await r.json()
      setCars(d.cars)
    }
  }, [])

  const loadLoans = useCallback(async () => {
    const r = await fetch("/api/loaner-loans")
    if (r.ok) {
      const d = await r.json()
      setLoans(d.loans)
    }
  }, [])

  const loadAdvisors = useCallback(async () => {
    const r = await fetch("/api/users")
    if (r.ok) {
      const d = await r.json()
      // hem ADVISOR hem ADMIN kullanıcılar listelensin
      setAdvisors((d.users ?? d).map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })))
    }
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    await Promise.all([loadCars(), loadLoans(), loadAdvisors()])
    setLoading(false)
  }, [loadCars, loadLoans, loadAdvisors])

  useEffect(() => { reload() }, [reload])

  // ── Computed ───────────────────────────────────────────────

  const activeLoans = loans.filter(l => !l.isReturned)
  const overdue = activeLoans.filter(l => daysSince(l.deliveryDate) > OVERDUE_DAYS)
  const availableCars = cars.filter(c => !c.loans.length)

  // ── Car CRUD ───────────────────────────────────────────────

  function openAddCar() {
    setEditCar(null)
    setCarForm({ ...emptyCarForm })
    setCarModal(true)
  }

  function openEditCar(car: LoanerCar) {
    setEditCar(car)
    setCarForm({
      plate: car.plate,
      usagePurpose: car.usagePurpose,
      taxNo: car.taxNo,
      registrationDate: toInputDate(car.registrationDate),
      inspectionDate: toInputDate(car.inspectionDate),
      trafficInsDate: toInputDate(car.trafficInsDate),
      kaskoDate: toInputDate(car.kaskoDate),
      brand: car.brand,
      modelYear: car.modelYear.toString(),
      specs: car.specs || "",
      registrationNo: car.registrationNo,
      engineNo: car.engineNo,
      chassisNo: car.chassisNo,
    })
    setCarModal(true)
  }

  async function saveCar() {
    const required = [
      carForm.plate, carForm.taxNo, carForm.registrationDate, carForm.inspectionDate,
      carForm.trafficInsDate, carForm.kaskoDate, carForm.brand, carForm.modelYear,
      carForm.registrationNo, carForm.engineNo, carForm.chassisNo,
    ]
    if (required.some(v => !v?.trim())) {
      toast({ title: "Hata", description: "Tüm zorunlu alanları doldurunuz.", variant: "destructive" })
      return
    }

    setCarSaving(true)
    const method = editCar ? "PATCH" : "POST"
    const body = editCar ? { id: editCar.id, ...carForm } : carForm
    const r = await fetch("/api/loaner-cars", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    setCarSaving(false)

    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      toast({ title: "Hata", description: err.error ?? "Kaydedilemedi.", variant: "destructive" })
      return
    }
    toast({ title: "Kaydedildi", description: editCar ? "Araç bilgileri güncellendi." : "Araç sisteme eklendi." })
    setCarModal(false)
    reload()
  }

  async function deleteCar(id: string) {
    if (!confirm("Bu araç pasife alınacak. Emin misiniz?")) return
    const r = await fetch(`/api/loaner-cars?id=${id}`, { method: "DELETE" })
    if (r.ok) {
      toast({ title: "Pasife alındı" })
      reload()
    }
  }

  // ── Loan creation ──────────────────────────────────────────

  function openLoan(carId?: string) {
    setLoanForm({ ...emptyLoanForm, loanerCarId: carId || "" })
    setLoanModal(true)
  }

  async function saveLoan() {
    const required = [
      loanForm.loanerCarId, loanForm.advisorName, loanForm.customerPlate,
      loanForm.jobCardNo, loanForm.jobCardDate, loanForm.deliveryDate,
      loanForm.deliveryKm, loanForm.deliveryNotes, loanForm.userName, loanForm.registrationOwner,
    ]
    if (required.some(v => !v?.toString().trim())) {
      toast({ title: "Hata", description: "Tüm alanlar zorunludur.", variant: "destructive" })
      return
    }

    setLoanSaving(true)
    const r = await fetch("/api/loaner-loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loanForm),
    })
    setLoanSaving(false)

    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      toast({ title: "Hata", description: err.error ?? "Kayıt oluşturulamadı.", variant: "destructive" })
      return
    }
    toast({ title: "İkame verildi", description: "Araç başarıyla teslim edildi olarak kaydedildi." })
    setLoanModal(false)
    reload()
  }

  // ── Return processing ──────────────────────────────────────

  function openReturn(loan: LoanRecord) {
    setReturnTarget(loan)
    setReturnForm({ loanId: loan.id, returnDate: new Date().toISOString().split("T")[0], returnKm: "" })
    setReturnModal(true)
  }

  async function saveReturn() {
    if (!returnForm.returnDate || !returnForm.returnKm) {
      toast({ title: "Hata", description: "Dönüş tarihi ve km zorunludur.", variant: "destructive" })
      return
    }
    if (returnTarget && parseInt(returnForm.returnKm) < returnTarget.deliveryKm) {
      toast({ title: "Hata", description: "Dönüş km, veriliş km'den küçük olamaz.", variant: "destructive" })
      return
    }

    setReturnSaving(true)
    const r = await fetch("/api/loaner-loans", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: returnForm.loanId, returnDate: returnForm.returnDate, returnKm: returnForm.returnKm }),
    })
    setReturnSaving(false)

    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      toast({ title: "Hata", description: err.error ?? "İşlem başarısız.", variant: "destructive" })
      return
    }
    toast({ title: "Araç teslim alındı", description: "Dönüş kaydedildi." })
    setReturnModal(false)
    reload()
  }

  // ── Search filter ──────────────────────────────────────────

  const filteredActive = activeLoans.filter(l =>
    !search ||
    l.loanerCar.plate.includes(search.toUpperCase()) ||
    l.customerPlate.includes(search.toUpperCase()) ||
    l.advisorName.toLowerCase().includes(search.toLowerCase()) ||
    l.userName.toLowerCase().includes(search.toLowerCase())
  )

  const filteredHistory = loans.filter(l =>
    !search ||
    l.loanerCar.plate.includes(search.toUpperCase()) ||
    l.customerPlate.includes(search.toUpperCase()) ||
    l.advisorName.toLowerCase().includes(search.toLowerCase())
  )

  const filteredCars = cars.filter(c =>
    !search ||
    c.plate.includes(search.toUpperCase()) ||
    c.brand.toLowerCase().includes(search.toLowerCase()) ||
    c.specs?.toLowerCase().includes(search.toLowerCase())
  )

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Car className="h-6 w-6 text-blue-500" />
          İkame Araç Yönetimi
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} />
            Yenile
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={openAddCar}>
              <Plus className="h-4 w-4 mr-1.5" />
              Araç Ekle
            </Button>
          )}
          <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => openLoan()}>
            <ArrowRightLeft className="h-4 w-4 mr-1.5" />
            İkame Ver
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Toplam Araç" value={cars.length} color="blue" />
        <StatCard label="Müşteride" value={activeLoans.length} color="amber" />
        <StatCard label="Serviste / Müsait" value={availableCars.length} color="emerald" />
        <StatCard label="10+ Gün Geciken" value={overdue.length} color={overdue.length > 0 ? "red" : "slate"} />
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700">Araç Kiralama Talep Et!</p>
            <p className="text-sm text-red-600 mt-0.5">
              Aşağıdaki {overdue.length} araç {OVERDUE_DAYS} günü aştı. Harici kiralama başlatmanız önerilir.
            </p>
            <ul className="mt-2 space-y-0.5">
              {overdue.map(l => (
                <li key={l.id} className="text-sm text-red-700 font-medium">
                  🚗 {l.loanerCar.plate} — Müşteri: {l.customerPlate} — {daysSince(l.deliveryDate)} gün
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {[
          { key: "active", label: "Aktif İkameler", count: activeLoans.length },
          { key: "history", label: "Tüm Kayıtlar", count: loans.length },
          { key: "fleet", label: "Araç Filosu", count: cars.length },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.key
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {t.label}
            <span className={cn(
              "ml-1.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full",
              tab === t.key ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
            )}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-8 text-sm"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ── Tab: Aktif İkameler ────────────────────────────── */}
      {tab === "active" && (
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-28">İkame Plaka</TableHead>
                <TableHead>Araç</TableHead>
                <TableHead className="w-28">Müşteri Plaka</TableHead>
                <TableHead>Danışman</TableHead>
                <TableHead>İKK No</TableHead>
                <TableHead className="w-28">Veriliş Tarihi</TableHead>
                <TableHead className="w-20">Gün</TableHead>
                <TableHead>Kullanıcı</TableHead>
                <TableHead>Ruhsat Sahibi</TableHead>
                <TableHead className="w-24">Durum</TableHead>
                <TableHead className="w-24">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={11} className="text-center py-12 text-slate-400">Yükleniyor...</TableCell></TableRow>
              ) : filteredActive.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center py-12 text-slate-400">Aktif ikame araç yok</TableCell></TableRow>
              ) : filteredActive.map(loan => {
                const days = daysSince(loan.deliveryDate)
                const isOverdue = days > OVERDUE_DAYS
                const isWarning = days >= 7 && days <= OVERDUE_DAYS
                return (
                  <TableRow key={loan.id} className={cn(isOverdue && "bg-red-50/60")}>
                    <TableCell className="font-mono font-semibold text-sm">{loan.loanerCar.plate}</TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {loan.loanerCar.brand} {loan.loanerCar.modelYear}<br />
                      <span className="text-slate-400">{loan.loanerCar.specs}</span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{loan.customerPlate}</TableCell>
                    <TableCell className="text-sm">{loan.advisorName}</TableCell>
                    <TableCell className="text-sm font-mono">{loan.jobCardNo}</TableCell>
                    <TableCell className="text-sm">{fmtDate(loan.deliveryDate)}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-sm font-bold",
                        isOverdue ? "text-red-600" : isWarning ? "text-amber-600" : "text-emerald-600"
                      )}>
                        {days}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{loan.userName}</TableCell>
                    <TableCell className="text-sm">{loan.registrationOwner}</TableCell>
                    <TableCell>
                      {isOverdue ? (
                        <Badge variant="destructive" className="text-[10px]">GECİKMİŞ</Badge>
                      ) : isWarning ? (
                        <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">UYARI</Badge>
                      ) : (
                        <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">AKTİF</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                        onClick={() => openReturn(loan)}
                      >
                        <ArrowLeft className="h-3 w-3 mr-1" />
                        Al
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Tab: Tüm Kayıtlar ─────────────────────────────── */}
      {tab === "history" && (
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-28">İkame Plaka</TableHead>
                <TableHead>Araç</TableHead>
                <TableHead className="w-28">Müşteri Plaka</TableHead>
                <TableHead>Danışman</TableHead>
                <TableHead>İKK No</TableHead>
                <TableHead className="w-28">Veriliş</TableHead>
                <TableHead className="w-28">Dönüş</TableHead>
                <TableHead className="w-16">Gün</TableHead>
                <TableHead>Kullanıcı</TableHead>
                <TableHead className="w-28">Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-12 text-slate-400">Yükleniyor...</TableCell></TableRow>
              ) : filteredHistory.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-12 text-slate-400">Kayıt bulunamadı</TableCell></TableRow>
              ) : filteredHistory.map(loan => {
                const days = loan.isReturned
                  ? Math.floor((new Date(loan.returnDate!).getTime() - new Date(loan.deliveryDate).getTime()) / (1000 * 60 * 60 * 24))
                  : daysSince(loan.deliveryDate)
                return (
                  <TableRow key={loan.id}>
                    <TableCell className="font-mono font-semibold text-sm">{loan.loanerCar.plate}</TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {loan.loanerCar.brand} {loan.loanerCar.modelYear}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{loan.customerPlate}</TableCell>
                    <TableCell className="text-sm">{loan.advisorName}</TableCell>
                    <TableCell className="text-sm font-mono">{loan.jobCardNo}</TableCell>
                    <TableCell className="text-sm">{fmtDate(loan.deliveryDate)}</TableCell>
                    <TableCell className="text-sm">{fmtDate(loan.returnDate)}</TableCell>
                    <TableCell className="text-sm font-semibold">{days}</TableCell>
                    <TableCell className="text-sm">{loan.userName}</TableCell>
                    <TableCell>
                      {loan.isReturned ? (
                        <Badge className="text-[10px] bg-slate-100 text-slate-600 border-slate-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          TAMAMLANDI
                        </Badge>
                      ) : days > OVERDUE_DAYS ? (
                        <Badge variant="destructive" className="text-[10px]">GECİKMİŞ</Badge>
                      ) : (
                        <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-200">
                          <Clock className="h-3 w-3 mr-1" />
                          DEVAM EDİYOR
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Tab: Araç Filosu ──────────────────────────────── */}
      {tab === "fleet" && (
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-28">Plaka</TableHead>
                <TableHead>Marka / Araç</TableHead>
                <TableHead className="w-20">Model Yılı</TableHead>
                <TableHead>Kullanım Amacı</TableHead>
                <TableHead>Vergi No</TableHead>
                <TableHead className="w-28">VİZE</TableHead>
                <TableHead className="w-28">TRAFİK</TableHead>
                <TableHead className="w-28">KASKO</TableHead>
                <TableHead>Ruhsat No</TableHead>
                <TableHead className="w-28">Durum</TableHead>
                {isAdmin && <TableHead className="w-24">İşlem</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={isAdmin ? 11 : 10} className="text-center py-12 text-slate-400">Yükleniyor...</TableCell></TableRow>
              ) : filteredCars.length === 0 ? (
                <TableRow><TableCell colSpan={isAdmin ? 11 : 10} className="text-center py-12 text-slate-400">Araç bulunamadı</TableCell></TableRow>
              ) : filteredCars.map(car => {
                const isOut = car.loans.length > 0
                return (
                  <TableRow key={car.id}>
                    <TableCell className="font-mono font-semibold text-sm">{car.plate}</TableCell>
                    <TableCell>
                      <span className="font-medium text-sm">{car.brand}</span>
                      {car.specs && <span className="block text-xs text-slate-500">{car.specs}</span>}
                    </TableCell>
                    <TableCell className="text-sm text-center">{car.modelYear}</TableCell>
                    <TableCell className="text-xs text-slate-600">{car.usagePurpose}</TableCell>
                    <TableCell className="text-sm font-mono">{car.taxNo}</TableCell>
                    <TableCell className="text-sm">{fmtDate(car.inspectionDate)}</TableCell>
                    <TableCell className="text-sm">{fmtDate(car.trafficInsDate)}</TableCell>
                    <TableCell className="text-sm">{fmtDate(car.kaskoDate)}</TableCell>
                    <TableCell className="text-sm font-mono">{car.registrationNo}</TableCell>
                    <TableCell>
                      {isOut ? (
                        <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">MÜŞTERİDE</Badge>
                      ) : (
                        <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">
                          <Wrench className="h-3 w-3 mr-1" />
                          MÜSAİT
                        </Badge>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditCar(car)} title="Düzenle">
                            <Pencil className="h-3.5 w-3.5 text-slate-500" />
                          </Button>
                          {!isOut && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => deleteCar(car.id)} title="Pasife Al">
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          MODAL: Araç Ekle / Düzenle
          ──────────────────────────────────────────────────── */}
      <Dialog open={carModal} onOpenChange={setCarModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editCar ? "Araç Düzenle" : "Araç Ekle"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <Field label="Plaka *" value={carForm.plate} onChange={v => setCarForm(f => ({ ...f, plate: v }))} upper />
            <Field label="Kullanım Amacı *" value={carForm.usagePurpose} onChange={v => setCarForm(f => ({ ...f, usagePurpose: v }))} />
            <Field label="Vergi No *" value={carForm.taxNo} onChange={v => setCarForm(f => ({ ...f, taxNo: v }))} />
            <Field label="Tescil Tarihi *" type="date" value={carForm.registrationDate} onChange={v => setCarForm(f => ({ ...f, registrationDate: v }))} />
            <Field label="Muayene/Vize Tarihi *" type="date" value={carForm.inspectionDate} onChange={v => setCarForm(f => ({ ...f, inspectionDate: v }))} />
            <Field label="Trafik Sigortası *" type="date" value={carForm.trafficInsDate} onChange={v => setCarForm(f => ({ ...f, trafficInsDate: v }))} />
            <Field label="Kasko Tarihi *" type="date" value={carForm.kaskoDate} onChange={v => setCarForm(f => ({ ...f, kaskoDate: v }))} />
            <Field label="Marka *" value={carForm.brand} onChange={v => setCarForm(f => ({ ...f, brand: v }))} upper />
            <Field label="Model Yılı *" type="number" value={carForm.modelYear} onChange={v => setCarForm(f => ({ ...f, modelYear: v }))} />
            <Field label="Araç Özellikleri" value={carForm.specs} onChange={v => setCarForm(f => ({ ...f, specs: v }))} />
            <Field label="Ruhsat No *" value={carForm.registrationNo} onChange={v => setCarForm(f => ({ ...f, registrationNo: v }))} />
            <Field label="Motor No *" value={carForm.engineNo} onChange={v => setCarForm(f => ({ ...f, engineNo: v }))} />
            <div className="col-span-2">
              <Field label="Şasi No *" value={carForm.chassisNo} onChange={v => setCarForm(f => ({ ...f, chassisNo: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCarModal(false)}>İptal</Button>
            <Button onClick={saveCar} disabled={carSaving}>
              {carSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ────────────────────────────────────────────────────────
          MODAL: İkame Ver
          ──────────────────────────────────────────────────── */}
      <Dialog open={loanModal} onOpenChange={setLoanModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-emerald-500" />
              İkame Araç Ver
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {/* Araç seçimi */}
            <div className="col-span-2">
              <Label className="text-xs text-slate-600 mb-1 block">İkame Araç *</Label>
              <select
                className="w-full border border-slate-200 rounded-md h-9 px-3 text-sm bg-white"
                value={loanForm.loanerCarId}
                onChange={e => setLoanForm(f => ({ ...f, loanerCarId: e.target.value }))}
              >
                <option value="">Araç seçiniz...</option>
                {cars.filter(c => !c.loans.length).map(c => (
                  <option key={c.id} value={c.id}>
                    {c.plate} — {c.brand} {c.specs || ""} ({c.modelYear})
                  </option>
                ))}
              </select>
            </div>
            {/* Danışman dropdown */}
            <div>
              <Label className="text-xs text-slate-600 mb-1 block">Danışman *</Label>
              <select
                className="w-full border border-slate-200 rounded-md h-9 px-3 text-sm bg-white"
                value={loanForm.advisorName}
                onChange={e => setLoanForm(f => ({ ...f, advisorName: e.target.value }))}
              >
                <option value="">Danışman seçiniz...</option>
                {advisors.map(a => (
                  <option key={a.id} value={a.name}>{a.name}</option>
                ))}
              </select>
            </div>
            <Field label="Müşteri Plaka *" value={loanForm.customerPlate} onChange={v => setLoanForm(f => ({ ...f, customerPlate: v }))} upper />
            <Field label="İKK No *" value={loanForm.jobCardNo} onChange={v => setLoanForm(f => ({ ...f, jobCardNo: v }))} />
            <Field label="İKK Açılış Tarihi *" type="date" value={loanForm.jobCardDate} onChange={v => setLoanForm(f => ({ ...f, jobCardDate: v }))} />
            <Field label="Veriliş Tarihi *" type="date" value={loanForm.deliveryDate} onChange={v => setLoanForm(f => ({ ...f, deliveryDate: v }))} />
            <Field label="Veriliş Km *" type="number" value={loanForm.deliveryKm} onChange={v => setLoanForm(f => ({ ...f, deliveryKm: v }))} />
            <Field label="Kullanıcı (Ad Soyad) *" value={loanForm.userName} onChange={v => setLoanForm(f => ({ ...f, userName: v }))} />
            <Field label="Ruhsat Sahibi *" value={loanForm.registrationOwner} onChange={v => setLoanForm(f => ({ ...f, registrationOwner: v }))} />
            <div className="col-span-2">
              <Field label="Veriliş Açıklaması *" value={loanForm.deliveryNotes} onChange={v => setLoanForm(f => ({ ...f, deliveryNotes: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoanModal(false)}>İptal</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={saveLoan} disabled={loanSaving}>
              {loanSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Aracı Teslim Et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ────────────────────────────────────────────────────────
          MODAL: Araç Dönüş
          ──────────────────────────────────────────────────── */}
      <Dialog open={returnModal} onOpenChange={setReturnModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeft className="h-5 w-5 text-blue-500" />
              Araç Teslim Al
            </DialogTitle>
          </DialogHeader>
          {returnTarget && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1 border border-slate-200 mb-2">
              <p><span className="text-slate-500">İkame Plaka:</span> <strong className="font-mono">{returnTarget.loanerCar.plate}</strong></p>
              <p><span className="text-slate-500">Müşteri Plaka:</span> <strong className="font-mono">{returnTarget.customerPlate}</strong></p>
              <p><span className="text-slate-500">Danışman:</span> {returnTarget.advisorName}</p>
              <p><span className="text-slate-500">Veriliş Tarihi:</span> {fmtDate(returnTarget.deliveryDate)} — {returnTarget.deliveryKm.toLocaleString("tr-TR")} km</p>
              <p><span className="text-slate-500">Kullanım Süresi:</span> <strong className={cn(
                daysSince(returnTarget.deliveryDate) > OVERDUE_DAYS ? "text-red-600" : "text-slate-800"
              )}>{daysSince(returnTarget.deliveryDate)} gün</strong></p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dönüş Tarihi *" type="date" value={returnForm.returnDate} onChange={v => setReturnForm(f => ({ ...f, returnDate: v }))} />
            <Field label="Dönüş Km *" type="number" value={returnForm.returnKm} onChange={v => setReturnForm(f => ({ ...f, returnKm: v }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnModal(false)}>İptal</Button>
            <Button onClick={saveReturn} disabled={returnSaving}>
              {returnSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Teslim Al
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

// ─── Reusable Field ───────────────────────────────────────────

function Field({
  label, value, onChange, type = "text", upper,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  upper?: boolean
}) {
  return (
    <div>
      <Label className="text-xs text-slate-600 mb-1 block">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={e => onChange(upper ? e.target.value.toUpperCase() : e.target.value)}
        className="h-9 text-sm"
      />
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    red: "bg-red-50 border-red-200 text-red-700",
    slate: "bg-slate-50 border-slate-200 text-slate-600",
  }
  return (
    <div className={cn("rounded-lg border p-4", colors[color] || colors.slate)}>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  )
}
