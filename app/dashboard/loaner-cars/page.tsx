"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import {
  Car, Plus, ArrowRightLeft, ArrowLeft, AlertTriangle,
  CheckCircle2, Clock, Wrench, Search, RefreshCw, Pencil, X, Loader2,
  ChevronUp, ChevronDown, ChevronsUpDown, FileText, Upload, Trash2, ExternalLink,
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
  contractFileUrl: string | null
  licenseFileUrl: string | null
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

// Araç ver / al / araç ekle-sil
const LOANER_OPERATORS = ["serdar güler", "handan özçetin", "özgür zavalsız"]

// Aktif ikame kaydını düzenleyebilecek kullanıcılar
const LOAN_EDITORS = ["serdar güler", "handan özçetin", "özgür zavalsız"]

function normName(n: string) {
  return n.toLowerCase().trim()
    .replace(/İ/g, "i").replace(/I/g, "ı")  // Türkçe büyük harf sorunu
}

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
  const myName = normName(session?.user?.name ?? "")
  const canOperate  = LOANER_OPERATORS.some(n => normName(n) === myName)
  const canEditLoan = LOAN_EDITORS.some(n => normName(n) === myName)

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

  // Edit loan
  const [editLoanModal, setEditLoanModal] = useState(false)
  const [editLoanTarget, setEditLoanTarget] = useState<LoanRecord | null>(null)
  const [editLoanForm, setEditLoanForm] = useState({ ...emptyLoanForm })
  const [editLoanSaving, setEditLoanSaving] = useState(false)

  // Detail view (read-only)
  const [detailModal, setDetailModal] = useState(false)
  const [detailLoan, setDetailLoan] = useState<LoanRecord | null>(null)

  // File uploads (İkame Ver)
  const [loanContractFile, setLoanContractFile] = useState<File | null>(null)
  const [loanLicenseFile,  setLoanLicenseFile]  = useState<File | null>(null)

  // File uploads (Kayıt Düzenle)
  const [editContractFile, setEditContractFile] = useState<File | null>(null)
  const [editLicenseFile,  setEditLicenseFile]  = useState<File | null>(null)
  const [fileUploading,    setFileUploading]    = useState(false)

  // Filters & sort
  type SortDir = "asc" | "desc"
  const [activeSort, setActiveSort] = useState<{ field: string; dir: SortDir }>({ field: "deliveryDate", dir: "desc" })
  const [fleetSort, setFleetSort] = useState<{ field: string; dir: SortDir }>({ field: "plate", dir: "asc" })
  const [fleetFilter,   setFleetFilter]   = useState<"all" | "available" | "out">("all")
  const [activeFilter,  setActiveFilter]  = useState<"all" | "active" | "warning" | "overdue">("all")
  const [historyFilter, setHistoryFilter] = useState<"all" | "ongoing" | "done" | "overdue">("all")

  // Pagination — Tüm Kayıtlar
  const HISTORY_PAGE_SIZE = 20
  const [historyPage, setHistoryPage] = useState(1)

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
    const r = await fetch("/api/users?namesOnly=true")
    if (r.ok) {
      const d = await r.json()
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

  async function uploadFile(loanId: string, file: File, fileType: "contract" | "license") {
    const fd = new FormData()
    fd.append("file", file)
    fd.append("loanId", loanId)
    fd.append("fileType", fileType)
    const r = await fetch("/api/loaner-loans/upload", { method: "POST", body: fd })
    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      throw new Error(err.error ?? "Dosya yüklenemedi")
    }
  }

  async function deleteFile(loanId: string, fileType: "contract" | "license") {
    await fetch("/api/loaner-loans/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loanId, fileType }),
    })
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

    if (!r.ok) {
      setLoanSaving(false)
      const err = await r.json().catch(() => ({}))
      toast({ title: "Hata", description: err.error ?? "Kayıt oluşturulamadı.", variant: "destructive" })
      return
    }

    const { loan: newLoan } = await r.json()

    // Dosyaları yükle
    try {
      if (loanContractFile) await uploadFile(newLoan.id, loanContractFile, "contract")
      if (loanLicenseFile)  await uploadFile(newLoan.id, loanLicenseFile,  "license")
    } catch (e: unknown) {
      toast({ title: "Uyarı", description: `Araç kaydedildi ancak dosya yüklenemedi: ${e instanceof Error ? e.message : String(e)}`, variant: "destructive" })
    }

    setLoanSaving(false)
    toast({ title: "İkame verildi", description: "Araç başarıyla teslim edildi olarak kaydedildi." })
    setLoanModal(false)
    setLoanContractFile(null)
    setLoanLicenseFile(null)
    reload()
  }

  // ── Edit loan ──────────────────────────────────────────────

  function openEditLoan(loan: LoanRecord) {
    setEditLoanTarget(loan)
    setEditLoanForm({
      loanerCarId: loan.loanerCarId,
      advisorName: loan.advisorName,
      customerPlate: loan.customerPlate,
      jobCardNo: loan.jobCardNo,
      jobCardDate: toInputDate(loan.jobCardDate),
      deliveryDate: toInputDate(loan.deliveryDate),
      deliveryKm: loan.deliveryKm.toString(),
      deliveryNotes: loan.deliveryNotes,
      userName: loan.userName,
      registrationOwner: loan.registrationOwner,
    })
    setEditLoanModal(true)
  }

  async function saveEditLoan() {
    const required = [
      editLoanForm.advisorName, editLoanForm.customerPlate, editLoanForm.jobCardNo,
      editLoanForm.jobCardDate, editLoanForm.deliveryDate, editLoanForm.deliveryKm,
      editLoanForm.deliveryNotes, editLoanForm.userName, editLoanForm.registrationOwner,
    ]
    if (required.some(v => !v?.toString().trim())) {
      toast({ title: "Hata", description: "Tüm alanlar zorunludur.", variant: "destructive" })
      return
    }
    setEditLoanSaving(true)
    const r = await fetch("/api/loaner-loans", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editLoanTarget!.id, ...editLoanForm }),
    })

    if (!r.ok) {
      setEditLoanSaving(false)
      const err = await r.json().catch(() => ({}))
      toast({ title: "Hata", description: err.error ?? "Güncellenemedi.", variant: "destructive" })
      return
    }

    // Dosyaları yükle
    try {
      if (editContractFile) await uploadFile(editLoanTarget!.id, editContractFile, "contract")
      if (editLicenseFile)  await uploadFile(editLoanTarget!.id, editLicenseFile,  "license")
    } catch (e: unknown) {
      toast({ title: "Uyarı", description: `Kayıt güncellendi ancak dosya yüklenemedi: ${e instanceof Error ? e.message : String(e)}`, variant: "destructive" })
    }

    setEditLoanSaving(false)
    toast({ title: "Güncellendi", description: "Kayıt başarıyla düzenlendi." })
    setEditLoanModal(false)
    setEditContractFile(null)
    setEditLicenseFile(null)
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

  function sortBy<T>(arr: T[], field: string, dir: SortDir): T[] {
    return [...arr].sort((a, b) => {
      const av = (a as Record<string, unknown>)[field]
      const bv = (b as Record<string, unknown>)[field]
      const av2 = typeof av === "string" ? av.toLowerCase() : (av ?? 0)
      const bv2 = typeof bv === "string" ? bv.toLowerCase() : (bv ?? 0)
      if (av2 < bv2) return dir === "asc" ? -1 : 1
      if (av2 > bv2) return dir === "asc" ? 1 : -1
      return 0
    })
  }

  function toggleSort(
    cur: { field: string; dir: SortDir },
    set: (v: { field: string; dir: SortDir }) => void,
    field: string
  ) {
    if (cur.field === field) set({ field, dir: cur.dir === "asc" ? "desc" : "asc" })
    else set({ field, dir: "asc" })
  }

  const filteredActive = sortBy(
    activeLoans.filter(l => {
      const matchSearch = !search ||
        l.loanerCar.plate.includes(search.toUpperCase()) ||
        l.customerPlate.includes(search.toUpperCase()) ||
        l.advisorName.toLowerCase().includes(search.toLowerCase()) ||
        l.userName.toLowerCase().includes(search.toLowerCase())
      const days = daysSince(l.deliveryDate)
      const matchStatus =
        activeFilter === "all" ||
        (activeFilter === "overdue"  && days > OVERDUE_DAYS) ||
        (activeFilter === "warning"  && days >= 7 && days <= OVERDUE_DAYS) ||
        (activeFilter === "active"   && days < 7)
      return matchSearch && matchStatus
    }),
    activeSort.field === "plate" ? "loanerCar" : activeSort.field,
    activeSort.dir
  )

  const filteredHistory = loans.filter(l => {
    const matchSearch = !search ||
      l.loanerCar.plate.includes(search.toUpperCase()) ||
      l.customerPlate.includes(search.toUpperCase()) ||
      l.advisorName.toLowerCase().includes(search.toLowerCase())
    const days = l.isReturned
      ? Math.floor((new Date(l.returnDate!).getTime() - new Date(l.deliveryDate).getTime()) / 86400000)
      : daysSince(l.deliveryDate)
    const matchStatus =
      historyFilter === "all" ||
      (historyFilter === "done"    && l.isReturned) ||
      (historyFilter === "ongoing" && !l.isReturned && days <= OVERDUE_DAYS) ||
      (historyFilter === "overdue" && !l.isReturned && days > OVERDUE_DAYS)
    return matchSearch && matchStatus
  })
  const historyTotalPages = Math.max(1, Math.ceil(filteredHistory.length / HISTORY_PAGE_SIZE))
  const pagedHistory = filteredHistory.slice(
    (historyPage - 1) * HISTORY_PAGE_SIZE,
    historyPage * HISTORY_PAGE_SIZE
  )

  const filteredCars = sortBy(
    cars.filter(c => {
      const matchSearch = !search ||
        c.plate.includes(search.toUpperCase()) ||
        c.brand.toLowerCase().includes(search.toLowerCase()) ||
        c.specs?.toLowerCase().includes(search.toLowerCase())
      const isOut = c.loans.length > 0
      const matchStatus =
        fleetFilter === "all" ||
        (fleetFilter === "available" && !isOut) ||
        (fleetFilter === "out" && isOut)
      return matchSearch && matchStatus
    }),
    fleetSort.field,
    fleetSort.dir
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
          <Button size="sm" onClick={openAddCar} disabled={!canOperate} title={!canOperate ? "Bu işlem için yetkiniz yok" : undefined}>
            <Plus className="h-4 w-4 mr-1.5" />
            Araç Ekle
          </Button>
          <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => openLoan()} disabled={!canOperate}
            title={!canOperate ? "Bu işlem için yetkiniz yok" : undefined}>
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
          onChange={e => { setSearch(e.target.value); setHistoryPage(1) }}
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
        <div className="space-y-3">
        <FilterBar
          value={activeFilter}
          onChange={v => { setActiveFilter(v as typeof activeFilter); }}
          options={[
            { key: "all",     label: "Tümü",      count: activeLoans.length },
            { key: "active",  label: "Normal",    count: activeLoans.filter(l => daysSince(l.deliveryDate) < 7).length },
            { key: "warning", label: "Uyarı",     count: activeLoans.filter(l => { const d = daysSince(l.deliveryDate); return d >= 7 && d <= OVERDUE_DAYS }).length },
            { key: "overdue", label: "Gecikmiş",  count: activeLoans.filter(l => daysSince(l.deliveryDate) > OVERDUE_DAYS).length },
          ]}
          colors={{ active: "bg-slate-600", warning: "bg-orange-500", overdue: "bg-red-600" }}
        />
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <SortHead label="İkame Plaka"    field="plate"              sort={activeSort} onSort={f => toggleSort(activeSort, setActiveSort, f)} className="w-28" />
                <TableHead className={TH_BASE}>Araç</TableHead>
                <SortHead label="Müşteri Plaka"  field="customerPlate"      sort={activeSort} onSort={f => toggleSort(activeSort, setActiveSort, f)} className="w-28" />
                <SortHead label="Danışman"        field="advisorName"        sort={activeSort} onSort={f => toggleSort(activeSort, setActiveSort, f)} />
                <SortHead label="İKK No"          field="jobCardNo"          sort={activeSort} onSort={f => toggleSort(activeSort, setActiveSort, f)} />
                <SortHead label="Veriliş Tarihi"  field="deliveryDate"       sort={activeSort} onSort={f => toggleSort(activeSort, setActiveSort, f)} className="w-28" />
                <SortHead label="Gün"             field="deliveryDate"       sort={activeSort} onSort={f => toggleSort(activeSort, setActiveSort, f)} className="w-16" />
                <SortHead label="Kullanıcı"       field="userName"           sort={activeSort} onSort={f => toggleSort(activeSort, setActiveSort, f)} />
                <SortHead label="Ruhsat Sahibi"   field="registrationOwner"  sort={activeSort} onSort={f => toggleSort(activeSort, setActiveSort, f)} />
                <TableHead className={cn(TH_BASE, "w-24")}>Durum</TableHead>
                <TableHead className={cn(TH_BASE, "w-28")}>İşlem</TableHead>
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
                  <TableRow
                    key={loan.id}
                    className={cn(
                      "cursor-pointer hover:bg-slate-50/80 transition-colors",
                      isOverdue && "bg-red-50/60 hover:bg-red-50"
                    )}
                    onClick={() => { setDetailLoan(loan); setDetailModal(true) }}
                  >
                    <TableCell className="font-mono text-sm font-semibold text-slate-900">{loan.loanerCar.plate}</TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-700">{loan.loanerCar.brand} {loan.loanerCar.modelYear}</span>
                      {loan.loanerCar.specs && <span className="block text-xs text-slate-400">{loan.loanerCar.specs}</span>}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-slate-700">{loan.customerPlate}</TableCell>
                    <TableCell className="text-sm text-slate-700">{loan.advisorName}</TableCell>
                    <TableCell className="font-mono text-sm text-slate-700">{loan.jobCardNo}</TableCell>
                    <TableCell className="text-sm text-slate-700">{fmtDate(loan.deliveryDate)}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-sm font-semibold tabular-nums",
                        isOverdue ? "text-red-600" : isWarning ? "text-amber-600" : "text-slate-700"
                      )}>
                        {days}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">{loan.userName}</TableCell>
                    <TableCell className="text-sm text-slate-700">{loan.registrationOwner}</TableCell>
                    <TableCell>
                      {isOverdue ? (
                        <Badge className="text-[10px] whitespace-nowrap bg-red-100 text-red-700 border-red-200">GECİKMİŞ</Badge>
                      ) : isWarning ? (
                        <Badge className="text-[10px] whitespace-nowrap bg-orange-100 text-orange-700 border-orange-200">UYARI</Badge>
                      ) : (
                        <Badge className="text-[10px] whitespace-nowrap bg-orange-100 text-orange-700 border-orange-200">AKTİF</Badge>
                      )}
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {canEditLoan && (
                          <Button
                            size="sm" variant="ghost" className="h-7 w-7 p-0"
                            onClick={() => openEditLoan(loan)}
                            title="Düzenle"
                          >
                            <Pencil className="h-3.5 w-3.5 text-slate-500" />
                          </Button>
                        )}
                        <Button
                          size="sm" variant="outline"
                          className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                          onClick={() => openReturn(loan)}
                          disabled={!canOperate}
                          title={!canOperate ? "Bu işlem için yetkiniz yok" : undefined}
                        >
                          <ArrowLeft className="h-3 w-3 mr-1" />
                          Al
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        </div>
      )}

      {/* ── Tab: Tüm Kayıtlar ─────────────────────────────── */}
      {tab === "history" && (
        <div className="space-y-3">
          <FilterBar
            value={historyFilter}
            onChange={v => { setHistoryFilter(v as typeof historyFilter); setHistoryPage(1); }}
            options={[
              { key: "all",     label: "Tümü",        count: loans.length },
              { key: "ongoing", label: "Devam",        count: loans.filter(l => !l.isReturned && daysSince(l.deliveryDate) <= OVERDUE_DAYS).length },
              { key: "overdue", label: "Gecikmiş",     count: loans.filter(l => !l.isReturned && daysSince(l.deliveryDate) > OVERDUE_DAYS).length },
              { key: "done",    label: "Tamamlandı",   count: loans.filter(l => l.isReturned).length },
            ]}
            colors={{ ongoing: "bg-orange-500", overdue: "bg-red-600", done: "bg-emerald-600" }}
          />
          <div className="rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className={cn(TH_BASE, "w-28")}>İkame Plaka</TableHead>
                  <TableHead className={TH_BASE}>Araç</TableHead>
                  <TableHead className={cn(TH_BASE, "w-28")}>Müşteri Plaka</TableHead>
                  <TableHead className={TH_BASE}>Danışman</TableHead>
                  <TableHead className={TH_BASE}>İKK No</TableHead>
                  <TableHead className={cn(TH_BASE, "w-28")}>Veriliş</TableHead>
                  <TableHead className={cn(TH_BASE, "w-28")}>Dönüş</TableHead>
                  <TableHead className={cn(TH_BASE, "w-16")}>Gün</TableHead>
                  <TableHead className={TH_BASE}>Kullanıcı</TableHead>
                  <TableHead className={cn(TH_BASE, "w-28")}>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-12 text-slate-400">Yükleniyor...</TableCell></TableRow>
                ) : pagedHistory.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-12 text-slate-400">Kayıt bulunamadı</TableCell></TableRow>
                ) : pagedHistory.map((loan, idx) => {
                  const days = loan.isReturned
                    ? Math.floor((new Date(loan.returnDate!).getTime() - new Date(loan.deliveryDate).getTime()) / (1000 * 60 * 60 * 24))
                    : daysSince(loan.deliveryDate)
                  return (
                    <TableRow key={loan.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                      <TableCell className="font-mono text-sm font-semibold text-slate-900">{loan.loanerCar.plate}</TableCell>
                      <TableCell className="text-sm text-slate-700">{loan.loanerCar.brand} {loan.loanerCar.modelYear}</TableCell>
                      <TableCell className="font-mono text-sm text-slate-700">{loan.customerPlate}</TableCell>
                      <TableCell className="text-sm text-slate-700">{loan.advisorName}</TableCell>
                      <TableCell className="font-mono text-sm text-slate-700">{loan.jobCardNo}</TableCell>
                      <TableCell className="text-sm text-slate-700">{fmtDate(loan.deliveryDate)}</TableCell>
                      <TableCell className="text-sm text-slate-700">{fmtDate(loan.returnDate)}</TableCell>
                      <TableCell className="text-sm font-semibold tabular-nums text-slate-700">{days}</TableCell>
                      <TableCell className="text-sm text-slate-700">{loan.userName}</TableCell>
                      <TableCell>
                        {loan.isReturned ? (
                          <Badge className="text-[10px] whitespace-nowrap bg-emerald-100 text-emerald-700 border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 mr-1 shrink-0" />
                            TAMAMLANDI
                          </Badge>
                        ) : days > OVERDUE_DAYS ? (
                          <Badge className="text-[10px] whitespace-nowrap bg-red-100 text-red-700 border-red-200">GECİKMİŞ</Badge>
                        ) : (
                          <Badge className="text-[10px] whitespace-nowrap bg-orange-100 text-orange-700 border-orange-200">
                            <Clock className="h-3 w-3 mr-1 shrink-0" />
                            DEVAM
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {historyTotalPages > 1 && (
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-slate-500">
                Toplam <strong>{filteredHistory.length}</strong> kayıt — Sayfa {historyPage} / {historyTotalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs"
                  onClick={() => setHistoryPage(1)} disabled={historyPage === 1}>«</Button>
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs"
                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage === 1}>‹</Button>
                {Array.from({ length: historyTotalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === historyTotalPages || Math.abs(p - historyPage) <= 2)
                  .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...")
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={`dots-${i}`} className="px-1 text-slate-400 text-xs">…</span>
                    ) : (
                      <Button key={p} variant={historyPage === p ? "default" : "outline"}
                        size="sm" className="h-7 w-7 p-0 text-xs"
                        onClick={() => setHistoryPage(p as number)}>
                        {p}
                      </Button>
                    )
                  )}
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs"
                  onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))} disabled={historyPage === historyTotalPages}>›</Button>
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs"
                  onClick={() => setHistoryPage(historyTotalPages)} disabled={historyPage === historyTotalPages}>»</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Araç Filosu ──────────────────────────────── */}
      {tab === "fleet" && (
        <>
          <FilterBar
            value={fleetFilter}
            onChange={v => setFleetFilter(v as typeof fleetFilter)}
            options={[
              { key: "all",       label: "Tümü",       count: cars.length },
              { key: "available", label: "Müsait",     count: cars.filter(c => !c.loans.length).length },
              { key: "out",       label: "Müşteride",  count: cars.filter(c => c.loans.length > 0).length },
            ]}
            colors={{ available: "bg-emerald-600", out: "bg-orange-500" }}
          />
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <SortHead label="Plaka"        field="plate"          sort={fleetSort} onSort={f => toggleSort(fleetSort, setFleetSort, f)} className="w-28" />
                <SortHead label="Marka / Araç" field="brand"          sort={fleetSort} onSort={f => toggleSort(fleetSort, setFleetSort, f)} />
                <SortHead label="Model Yılı"   field="modelYear"      sort={fleetSort} onSort={f => toggleSort(fleetSort, setFleetSort, f)} className="w-20" />
                <TableHead className={TH_BASE}>Kullanım Amacı</TableHead>
                <TableHead className={TH_BASE}>Vergi No</TableHead>
                <SortHead label="Vize"         field="inspectionDate" sort={fleetSort} onSort={f => toggleSort(fleetSort, setFleetSort, f)} className="w-28" />
                <SortHead label="Trafik"       field="trafficInsDate" sort={fleetSort} onSort={f => toggleSort(fleetSort, setFleetSort, f)} className="w-28" />
                <SortHead label="Kasko"        field="kaskoDate"      sort={fleetSort} onSort={f => toggleSort(fleetSort, setFleetSort, f)} className="w-28" />
                <TableHead className={TH_BASE}>Ruhsat No</TableHead>
                <TableHead className={cn(TH_BASE, "w-28")}>Durum</TableHead>
                <TableHead className={cn(TH_BASE, "w-24")}>İşlem</TableHead>
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
                    <TableCell className="font-mono text-sm font-semibold text-slate-900">{car.plate}</TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-700 font-medium">{car.brand}</span>
                      {car.specs && <span className="block text-xs text-slate-400">{car.specs}</span>}
                    </TableCell>
                    <TableCell className="text-sm text-slate-700 text-center">{car.modelYear}</TableCell>
                    <TableCell className="text-sm text-slate-700">{car.usagePurpose}</TableCell>
                    <TableCell className="font-mono text-sm text-slate-700">{car.taxNo}</TableCell>
                    <TableCell className="text-sm text-slate-700">{fmtDate(car.inspectionDate)}</TableCell>
                    <TableCell className="text-sm text-slate-700">{fmtDate(car.trafficInsDate)}</TableCell>
                    <TableCell className="text-sm text-slate-700">{fmtDate(car.kaskoDate)}</TableCell>
                    <TableCell className="font-mono text-sm text-slate-700">{car.registrationNo}</TableCell>
                    <TableCell>
                      {isOut ? (
                        <Badge className="text-[10px] whitespace-nowrap bg-amber-100 text-amber-700 border-amber-200">MÜŞTERİDE</Badge>
                      ) : (
                        <Badge className="text-[10px] whitespace-nowrap bg-emerald-100 text-emerald-700 border-emerald-200">
                          <Wrench className="h-3 w-3 mr-1 shrink-0" />
                          MÜSAİT
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                          onClick={() => openEditCar(car)}
                          disabled={!canOperate}
                          title={!canOperate ? "Bu işlem için yetkiniz yok" : "Düzenle"}>
                          <Pencil className="h-3.5 w-3.5 text-slate-500" />
                        </Button>
                        {!isOut && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => deleteCar(car.id)}
                            disabled={!canOperate}
                            title={!canOperate ? "Bu işlem için yetkiniz yok" : "Pasife Al"}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        </>
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
            {/* Belgeler */}
            <div className="col-span-2 border-t pt-3 mt-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Belgeler <span className="font-normal normal-case text-slate-400">(isteğe bağlı — kayıt sonrası da eklenebilir)</span></p>
              <div className="grid grid-cols-2 gap-3">
                <FilePickerField
                  label="İkame Araç Sözleşmesi"
                  file={loanContractFile}
                  existingUrl={null}
                  onChange={setLoanContractFile}
                  onDelete={null}
                />
                <FilePickerField
                  label="Ehliyet Fotoğrafı"
                  file={loanLicenseFile}
                  existingUrl={null}
                  onChange={setLoanLicenseFile}
                  onDelete={null}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setLoanModal(false); setLoanContractFile(null); setLoanLicenseFile(null) }}>İptal</Button>
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

      {/* ────────────────────────────────────────────────────────
          MODAL: Kayıt Düzenle
          ──────────────────────────────────────────────────── */}
      <Dialog open={editLoanModal} onOpenChange={setEditLoanModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-slate-500" />
              Kayıt Düzenle — {editLoanTarget?.loanerCar?.plate}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {/* Danışman dropdown */}
            <div>
              <Label className="text-xs text-slate-600 mb-1 block">Danışman *</Label>
              <select
                className="w-full border border-slate-200 rounded-md h-9 px-3 text-sm bg-white"
                value={editLoanForm.advisorName}
                onChange={e => setEditLoanForm(f => ({ ...f, advisorName: e.target.value }))}
              >
                <option value="">Seçiniz...</option>
                {advisors.map(a => (
                  <option key={a.id} value={a.name}>{a.name}</option>
                ))}
              </select>
            </div>
            <Field label="Müşteri Plaka *" value={editLoanForm.customerPlate} onChange={v => setEditLoanForm(f => ({ ...f, customerPlate: v }))} upper />
            <Field label="İKK No *" value={editLoanForm.jobCardNo} onChange={v => setEditLoanForm(f => ({ ...f, jobCardNo: v }))} />
            <Field label="İKK Açılış Tarihi *" type="date" value={editLoanForm.jobCardDate} onChange={v => setEditLoanForm(f => ({ ...f, jobCardDate: v }))} />
            <Field label="Veriliş Tarihi *" type="date" value={editLoanForm.deliveryDate} onChange={v => setEditLoanForm(f => ({ ...f, deliveryDate: v }))} />
            <Field label="Veriliş Km *" type="number" value={editLoanForm.deliveryKm} onChange={v => setEditLoanForm(f => ({ ...f, deliveryKm: v }))} />
            <Field label="Kullanıcı (Ad Soyad) *" value={editLoanForm.userName} onChange={v => setEditLoanForm(f => ({ ...f, userName: v }))} />
            <Field label="Ruhsat Sahibi *" value={editLoanForm.registrationOwner} onChange={v => setEditLoanForm(f => ({ ...f, registrationOwner: v }))} />
            <div className="col-span-2">
              <Field label="Veriliş Açıklaması *" value={editLoanForm.deliveryNotes} onChange={v => setEditLoanForm(f => ({ ...f, deliveryNotes: v }))} />
            </div>
            {/* Belgeler */}
            <div className="col-span-2 border-t pt-3 mt-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Belgeler</p>
              <div className="grid grid-cols-2 gap-3">
                <FilePickerField
                  label="İkame Araç Sözleşmesi"
                  file={editContractFile}
                  existingUrl={editLoanTarget?.contractFileUrl ?? null}
                  onChange={setEditContractFile}
                  onDelete={() => {
                    deleteFile(editLoanTarget!.id, "contract")
                    setEditLoanTarget(t => t ? { ...t, contractFileUrl: null } : t)
                  }}
                />
                <FilePickerField
                  label="Ehliyet Fotoğrafı"
                  file={editLicenseFile}
                  existingUrl={editLoanTarget?.licenseFileUrl ?? null}
                  onChange={setEditLicenseFile}
                  onDelete={() => {
                    deleteFile(editLoanTarget!.id, "license")
                    setEditLoanTarget(t => t ? { ...t, licenseFileUrl: null } : t)
                  }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditLoanModal(false); setEditContractFile(null); setEditLicenseFile(null) }}>İptal</Button>
            <Button onClick={saveEditLoan} disabled={editLoanSaving || fileUploading}>
              {editLoanSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Aktif İkame Detayı (read-only) ──────────────────
          ──────────────────────────────────────────────────────── */}
      <Dialog open={detailModal} onOpenChange={setDetailModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Car className="h-5 w-5 text-sky-500" />
              İkame Araç Detayı
              {detailLoan && (() => {
                const d = daysSince(detailLoan.deliveryDate)
                const isOvd = d > OVERDUE_DAYS
                const isWrn = d >= 7 && d <= OVERDUE_DAYS
                return (
                  <Badge className={cn(
                    "ml-auto text-[10px] whitespace-nowrap",
                    isOvd ? "bg-red-100 text-red-700 border-red-200"
                    : isWrn ? "bg-orange-100 text-orange-700 border-orange-200"
                    : "bg-orange-100 text-orange-700 border-orange-200"
                  )}>
                    {isOvd ? "GECİKMİŞ" : isWrn ? "UYARI" : "AKTİF"}
                  </Badge>
                )
              })()}
            </DialogTitle>
          </DialogHeader>

          {detailLoan && (
            <div className="space-y-4 py-1">
              {/* Araç bilgisi */}
              <div className="rounded-md bg-slate-50 border px-4 py-3 flex items-center gap-3">
                <Car className="h-8 w-8 text-slate-400 shrink-0" />
                <div>
                  <p className="font-mono text-base font-bold text-slate-900">{detailLoan.loanerCar.plate}</p>
                  <p className="text-sm text-slate-600">{detailLoan.loanerCar.brand} {detailLoan.loanerCar.modelYear}{detailLoan.loanerCar.specs ? ` · ${detailLoan.loanerCar.specs}` : ""}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className={cn(
                    "text-2xl font-bold tabular-nums",
                    daysSince(detailLoan.deliveryDate) > OVERDUE_DAYS ? "text-red-600"
                    : daysSince(detailLoan.deliveryDate) >= 7 ? "text-amber-600"
                    : "text-slate-700"
                  )}>
                    {daysSince(detailLoan.deliveryDate)}
                  </p>
                  <p className="text-xs text-slate-400">gün</p>
                </div>
              </div>

              {/* Detay grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
                <DetailRow label="Danışman"       value={detailLoan.advisorName} />
                <DetailRow label="Müşteri Plaka"  value={detailLoan.customerPlate} mono />
                <DetailRow label="İKK No"         value={detailLoan.jobCardNo} mono />
                <DetailRow label="İKK Tarihi"     value={fmtDate(detailLoan.jobCardDate)} />
                <DetailRow label="Veriliş Tarihi" value={fmtDate(detailLoan.deliveryDate)} />
                <DetailRow label="Veriliş Km"     value={detailLoan.deliveryKm.toLocaleString("tr-TR") + " km"} />
                <DetailRow label="Kullanıcı"      value={detailLoan.userName} />
                <DetailRow label="Ruhsat Sahibi"  value={detailLoan.registrationOwner} />
              </div>

              {/* Açıklama */}
              {detailLoan.deliveryNotes && (
                <div className="rounded-md border bg-amber-50/50 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Veriliş Açıklaması</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{detailLoan.deliveryNotes}</p>
                </div>
              )}

              {/* Belgeler */}
              {(detailLoan.contractFileUrl || detailLoan.licenseFileUrl) && (
                <div className="rounded-md border px-4 py-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Belgeler</p>
                  <div className="flex flex-wrap gap-2">
                    {detailLoan.contractFileUrl && (
                      <a
                        href={detailLoan.contractFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-200 rounded-md px-3 py-1.5 hover:bg-blue-100 transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        İkame Sözleşmesi
                        <ExternalLink className="h-3 w-3 ml-0.5 opacity-60" />
                      </a>
                    )}
                    {detailLoan.licenseFileUrl && (
                      <a
                        href={detailLoan.licenseFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-200 rounded-md px-3 py-1.5 hover:bg-blue-100 transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        Ehliyet Fotoğrafı
                        <ExternalLink className="h-3 w-3 ml-0.5 opacity-60" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2">
            {canEditLoan && detailLoan && (
              <Button variant="outline" size="sm" onClick={() => {
                setDetailModal(false)
                openEditLoan(detailLoan)
              }}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Düzenle
              </Button>
            )}
            {canOperate && detailLoan && (
              <Button size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  setDetailModal(false)
                  openReturn(detailLoan)
                }}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Aracı Teslim Al
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setDetailModal(false)}>Kapat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

// ─── Reusable Field ───────────────────────────────────────────

// ── FilterBar ─────────────────────────────────────────────────────────────────
function FilterBar({
  value, onChange, options, colors = {},
}: {
  value: string
  onChange: (v: string) => void
  options: { key: string; label: string; count: number }[]
  colors?: Record<string, string>
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(f => {
        const isActive = value === f.key
        const activeColor = f.key !== "all" && colors[f.key] ? colors[f.key] : "bg-slate-700"
        return (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
              isActive
                ? cn(activeColor, "text-white border-transparent")
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
          >
            {f.label}
            <span className={cn("ml-1.5 text-[11px]", isActive ? "opacity-80" : "opacity-60")}>
              ({f.count})
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── FilePickerField ───────────────────────────────────────────────────────────
function FilePickerField({
  label, file, existingUrl, onChange, onDelete,
}: {
  label: string
  file: File | null
  existingUrl: string | null
  onChange: (f: File | null) => void
  onDelete: (() => void) | null
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  const displayName = file
    ? file.name
    : existingUrl
      ? existingUrl.split("/").pop()?.split("?")[0] ?? "Dosya mevcut"
      : null

  return (
    <div>
      <p className="text-xs text-slate-600 mb-1 font-medium">{label}</p>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
        className="hidden"
        onChange={e => onChange(e.target.files?.[0] ?? null)}
      />
      {displayName ? (
        <div className="flex items-center gap-1.5 border rounded-md px-2.5 py-1.5 bg-slate-50 text-xs text-slate-700">
          <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <span className="truncate flex-1 max-w-[120px]" title={displayName}>{displayName}</span>
          <div className="flex gap-1 shrink-0">
            {existingUrl && !file && (
              <a href={existingUrl} target="_blank" rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700" title="Aç">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                onChange(null)
                if (inputRef.current) inputRef.current.value = ""
                if (!file && onDelete) onDelete()
              }}
              className="text-red-400 hover:text-red-600" title="Kaldır"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-1.5 border-2 border-dashed border-slate-200 rounded-md py-2.5 text-xs text-slate-400 hover:border-slate-300 hover:text-slate-600 transition-colors"
        >
          <Upload className="h-3.5 w-3.5" />
          Dosya seç
        </button>
      )}
    </div>
  )
}

// ── DetailRow ─────────────────────────────────────────────────────────────────
function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className={cn("text-sm text-slate-800", mono && "font-mono font-semibold")}>{value || "—"}</p>
    </div>
  )
}

// ── Field ──────────────────────────────────────────────────────────────────────
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

// ─── Sort Head ────────────────────────────────────────────────

const TH_BASE = "text-xs font-semibold uppercase tracking-wide text-slate-500"

function SortHead({
  label, field, sort, onSort, className,
}: {
  label: string
  field: string
  sort: { field: string; dir: "asc" | "desc" }
  onSort: (field: string) => void
  className?: string
}) {
  const active = sort.field === field
  return (
    <TableHead className={cn(TH_BASE, "cursor-pointer select-none hover:text-slate-800 transition-colors", className)} onClick={() => onSort(field)}>
      <span className="flex items-center gap-1">
        {label}
        {active ? (
          sort.dir === "asc"
            ? <ChevronUp className="h-3 w-3 text-blue-500" />
            : <ChevronDown className="h-3 w-3 text-blue-500" />
        ) : (
          <ChevronsUpDown className="h-3 w-3 text-slate-300" />
        )}
      </span>
    </TableHead>
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
