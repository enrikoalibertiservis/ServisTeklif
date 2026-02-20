import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { FileText, PlusCircle, Package, Wrench, Car } from "lucide-react"
import Link from "next/link"
import { DashboardBottom } from "@/components/dashboard-bottom"

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

  const todayStr = new Date().toLocaleDateString("tr-TR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })

  return (
    <div className="space-y-6">

      {/* ── Hero Banner ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-700 px-6 py-8 text-white shadow-lg min-h-[110px]">
        {/* dekoratif daireler */}
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

      {/* ── İstatistik Kartları ─────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Teklifler */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-5 shadow-lg shadow-blue-200 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide">Teklifler</p>
              <p className="mt-1 text-3xl font-bold">{quoteCount}</p>
              <p className="mt-0.5 text-xs text-blue-200">toplam teklif</p>
            </div>
            <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
              <FileText className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-5 -right-5 h-24 w-24 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -top-4 -left-4 h-16 w-16 rounded-full bg-white/5" />
        </div>

        {/* Parçalar */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 p-5 shadow-lg shadow-cyan-200 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-cyan-100 uppercase tracking-wide">Parçalar</p>
              <p className="mt-1 text-3xl font-bold">{partCount}</p>
              <p className="mt-0.5 text-xs text-cyan-100">kayıtlı parça</p>
            </div>
            <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
              <Package className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-5 -right-5 h-24 w-24 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -top-4 -left-4 h-16 w-16 rounded-full bg-white/5" />
        </div>

        {/* İşçilik */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-5 shadow-lg shadow-amber-200 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-100 uppercase tracking-wide">İşçilik</p>
              <p className="mt-1 text-3xl font-bold">{laborCount}</p>
              <p className="mt-0.5 text-xs text-amber-100">operasyon tanımı</p>
            </div>
            <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
              <Wrench className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-5 -right-5 h-24 w-24 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -top-4 -left-4 h-16 w-16 rounded-full bg-white/5" />
        </div>

        {/* Markalar */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-5 shadow-lg shadow-violet-200 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-violet-200 uppercase tracking-wide">Markalar</p>
              <p className="mt-1 text-3xl font-bold">{brandCount}</p>
              <p className="mt-0.5 text-xs text-violet-200">aktif marka</p>
            </div>
            <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
              <Car className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-5 -right-5 h-24 w-24 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -top-4 -left-4 h-16 w-16 rounded-full bg-white/5" />
        </div>
      </div>

      <DashboardBottom recentQuotes={recentQuotes} isAdmin={isAdmin} />

    </div>
  )
}
