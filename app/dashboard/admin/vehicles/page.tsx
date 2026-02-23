"use client"

import { useEffect, useState, useTransition } from "react"
import {
  getBrands,
  getModelsByBrand,
  getSubModelsByModel,
  getSpecsBySubModel,
  createBrand,
  deleteBrand,
  updateBrand,
  createModel,
  deleteModel,
  updateModel,
  createSubModel,
  deleteSubModel,
  updateSubModel,
  upsertSpec,
  deleteSpec,
} from "@/app/actions/vehicle"
import type { Brand, VehicleModel, SubModel, VehicleSpec } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Trash2, Car, ChevronRight, Pencil, Check, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function VehiclesAdminPage() {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const [brands, setBrands] = useState<Brand[]>([])
  const [models, setModels] = useState<VehicleModel[]>([])
  const [subModels, setSubModels] = useState<SubModel[]>([])
  const [specs, setSpecs] = useState<VehicleSpec[]>([])

  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [selectedSubModelId, setSelectedSubModelId] = useState<string | null>(null)

  const [newBrandName, setNewBrandName] = useState("")
  const [newModelName, setNewModelName] = useState("")
  const [newSubModelName, setNewSubModelName] = useState("")
  const [newSpecKey, setNewSpecKey] = useState("")
  const [newSpecValue, setNewSpecValue] = useState("")
  const [editingSpecId, setEditingSpecId] = useState<string | null>(null)
  const [editSpecValue, setEditSpecValue] = useState("")

  // Inline edit states
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null)
  const [editBrandName, setEditBrandName] = useState("")
  const [editingModelId, setEditingModelId] = useState<string | null>(null)
  const [editModelName, setEditModelName] = useState("")
  const [editingSubModelId, setEditingSubModelId] = useState<string | null>(null)
  const [editSubModelName, setEditSubModelName] = useState("")

  const loadBrands = () => {
    startTransition(async () => {
      try {
        const data = await getBrands()
        setBrands(data)
      } catch (err) {
        toast({
          title: "Hata",
          description: "Markalar yüklenirken bir hata oluştu.",
          variant: "destructive",
        })
      }
    })
  }

  const loadModels = (brandId: string) => {
    startTransition(async () => {
      try {
        const data = await getModelsByBrand(brandId)
        setModels(data)
      } catch (err) {
        toast({
          title: "Hata",
          description: "Modeller yüklenirken bir hata oluştu.",
          variant: "destructive",
        })
      }
    })
  }

  const loadSubModels = (modelId: string) => {
    startTransition(async () => {
      try {
        const data = await getSubModelsByModel(modelId)
        setSubModels(data)
      } catch (err) {
        toast({
          title: "Hata",
          description: "Alt modeller yüklenirken bir hata oluştu.",
          variant: "destructive",
        })
      }
    })
  }

  const loadSpecs = (subModelId: string) => {
    startTransition(async () => {
      try {
        const data = await getSpecsBySubModel(subModelId)
        setSpecs(data)
      } catch (err) {
        toast({
          title: "Hata",
          description: "Teknik özellikler yüklenirken bir hata oluştu.",
          variant: "destructive",
        })
      }
    })
  }

  useEffect(() => {
    loadBrands()
  }, [])

  useEffect(() => {
    if (selectedBrandId) {
      loadModels(selectedBrandId)
    } else {
      setModels([])
      setSelectedModelId(null)
    }
  }, [selectedBrandId])

  useEffect(() => {
    if (selectedModelId) {
      loadSubModels(selectedModelId)
    } else {
      setSubModels([])
      setSelectedSubModelId(null)
    }
  }, [selectedModelId])

  useEffect(() => {
    if (selectedSubModelId) {
      loadSpecs(selectedSubModelId)
    } else {
      setSpecs([])
    }
  }, [selectedSubModelId])

  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newBrandName.trim()
    if (!name) return
    startTransition(async () => {
      try {
        await createBrand(name)
        setNewBrandName("")
        loadBrands()
        toast({ title: "Başarılı", description: "Marka eklendi." })
      } catch (err) {
        toast({
          title: "Hata",
          description: err instanceof Error ? err.message : "Marka eklenirken bir hata oluştu.",
          variant: "destructive",
        })
      }
    })
  }

  const handleDeleteBrand = async (id: string, name: string) => {
    if (!confirm(`"${name}" markasını silmek istediğinize emin misiniz?`)) return
    startTransition(async () => {
      try {
        await deleteBrand(id)
        if (selectedBrandId === id) setSelectedBrandId(null)
        loadBrands()
        toast({ title: "Başarılı", description: "Marka silindi." })
      } catch (err) {
        toast({
          title: "Hata",
          description: err instanceof Error ? err.message : "Marka silinirken bir hata oluştu.",
          variant: "destructive",
        })
      }
    })
  }

  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newModelName.trim()
    if (!name || !selectedBrandId) return
    startTransition(async () => {
      try {
        await createModel(selectedBrandId, name)
        setNewModelName("")
        loadModels(selectedBrandId)
        toast({ title: "Başarılı", description: "Model eklendi." })
      } catch (err) {
        toast({
          title: "Hata",
          description: err instanceof Error ? err.message : "Model eklenirken bir hata oluştu.",
          variant: "destructive",
        })
      }
    })
  }

  const handleDeleteModel = async (id: string, name: string) => {
    if (!confirm(`"${name}" modelini silmek istediğinize emin misiniz?`)) return
    startTransition(async () => {
      try {
        await deleteModel(id)
        if (selectedModelId === id) setSelectedModelId(null)
        if (selectedBrandId) loadModels(selectedBrandId)
        toast({ title: "Başarılı", description: "Model silindi." })
      } catch (err) {
        toast({
          title: "Hata",
          description: err instanceof Error ? err.message : "Model silinirken bir hata oluştu.",
          variant: "destructive",
        })
      }
    })
  }

  const handleAddSubModel = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newSubModelName.trim()
    if (!name || !selectedModelId) return
    startTransition(async () => {
      try {
        await createSubModel(selectedModelId, name)
        setNewSubModelName("")
        loadSubModels(selectedModelId)
        toast({ title: "Başarılı", description: "Alt model eklendi." })
      } catch (err) {
        toast({
          title: "Hata",
          description: err instanceof Error ? err.message : "Alt model eklenirken bir hata oluştu.",
          variant: "destructive",
        })
      }
    })
  }

  const handleDeleteSubModel = async (id: string, name: string) => {
    if (!confirm(`"${name}" alt modelini silmek istediğinize emin misiniz?`)) return
    startTransition(async () => {
      try {
        await deleteSubModel(id)
        if (selectedSubModelId === id) setSelectedSubModelId(null)
        if (selectedModelId) loadSubModels(selectedModelId)
        toast({ title: "Başarılı", description: "Alt model silindi." })
      } catch (err) {
        toast({
          title: "Hata",
          description: err instanceof Error ? err.message : "Alt model silinirken bir hata oluştu.",
          variant: "destructive",
        })
      }
    })
  }

  const handleAddSpec = async (e: React.FormEvent) => {
    e.preventDefault()
    const key = newSpecKey.trim()
    const value = newSpecValue.trim()
    if (!key || !value || !selectedSubModelId) return
    startTransition(async () => {
      try {
        await upsertSpec(selectedSubModelId, key, value)
        setNewSpecKey("")
        setNewSpecValue("")
        loadSpecs(selectedSubModelId)
        toast({ title: "Başarılı", description: "Teknik özellik eklendi." })
      } catch (err) {
        toast({
          title: "Hata",
          description: err instanceof Error ? err.message : "Teknik özellik eklenirken bir hata oluştu.",
          variant: "destructive",
        })
      }
    })
  }

  const handleEditSpec = (spec: VehicleSpec) => {
    setEditingSpecId(spec.id)
    setEditSpecValue(spec.specValue)
  }

  const handleSaveSpecEdit = async () => {
    const spec = specs.find((s) => s.id === editingSpecId)
    if (!spec || !selectedSubModelId) return
    startTransition(async () => {
      try {
        await upsertSpec(selectedSubModelId, spec.specKey, editSpecValue)
        setEditingSpecId(null)
        setEditSpecValue("")
        loadSpecs(selectedSubModelId)
        toast({ title: "Başarılı", description: "Teknik özellik güncellendi." })
      } catch (err) {
        toast({
          title: "Hata",
          description: err instanceof Error ? err.message : "Teknik özellik güncellenirken bir hata oluştu.",
          variant: "destructive",
        })
      }
    })
  }

  const handleSaveBrand = async (id: string) => {
    const name = editBrandName.trim()
    if (!name) return
    startTransition(async () => {
      try {
        await updateBrand(id, name)
        setEditingBrandId(null)
        loadBrands()
        toast({ title: "Başarılı", description: "Marka adı güncellendi." })
      } catch {
        toast({ title: "Hata", description: "Güncelleme başarısız.", variant: "destructive" })
      }
    })
  }

  const handleSaveModel = async (id: string) => {
    const name = editModelName.trim()
    if (!name) return
    startTransition(async () => {
      try {
        await updateModel(id, name)
        setEditingModelId(null)
        if (selectedBrandId) loadModels(selectedBrandId)
        toast({ title: "Başarılı", description: "Model adı güncellendi." })
      } catch {
        toast({ title: "Hata", description: "Güncelleme başarısız.", variant: "destructive" })
      }
    })
  }

  const handleSaveSubModel = async (id: string) => {
    const name = editSubModelName.trim()
    if (!name) return
    startTransition(async () => {
      try {
        await updateSubModel(id, name)
        setEditingSubModelId(null)
        if (selectedModelId) loadSubModels(selectedModelId)
        toast({ title: "Başarılı", description: "Alt model adı güncellendi." })
      } catch {
        toast({ title: "Hata", description: "Güncelleme başarısız.", variant: "destructive" })
      }
    })
  }

  const handleDeleteSpec = async (id: string) => {
    if (!confirm("Bu teknik özelliği silmek istediğinize emin misiniz?")) return
    startTransition(async () => {
      try {
        await deleteSpec(id)
        if (selectedSubModelId) loadSpecs(selectedSubModelId)
        toast({ title: "Başarılı", description: "Teknik özellik silindi." })
      } catch (err) {
        toast({
          title: "Hata",
          description: err instanceof Error ? err.message : "Teknik özellik silinirken bir hata oluştu.",
          variant: "destructive",
        })
      }
    })
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Car className="h-7 w-7 text-orange-500" />
        <h1 className="text-2xl font-bold tracking-tight">Araç Kataloğu</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Marka */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Marka</span>
              <Badge variant="secondary">{brands.length}</Badge>
            </CardTitle>
            <form onSubmit={handleAddBrand} className="flex gap-2 mt-2">
              <Input
                placeholder="Yeni marka adı"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                disabled={isPending}
              />
              <Button type="submit" size="icon" disabled={isPending || !newBrandName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </form>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1 max-h-[280px] overflow-y-auto">
              {isPending && brands.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Yükleniyor...</p>
              ) : brands.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Henüz marka yok.</p>
              ) : (
                brands.map((b) => (
                  <div
                    key={b.id}
                    className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                      selectedBrandId === b.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    }`}
                  >
                    {editingBrandId === b.id ? (
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <Input
                          autoFocus
                          value={editBrandName}
                          onChange={(e) => setEditBrandName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveBrand(b.id); if (e.key === "Escape") setEditingBrandId(null) }}
                          className="h-7 text-sm py-0 px-2"
                        />
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-green-600 shrink-0" onClick={() => handleSaveBrand(b.id)} disabled={isPending}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditingBrandId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="truncate cursor-pointer flex-1" onClick={() => setSelectedBrandId(b.id)}>{b.name}</span>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={(e) => { e.stopPropagation(); setEditingBrandId(b.id); setEditBrandName(b.name) }} disabled={isPending}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleDeleteBrand(b.id, b.name) }} disabled={isPending}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Model */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Model</span>
              <Badge variant="secondary">{models.length}</Badge>
            </CardTitle>
            {selectedBrandId && (
              <form onSubmit={handleAddModel} className="flex gap-2 mt-2">
                <Input
                  placeholder="Yeni model adı"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  disabled={isPending}
                />
                <Button type="submit" size="icon" disabled={isPending || !newModelName.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </form>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1 max-h-[280px] overflow-y-auto">
              {!selectedBrandId ? (
                <p className="text-sm text-muted-foreground py-4">Önce bir marka seçin.</p>
              ) : isPending && models.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Yükleniyor...</p>
              ) : models.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Henüz model yok.</p>
              ) : (
                models.map((m) => (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                      selectedModelId === m.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    }`}
                  >
                    {editingModelId === m.id ? (
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <Input
                          autoFocus
                          value={editModelName}
                          onChange={(e) => setEditModelName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveModel(m.id); if (e.key === "Escape") setEditingModelId(null) }}
                          className="h-7 text-sm py-0 px-2"
                        />
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-green-600 shrink-0" onClick={() => handleSaveModel(m.id)} disabled={isPending}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditingModelId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="truncate cursor-pointer flex-1" onClick={() => setSelectedModelId(m.id)}>{m.name}</span>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={(e) => { e.stopPropagation(); setEditingModelId(m.id); setEditModelName(m.name) }} disabled={isPending}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleDeleteModel(m.id, m.name) }} disabled={isPending}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alt Model */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Alt Model</span>
              <Badge variant="secondary">{subModels.length}</Badge>
            </CardTitle>
            {selectedModelId && (
              <form onSubmit={handleAddSubModel} className="flex gap-2 mt-2">
                <Input
                  placeholder="Yeni alt model adı"
                  value={newSubModelName}
                  onChange={(e) => setNewSubModelName(e.target.value)}
                  disabled={isPending}
                />
                <Button type="submit" size="icon" disabled={isPending || !newSubModelName.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </form>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1 max-h-[280px] overflow-y-auto">
              {!selectedModelId ? (
                <p className="text-sm text-muted-foreground py-4">Önce bir model seçin.</p>
              ) : isPending && subModels.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Yükleniyor...</p>
              ) : subModels.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Henüz alt model yok.</p>
              ) : (
                subModels.map((sm) => (
                  <div
                    key={sm.id}
                    className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                      selectedSubModelId === sm.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    }`}
                  >
                    {editingSubModelId === sm.id ? (
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <Input
                          autoFocus
                          value={editSubModelName}
                          onChange={(e) => setEditSubModelName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveSubModel(sm.id); if (e.key === "Escape") setEditingSubModelId(null) }}
                          className="h-7 text-sm py-0 px-2"
                        />
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-green-600 shrink-0" onClick={() => handleSaveSubModel(sm.id)} disabled={isPending}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditingSubModelId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="truncate cursor-pointer flex-1" onClick={() => setSelectedSubModelId(sm.id)}>{sm.name}</span>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={(e) => { e.stopPropagation(); setEditingSubModelId(sm.id); setEditSubModelName(sm.name) }} disabled={isPending}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleDeleteSubModel(sm.id, sm.name) }} disabled={isPending}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teknik Özellikler */}
      {selectedSubModelId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Teknik Özellikler</CardTitle>
            <form onSubmit={handleAddSpec} className="flex flex-wrap gap-2 mt-2">
              <Input
                placeholder="Özellik adı (örn: Motor)"
                value={newSpecKey}
                onChange={(e) => setNewSpecKey(e.target.value)}
                disabled={isPending}
                className="max-w-[180px]"
              />
              <Input
                placeholder="Değer (örn: 1.4 T-Jet)"
                value={newSpecValue}
                onChange={(e) => setNewSpecValue(e.target.value)}
                disabled={isPending}
                className="max-w-[180px]"
              />
              <Button type="submit" disabled={isPending || !newSpecKey.trim() || !newSpecValue.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Ekle
              </Button>
            </form>
          </CardHeader>
          <CardContent>
            {specs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Henüz teknik özellik yok.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Özellik</TableHead>
                    <TableHead>Değer</TableHead>
                    <TableHead className="w-[100px]">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {specs.map((spec) => (
                    <TableRow key={spec.id}>
                      <TableCell className="font-medium">{spec.specKey}</TableCell>
                      <TableCell>
                        {editingSpecId === spec.id ? (
                          <div className="flex gap-2">
                            <Input
                              value={editSpecValue}
                              onChange={(e) => setEditSpecValue(e.target.value)}
                              className="max-w-[200px]"
                              autoFocus
                            />
                            <Button size="sm" onClick={handleSaveSpecEdit} disabled={isPending}>
                              Kaydet
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingSpecId(null)
                                setEditSpecValue("")
                              }}
                            >
                              İptal
                            </Button>
                          </div>
                        ) : (
                          <span
                            className="cursor-pointer hover:underline"
                            onClick={() => handleEditSpec(spec)}
                          >
                            {spec.specValue}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteSpec(spec.id)}
                          disabled={isPending || editingSpecId === spec.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
