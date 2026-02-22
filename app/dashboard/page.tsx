import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { FileText, PlusCircle, Package, Wrench, Car } from "lucide-react"
import Link from "next/link"
import { DashboardBottom } from "@/components/dashboard-bottom"
import { DashboardStats } from "@/components/dashboard-stats"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const isAdmin = session?.user.role === "ADMIN"

  const [quoteCount, partCount, laborCount, brandCount] = await Promise.all([
    isAdmin
      ? prisma.quote.count()
      : prisma.quote.count({ where: { createdById: session!.user.id } }),
    prisma.part.count(),
    prisma.laborOperation.count(),
    prisma.brand.count(),
  ])

  const recentQuotes = await prisma.quote.findMany({
    where: isAdmin ? {} : { createdById: session!.user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { createdBy: { select: { name: true } } },
  })

  // Danışman bazlı teklif sayıları (admin görür)
  const advisorStats = isAdmin
    ? await prisma.quote.groupBy({
        by: ["createdById"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 8,
      }).then(async (rows) => {
        const userIds = rows.map(r => r.createdById).filter(Boolean) as string[]
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true },
        })
        return rows.map(r => ({
          name: users.find(u => u.id === r.createdById)?.name ?? "Bilinmiyor",
          count: r._count.id,
        }))
      })
    : []

  // Marka bazlı teklif sayıları
  const brandQuoteRows = await prisma.quote.groupBy({
    by: ["brandName"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 8,
  })
  const brandQuotes = brandQuoteRows.map(r => ({
    name:  r.brandName,
    count: r._count.id,
  }))

  // Alt model (SubModel) bazında reçete doluluk oranı — brand bazlı
  const modelRecipes = await (async () => {
    // Reçeteli (itemli) benzersiz brand+subModel çiftleri
    const withRecipe = await prisma.maintenanceTemplate.findMany({
      where: { items: { some: {} }, subModelId: { not: null } },
      select: { brandId: true, subModelId: true },
      distinct: ["brandId", "subModelId"],
    })
    const recipeMap: Record<string, Set<string>> = {}
    for (const t of withRecipe) {
      if (!recipeMap[t.brandId]) recipeMap[t.brandId] = new Set()
      recipeMap[t.brandId].add(t.subModelId!)
    }

    // Toplam alt model sayısı — brand bazlı (subModel → model → brand üzerinden)
    const allSubModels = await prisma.subModel.findMany({
      select: { id: true, model: { select: { brandId: true } } },
    })
    const totalMap: Record<string, number> = {}
    for (const sm of allSubModels) {
      const bid = sm.model.brandId
      totalMap[bid] = (totalMap[bid] || 0) + 1
    }

    // Tüm markaları dahil et (reçeteli olanlar + toplamı olan tüm markalar)
    const allBrandIds = Array.from(new Set([
      ...Object.keys(recipeMap),
      ...Object.keys(totalMap),
    ]))
    const brands = await prisma.brand.findMany({
      where: { id: { in: allBrandIds } },
      select: { id: true, name: true },
    })

    return allBrandIds
      .filter(id => (totalMap[id] ?? 0) > 0)   // en az 1 alt modeli olan markalar
      .map(id => ({
        brand:   brands.find(b => b.id === id)?.name ?? "?",
        defined: recipeMap[id]?.size ?? 0,
        total:   totalMap[id] ?? 0,
      }))
      .sort((a, b) => (b.defined / b.total) - (a.defined / a.total))
      .slice(0, 10)
  })()

  const todayStr = new Date().toLocaleDateString("tr-TR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })

  const statCards = [
    {
      label: "Teklifler",
      value: quoteCount,
      sub: "toplam teklif",
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
      dot: "bg-blue-500",
    },
    {
      label: "Parçalar",
      value: partCount,
      sub: "kayıtlı parça",
      icon: Package,
      color: "text-teal-600",
      bg: "bg-teal-50",
      border: "border-teal-100",
      dot: "bg-teal-500",
    },
    {
      label: "İşçilik",
      value: laborCount,
      sub: "operasyon tanımı",
      icon: Wrench,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
      dot: "bg-amber-500",
    },
    {
      label: "Markalar",
      value: brandCount,
      sub: "aktif marka",
      icon: Car,
      color: "text-violet-600",
      bg: "bg-violet-50",
      border: "border-violet-100",
      dot: "bg-violet-500",
    },
  ]

  return (
    <div className="space-y-6">

      {/* ── Hero Banner ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-700 px-6 py-8 text-white shadow-lg min-h-[110px]">
        <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-12 -left-10 h-40 w-40 rounded-full bg-indigo-800/30" />
        <div className="pointer-events-none absolute top-1/2 right-40 h-24 w-24 -translate-y-1/2 rounded-full bg-white/5" />
        <div className="relative flex h-full flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-blue-200">{todayStr}</p>
            <h1 className="mt-1 text-2xl font-bold">
              Hoş Geldiniz, {session?.user.name} 👋
            </h1>
            <p className="mt-1 text-sm text-blue-100">
              {isAdmin ? "Yönetici Paneli" : "Servis Danışman Paneli"}
            </p>
          </div>
          <Link
            href="/dashboard/quotes/new"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 text-base font-bold text-gray-900 shadow-lg shadow-amber-500/50 transition-all hover:bg-amber-300 hover:scale-105"
          >
            <PlusCircle className="h-4 w-4" />
            Yeni Teklif
          </Link>
        </div>
      </div>

      {/* ── Hafif İstatistik Kartları ─────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
        {statCards.map((s) => (
          <div
            key={s.label}
            className={`flex items-center gap-4 rounded-xl border ${s.border} ${s.bg} px-4 py-3.5 shadow-sm`}
          >
            <div className={`rounded-lg bg-white/80 p-2.5 shadow-sm ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{s.label}</p>
              <p className={`text-2xl font-bold leading-tight ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.sub}</p>
            </div>
            {/* mini dekoratif bar */}
            <div className="ml-auto flex flex-col gap-1 shrink-0">
              {[0.4, 0.7, 0.5, 1.0].map((h, i) => (
                <div
                  key={i}
                  className={`w-1.5 rounded-full ${s.dot} opacity-30`}
                  style={{ height: `${h * 20}px` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Grafik İstatistikler ──────────────────────────────── */}
      <DashboardStats
        advisorStats={advisorStats}
        brandQuotes={brandQuotes}
        isAdmin={isAdmin}
      />

      <DashboardBottom recentQuotes={recentQuotes} isAdmin={isAdmin} modelRecipes={modelRecipes} />

    </div>
  )
}
