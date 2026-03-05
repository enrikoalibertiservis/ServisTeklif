"use client"

import { useState, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import { Menu, X, Clock } from "lucide-react"
import { signOut } from "next-auth/react"
import { Sidebar } from "@/components/sidebar"
import { useIdleLogout } from "@/hooks/use-idle-logout"

interface DashboardShellProps {
  user: { name: string; email: string; role: string }
  children: React.ReactNode
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [sidebarOpen,    setSidebarOpen]    = useState(false)
  const [idleWarning,    setIdleWarning]    = useState(false)
  const [countdown,      setCountdown]      = useState(300) // 5 dk = 300 sn
  const pathname = usePathname()

  const handleWarn      = useCallback(() => { setIdleWarning(true); setCountdown(300) }, [])
  const handleClearWarn = useCallback(() => setIdleWarning(false), [])

  const { reset } = useIdleLogout(handleWarn, handleClearWarn)

  // Uyarı gösterilirken geri sayım
  useEffect(() => {
    if (!idleWarning) return
    if (countdown <= 0) { signOut({ callbackUrl: "/login" }); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [idleWarning, countdown])

  function handleContinue() {
    setIdleWarning(false)
    reset()
  }

  // Sayfa değişince mobilede otomatik kapat
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const mins = Math.floor(countdown / 60)
  const secs = countdown % 60

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Hareketsizlik uyarı modalı ──────────────────────── */}
      {idleWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-7 w-7 text-amber-600" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-slate-800">Oturum kapanmak üzere</p>
              <p className="text-sm text-slate-500 mt-1">
                Hareketsizlik nedeniyle{" "}
                <span className="font-semibold text-red-600 tabular-nums">
                  {mins}:{String(secs).padStart(2, "0")}
                </span>{" "}
                içinde çıkış yapılacak.
              </p>
            </div>
            <div className="flex gap-2 w-full">
              <button
                onClick={handleContinue}
                className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold py-2.5 transition-colors"
              >
                Devam Et
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium py-2.5 transition-colors"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobil overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — masaüstünde sabit, mobilede drawer */}
      <div
        className={[
          "fixed inset-y-0 left-0 z-50 md:relative md:translate-x-0 md:flex",
          "transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Mobilde kapatma butonu */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 md:hidden"
          aria-label="Menüyü kapat"
        >
          <X className="h-4 w-4" />
        </button>
        <Sidebar user={user} />
      </div>

      {/* Ana içerik */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobil üst bar */}
        <header className="flex items-center gap-3 px-3 py-2 border-b bg-slate-900 md:hidden shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-2.5 rounded-xl border-2 border-emerald-400 bg-emerald-600 hover:bg-emerald-500 active:scale-95 px-3.5 py-2 text-white shadow-lg shadow-emerald-900/40 transition-all"
            aria-label="Menüyü aç"
          >
            <div className="flex flex-col gap-[4px]">
              <span className="block w-5 h-0.5 bg-white rounded-full" />
              <span className="block w-4 h-0.5 bg-white/70 rounded-full" />
              <span className="block w-5 h-0.5 bg-white rounded-full" />
            </div>
            <span className="text-sm font-bold tracking-wide">Menü</span>
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            </div>
            <span className="font-bold text-white text-sm truncate">Bakım Teklif Sihirbazı</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto dot-grid">
          <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
