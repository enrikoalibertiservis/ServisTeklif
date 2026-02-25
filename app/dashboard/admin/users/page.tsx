"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Users, Plus, UserCheck, UserX, Eye, EyeOff, KeyRound } from "lucide-react"

// Şifre kural kontrolü
function checkPassword(pwd: string) {
  return {
    length:    pwd.length >= 8,
    uppercase: /[A-Z]/.test(pwd),
    lowercase: /[a-z]/.test(pwd),
    number:    /[0-9]/.test(pwd),
    special:   /[^A-Za-z0-9]/.test(pwd),
  }
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  const r = checkPassword(password)
  const passed = Object.values(r).filter(Boolean).length
  const bars = [
    passed <= 1 ? "bg-red-500" : passed <= 2 ? "bg-orange-400" : passed <= 3 ? "bg-yellow-400" : passed <= 4 ? "bg-lime-500" : "bg-green-500",
  ]
  const label = ["", "Çok Zayıf", "Zayıf", "Orta", "İyi", "Güçlü"][passed]
  const labelColor = ["", "text-red-500", "text-orange-500", "text-yellow-600", "text-lime-600", "text-green-600"][passed]

  const rules = [
    { key: "length",    text: "En az 8 karakter" },
    { key: "uppercase", text: "En az 1 büyük harf" },
    { key: "lowercase", text: "En az 1 küçük harf" },
    { key: "number",    text: "En az 1 rakam" },
    { key: "special",   text: "En az 1 özel karakter" },
  ]

  return (
    <div className="mt-2 space-y-2">
      {/* Güç barı */}
      <div className="flex gap-1">
        {[1,2,3,4,5].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= passed ? bars[0] : "bg-slate-200"}`} />
        ))}
      </div>
      <div className={`text-xs font-medium ${labelColor}`}>{label}</div>
      {/* Kural listesi */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {rules.map(rule => (
          <div key={rule.key} className={`flex items-center gap-1 text-xs ${(r as any)[rule.key] ? "text-green-600" : "text-slate-400"}`}>
            <span>{(r as any)[rule.key] ? "✓" : "○"}</span>
            {rule.text}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function UsersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<any[]>([])

  // Yeni kullanıcı dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [role, setRole] = useState("ADVISOR")
  const [saving, setSaving] = useState(false)

  // Şifre güncelleme dialog
  const [pwdDialogUser, setPwdDialogUser] = useState<{ id: string; name: string } | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [newPassword2, setNewPassword2] = useState("")
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [pwdSaving, setPwdSaving] = useState(false)

  async function loadUsers() {
    const res = await fetch("/api/users")
    setUsers(await res.json())
  }

  useEffect(() => { loadUsers() }, [])

  async function handleCreate() {
    if (!name || !email || !password) {
      toast({ title: "Hata", description: "Tüm alanları doldurun.", variant: "destructive" })
      return
    }
    setSaving(true)
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    })
    setSaving(false)

    if (!res.ok) {
      const err = await res.json()
      toast({ title: "Hata", description: err.error, variant: "destructive" })
      return
    }

    toast({ title: "Kullanıcı oluşturuldu" })
    setDialogOpen(false)
    setName(""); setEmail(""); setPassword(""); setRole("ADVISOR"); setShowPwd(false)
    loadUsers()
  }

  async function toggleActive(userId: string, currentActive: boolean) {
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, active: !currentActive }),
    })
    loadUsers()
    toast({ title: currentActive ? "Kullanıcı devre dışı bırakıldı" : "Kullanıcı aktifleştirildi" })
  }

  async function handleUpdatePassword() {
    if (!pwdDialogUser) return
    if (!newPassword) {
      toast({ title: "Hata", description: "Yeni şifre boş olamaz.", variant: "destructive" }); return
    }
    if (newPassword !== newPassword2) {
      toast({ title: "Hata", description: "Şifreler eşleşmiyor.", variant: "destructive" }); return
    }
    setPwdSaving(true)
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pwdDialogUser.id, password: newPassword }),
    })
    setPwdSaving(false)
    if (!res.ok) {
      const err = await res.json()
      toast({ title: "Hata", description: err.error, variant: "destructive" }); return
    }
    toast({ title: "Şifre güncellendi", description: `${pwdDialogUser.name} kullanıcısının şifresi değiştirildi.` })
    setPwdDialogUser(null)
    setNewPassword(""); setNewPassword2(""); setShowNewPwd(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-rose-500" />
            Kullanıcı Yönetimi
          </h1>
          <p className="text-muted-foreground">Danışman ve yönetici hesaplarını yönetin.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Kullanıcı
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-rose-500" />
            Kullanıcılar
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Kayıt Tarihi</TableHead>
                <TableHead className="w-28">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                      {u.role === "ADMIN" ? "Yönetici" : "Danışman"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.active ? "default" : "destructive"}>
                      {u.active ? "Aktif" : "Pasif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString("tr-TR")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title={u.active ? "Devre dışı bırak" : "Aktifleştir"}
                        onClick={() => toggleActive(u.id, u.active)}
                      >
                        {u.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Şifre güncelle"
                        onClick={() => { setPwdDialogUser({ id: u.id, name: u.name }); setNewPassword(""); setNewPassword2(""); setShowNewPwd(false) }}
                      >
                        <KeyRound className="h-4 w-4 text-amber-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Şifre Güncelleme Dialog */}
      <Dialog open={!!pwdDialogUser} onOpenChange={open => { if (!open) { setPwdDialogUser(null); setNewPassword(""); setNewPassword2("") } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-500" />
              Şifre Güncelle — {pwdDialogUser?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Yeni Şifre</Label>
              <div className="relative">
                <Input
                  type={showNewPwd ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="pr-10"
                  placeholder="Yeni şifre girin"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrength password={newPassword} />
            </div>
            <div className="space-y-2">
              <Label>Şifre Tekrar</Label>
              <Input
                type="password"
                value={newPassword2}
                onChange={e => setNewPassword2(e.target.value)}
                placeholder="Şifreyi tekrar girin"
              />
              {newPassword2 && newPassword !== newPassword2 && (
                <p className="text-xs text-red-500">Şifreler eşleşmiyor</p>
              )}
              {newPassword2 && newPassword === newPassword2 && newPassword.length > 0 && (
                <p className="text-xs text-green-600">✓ Şifreler eşleşiyor</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdDialogUser(null)}>İptal</Button>
            <Button
              onClick={handleUpdatePassword}
              disabled={pwdSaving || !newPassword || newPassword !== newPassword2}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {pwdSaving ? "Kaydediliyor..." : "Şifreyi Güncelle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Yeni Kullanıcı Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Kullanıcı Oluştur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ad Soyad</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>E-posta</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Şifre</Label>
              <div className="relative">
                <Input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADVISOR">Danışman</SelectItem>
                  <SelectItem value="ADMIN">Yönetici</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Kaydediliyor..." : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
