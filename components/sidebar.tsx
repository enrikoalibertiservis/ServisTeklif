"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  Wrench,
  FileText,
  PlusCircle,
  Car,
  Upload,
  Users,
  Settings,
  LogOut,
  LayoutDashboard,
  Package,
  ClipboardList,
  Grid3X3,
  FileCog,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  user: { name: string; email: string; role: string }
}

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  color: string
}

interface NavGroup {
  title?: string
  items: NavItem[]
}

const advisorGroups: NavGroup[] = [
  {
    items: [
      { href: "/dashboard", label: "Ana Sayfa", icon: LayoutDashboard, color: "text-slate-500" },
    ],
  },
  {
    title: "Teklifler",
    items: [
      { href: "/dashboard/quotes/new",          label: "Yeni Teklif",    icon: PlusCircle,  color: "text-emerald-500" },
      { href: "/dashboard/quotes",              label: "Tekliflerim",    icon: FileText,    color: "text-blue-500"   },
      { href: "/dashboard/maintenance-matrix",  label: "Bakım Matrisi",  icon: Grid3X3,     color: "text-purple-500" },
    ],
  },
]

const adminGroups: NavGroup[] = [
  {
    items: [
      { href: "/dashboard", label: "Ana Sayfa", icon: LayoutDashboard, color: "text-slate-500" },
    ],
  },
  {
    title: "Teklifler",
    items: [
      { href: "/dashboard/quotes/new",          label: "Yeni Teklif",    icon: PlusCircle,  color: "text-emerald-500" },
      { href: "/dashboard/quotes",              label: "Tüm Teklifler",  icon: FileText,    color: "text-blue-500"   },
      { href: "/dashboard/maintenance-matrix",  label: "Bakım Matrisi",  icon: Grid3X3,     color: "text-purple-500" },
    ],
  },
  {
    title: "Katalog",
    items: [
      { href: "/dashboard/admin/vehicles", label: "Araç Kataloğu", icon: Car,     color: "text-orange-500" },
      { href: "/dashboard/admin/parts",    label: "Parçalar",      icon: Package, color: "text-cyan-500"   },
      { href: "/dashboard/admin/labor",    label: "İşçilik",       icon: Wrench,  color: "text-amber-500"  },
    ],
  },
  {
    title: "Şablonlar",
    items: [
      { href: "/dashboard/admin/templates",        label: "Bakım Şablonları", icon: ClipboardList, color: "text-indigo-500" },
      { href: "/dashboard/admin/template-editor",  label: "Şablon Editörü",   icon: FileCog,       color: "text-violet-500" },
      { href: "/dashboard/admin/import",           label: "Excel İçe Aktar",  icon: Upload,        color: "text-teal-500"   },
    ],
  },
  {
    title: "Sistem",
    items: [
      { href: "/dashboard/admin/users",    label: "Kullanıcılar", icon: Users,    color: "text-rose-500" },
      { href: "/dashboard/admin/settings", label: "Ayarlar",      icon: Settings, color: "text-gray-500" },
    ],
  },
]

function getActiveHref(pathname: string, groups: NavGroup[]): string | null {
  const allItems = groups.flatMap(g => g.items)
  let best: NavItem | null = null
  for (const item of allItems) {
    const matches =
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"))
    if (matches && (!best || item.href.length > best.href.length)) {
      best = item
    }
  }
  if (!best && pathname === "/dashboard") {
    best = allItems.find(l => l.href === "/dashboard") ?? null
  }
  return best?.href ?? null
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const groups = user.role === "ADMIN" ? adminGroups : advisorGroups
  const activeHref = getActiveHref(pathname, groups)

  return (
    <aside className="w-60 bg-slate-900 flex flex-col h-full shrink-0">
      {/* Logo */}
      <Link href="/dashboard" className="p-4 border-b border-slate-700/60 flex items-center gap-2.5 hover:bg-slate-800/60 transition-colors">
        <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
          <Wrench className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-sm leading-tight text-white">Servis Teklif</h2>
          <p className="text-xs text-slate-400">Bakım Teklif Sihirbazı</p>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.title && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500 select-none">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = activeHref === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150",
                      isActive
                        ? "bg-blue-500/20 text-blue-300 font-medium shadow-sm"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                      )}
                    />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Kullanıcı */}
      <div className="border-t border-slate-700/60 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 font-semibold text-xs shrink-0 ring-1 ring-blue-500/30">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-slate-200">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">
              {user.role === "ADMIN" ? "Yönetici" : "Danışman"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-slate-500 hover:text-red-400 hover:bg-red-400/10"
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Çıkış Yap"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
