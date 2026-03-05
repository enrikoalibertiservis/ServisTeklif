import { useEffect, useRef, useCallback } from "react"
import { signOut } from "next-auth/react"

const IDLE_TIMEOUT = 2 * 60 * 60 * 1000  // 2 saat (ms)
const WARN_BEFORE  = 5 * 60 * 1000        // logout'tan 5 dk önce uyar

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"] as const

export function useIdleLogout(onWarn: () => void, onClearWarn: () => void) {
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    if (warnTimer.current) clearTimeout(warnTimer.current)
  }, [])

  const reset = useCallback(() => {
    clearTimers()
    onClearWarn()
    warnTimer.current = setTimeout(onWarn, IDLE_TIMEOUT - WARN_BEFORE)
    idleTimer.current = setTimeout(() => signOut({ callbackUrl: "/login" }), IDLE_TIMEOUT)
  }, [clearTimers, onWarn, onClearWarn])

  useEffect(() => {
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, reset))
      clearTimers()
    }
  }, [reset, clearTimers])

  return { reset }
}
