"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiClient as api } from "@/lib/api-client";
import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Award,
  TreeDeciduous,
  Layers,
  Search,
  CheckSquare,
  Square,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PaginatedResponse, Plant, Zone } from "@/types";
import { queryKeys } from "@/lib/query-keys";
import { useTranslation } from "@/components/i18n-provider";

import { QualityManagementDialog } from "@/components/harvests/quality-management-dialog";
import { getQualityGrades, QualityGrade } from "@/lib/quality-definitions-store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeStr(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getDisplayCode(plant: Plant): string {
  return plant.code.length === 36 && plant.code.includes("-")
    ? `Cây #${plant.code.substring(0, 8)}`
    : plant.code;
}

// ─── Form schema ──────────────────────────────────────────────────────────────

const formSchema = z.object({
  quantity_kg: z.number().min(0.01, "Sản lượng phải lớn hơn 0"),
  quality: z.string().max(40).optional(),
  season: z.string().max(30).optional(),
  harvested_at: z.string().min(1, "Ngày thu hoạch là bắt buộc"),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Multi-plant checkbox picker ──────────────────────────────────────────────

interface PlantPickerProps {
  plants: Plant[];
  zones: Zone[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onClearAll: () => void;
}

function PlantPicker({ plants, zones, selectedIds, onToggle, onSelectAll, onClearAll }: PlantPickerProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return plants;
    const q = normalizeStr(search);
    return plants.filter((p) => {
      const code = normalizeStr(getDisplayCode(p));
      const zone = zones.find((z) => z.id === p.zone_id);
      const zoneName = zone ? normalizeStr(zone.name) : "";
      return code.includes(q) || zoneName.includes(q);
    });
  }, [plants, zones, search]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id));

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Search + select-all bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50">
        <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm cây theo mã hoặc tên khu..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
        {search && (
          <button type="button" onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() =>
            allFilteredSelected ? onClearAll() : onSelectAll(filtered.map((p) => p.id))
          }
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 ml-1 whitespace-nowrap flex items-center gap-1"
        >
          {allFilteredSelected ? (
            <><Square className="h-3.5 w-3.5" /> Bỏ chọn</>
          ) : (
            <><CheckSquare className="h-3.5 w-3.5" /> Chọn tất cả</>
          )}
        </button>
      </div>

      {/* Plant list */}
      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-400">Không tìm thấy cây phù hợp</div>
        ) : (
          filtered.map((plant) => {
            const isChecked = selectedIds.has(plant.id);
            const zone = zones.find((z) => z.id === plant.zone_id);
            return (
              <button
                key={plant.id}
                type="button"
                onClick={() => onToggle(plant.id)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-sm text-left transition-colors ${
                  isChecked ? "bg-emerald-50" : "hover:bg-slate-50"
                }`}
              >
                <div
                  className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isChecked
                      ? "bg-emerald-600 border-emerald-600"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {isChecked && <Check className="h-3 w-3 text-white" />}
                </div>
                <TreeDeciduous
                  className={`h-4 w-4 shrink-0 ${isChecked ? "text-emerald-600" : "text-slate-400"}`}
                />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-slate-900 block truncate">{getDisplayCode(plant)}</span>
                  {zone && (
                    <span className="text-xs text-slate-500 truncate">Khu: {zone.name}</span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Zone harvest picker ───────────────────────────────────────────────────────

interface ZonePickerProps {
  zones: Zone[];
  plants: Plant[];
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string | null) => void;
  overriddenIds: Set<string>;    // manually deselected within the zone
  onTogglePlant: (id: string) => void;
}

function ZonePicker({ zones, plants, selectedZoneId, onSelectZone, overriddenIds, onTogglePlant }: ZonePickerProps) {
  const [expandedZone, setExpandedZone] = useState<string | null>(null);

  const getZonePlants = (zoneId: string) => plants.filter((p) => p.zone_id === zoneId);
  const unassigned = plants.filter((p) => !p.zone_id);

  const allZoneOptions: Array<{ id: string; name: string; count: number }> = [
    ...zones.map((z) => ({
      id: z.id,
      name: z.name,
      count: getZonePlants(z.id).length,
    })),
    ...(unassigned.length > 0
      ? [{ id: "__unassigned__", name: "Chưa phân khu", count: unassigned.length }]
      : []),
  ];

  return (
    <div className="space-y-2">
      {allZoneOptions.length === 0 && (
        <div className="py-8 text-center text-sm text-slate-400">
          Vườn chưa có phân khu nào. Vui lòng thêm phân khu trước.
        </div>
      )}
      {allZoneOptions.map((zone) => {
        const zonePlants =
          zone.id === "__unassigned__" ? unassigned : getZonePlants(zone.id);
        const isSelected = selectedZoneId === zone.id;
        const effectivePlants = zonePlants.filter((p) => !overriddenIds.has(p.id));
        const isExpanded = expandedZone === zone.id;

        return (
          <div
            key={zone.id}
            className={`rounded-xl border-2 overflow-hidden transition-all ${
              isSelected ? "border-emerald-400 shadow-sm" : "border-slate-200"
            }`}
          >
            {/* Zone header */}
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => onSelectZone(isSelected ? null : zone.id)}
                className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? "bg-emerald-600 border-emerald-600"
                    : "border-slate-300 bg-white hover:border-emerald-400"
                }`}
              >
                {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-white" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-slate-900">{zone.name}</span>
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    {zone.count} cây
                  </Badge>
                  {isSelected && (
                    <Badge className="text-xs px-1.5 py-0 bg-emerald-100 text-emerald-800 border-emerald-200">
                      {effectivePlants.length} được chọn
                    </Badge>
                  )}
                </div>
              </div>

              {isSelected && zonePlants.length > 0 && (
                <button
                  type="button"
                  onClick={() => setExpandedZone(isExpanded ? null : zone.id)}
                  className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 shrink-0"
                >
                  {isExpanded ? (
                    <><ChevronUp className="h-3.5 w-3.5" /> Ẩn cây</>
                  ) : (
                    <><ChevronDown className="h-3.5 w-3.5" /> Xem/tùy chỉnh</>
                  )}
                </button>
              )}
            </div>

            {/* Expandable plant override list */}
            {isSelected && isExpanded && (
              <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2 space-y-1 max-h-40 overflow-y-auto">
                <p className="text-xs text-slate-500 mb-1.5">Bỏ chọn cây không muốn thu hoạch:</p>
                {zonePlants.map((plant) => {
                  const active = !overriddenIds.has(plant.id);
                  return (
                    <button
                      key={plant.id}
                      type="button"
                      onClick={() => onTogglePlant(plant.id)}
                      className={`flex w-full items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                        active ? "bg-white text-slate-900 shadow-xs border border-slate-200" : "opacity-50 bg-transparent"
                      }`}
                    >
                      <div
                        className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${
                          active ? "bg-emerald-600 border-emerald-600" : "border-slate-300 bg-white"
                        }`}
                      >
                        {active && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <TreeDeciduous className={`h-3.5 w-3.5 shrink-0 ${active ? "text-emerald-600" : "text-slate-400"}`} />
                      <span className="font-medium truncate">{getDisplayCode(plant)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

interface HarvestFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gardenId: string;
  onSuccess: (plantId?: string) => void;
}

type HarvestMode = "plant" | "zone";

export function HarvestFormDialog({
  open,
  onOpenChange,
  gardenId,
  onSuccess,
}: HarvestFormDialogProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<HarvestMode>("plant");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isManageQualityOpen, setIsManageQualityOpen] = useState(false);
  const [qualityGrades, setQualityGrades] = useState<QualityGrade[]>([]);

  // Plant mode: multi-select
  const [selectedPlantIds, setSelectedPlantIds] = useState<Set<string>>(new Set());

  // Zone mode
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [zoneOverrideIds, setZoneOverrideIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setQualityGrades(getQualityGrades(gardenId));
      setSelectedPlantIds(new Set());
      setSelectedZoneId(null);
      setZoneOverrideIds(new Set());
    }
  }, [open, gardenId]);

  const refreshQualityGrades = () => setQualityGrades(getQualityGrades(gardenId));

  const { data: plantsData } = useQuery({
    queryKey: ["plants", gardenId, "list-all"],
    queryFn: () =>
      api.get(`api/gardens/${gardenId}/plants?limit=100&offset=0`).json<PaginatedResponse<Plant>>(),
    enabled: open && !!gardenId,
  });

  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: queryKeys.zones(gardenId),
    queryFn: () => api.get(`api/gardens/${gardenId}/zones`).json(),
    enabled: open && !!gardenId,
  });

  const allPlants = plantsData?.items || [];

  // Compute final list of plant IDs to submit
  const finalPlantIds = useMemo((): string[] => {
    if (mode === "plant") {
      return Array.from(selectedPlantIds);
    }
    // Zone mode: all plants in zone minus overrides
    if (!selectedZoneId) return [];
    const zonePlants =
      selectedZoneId === "__unassigned__"
        ? allPlants.filter((p) => !p.zone_id)
        : allPlants.filter((p) => p.zone_id === selectedZoneId);
    return zonePlants.filter((p) => !zoneOverrideIds.has(p.id)).map((p) => p.id);
  }, [mode, selectedPlantIds, selectedZoneId, zoneOverrideIds, allPlants]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity_kg: 0,
      quality: "",
      season: "",
      harvested_at: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (finalPlantIds.length === 0) {
      toast.error(
        mode === "plant"
          ? "Vui lòng chọn ít nhất một cây để thu hoạch"
          : "Vui lòng chọn khu thu hoạch"
      );
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let failCount = 0;

    try {
      await Promise.all(
        finalPlantIds.map(async (plantId) => {
          try {
            await api.post(`api/plants/${plantId}/harvests`, {
              json: {
                quantity_kg: values.quantity_kg,
                quality: values.quality || null,
                season: values.season || null,
                harvested_at: values.harvested_at,
              },
            });
            successCount++;
          } catch {
            failCount++;
          }
        })
      );

      if (successCount > 0) {
        toast.success(
          finalPlantIds.length === 1
            ? "Đã ghi nhận thu hoạch thành công"
            : `Đã ghi nhận thu hoạch cho ${successCount}/${finalPlantIds.length} cây`
        );
        form.reset({
          quantity_kg: 0,
          quality: "",
          season: "",
          harvested_at: format(new Date(), "yyyy-MM-dd"),
        });
        onSuccess(finalPlantIds[0]);
      }
      if (failCount > 0) {
        toast.error(`${failCount} cây ghi nhận thất bại`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Plant mode handlers
  const togglePlant = (id: string) => {
    setSelectedPlantIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const selectAll = (ids: string[]) => setSelectedPlantIds((prev) => new Set([...prev, ...ids]));
  const clearAll = () => setSelectedPlantIds(new Set());

  // Zone mode handlers
  const handleSelectZone = (zoneId: string | null) => {
    setSelectedZoneId(zoneId);
    setZoneOverrideIds(new Set());
  };
  const toggleZonePlant = (id: string) => {
    setZoneOverrideIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const hasSelection = finalPlantIds.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[92vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-emerald-800">
            🌾 Ghi nhận Thu hoạch
          </DialogTitle>
        </DialogHeader>

        {/* Mode tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setMode("plant")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === "plant"
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <TreeDeciduous className="h-4 w-4" />
            Thu hoạch theo cây
          </button>
          <button
            type="button"
            onClick={() => setMode("zone")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === "zone"
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Layers className="h-4 w-4" />
            Thu hoạch theo khu
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-0.5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-1">

              {/* ── Plant/Zone Picker ────────────────── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-800">
                    {mode === "plant" ? "Chọn cây thu hoạch" : "Chọn khu thu hoạch"}
                  </label>
                  {hasSelection && (
                    <Badge className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 border-emerald-200 font-semibold">
                      ✓ {finalPlantIds.length} cây được chọn
                    </Badge>
                  )}
                </div>

                {mode === "plant" ? (
                  <PlantPicker
                    plants={allPlants}
                    zones={zones}
                    selectedIds={selectedPlantIds}
                    onToggle={togglePlant}
                    onSelectAll={selectAll}
                    onClearAll={clearAll}
                  />
                ) : (
                  <ZonePicker
                    zones={zones}
                    plants={allPlants}
                    selectedZoneId={selectedZoneId}
                    onSelectZone={handleSelectZone}
                    overriddenIds={zoneOverrideIds}
                    onTogglePlant={toggleZonePlant}
                  />
                )}
              </div>

              {/* ── Sản lượng ────────────────────────── */}
              <FormField
                control={form.control}
                name="quantity_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("harvestForm.quantityLabel")}
                      {finalPlantIds.length > 1 && (
                        <span className="text-xs font-normal text-slate-500 ml-1">
                          (áp dụng cho mỗi cây)
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        min="0.01"
                        placeholder="0"
                        className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={field.value === 0 ? "" : field.value}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === "" ? 0 : parseFloat(val) || 0);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── Chất lượng + Vụ mùa ─────────────── */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quality"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <FormLabel className="text-xs font-semibold truncate flex-1 min-w-0">
                          {t("harvestForm.qualityLabel")}
                        </FormLabel>
                        <button
                          type="button"
                          onClick={() => setIsManageQualityOpen(true)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded transition-colors shrink-0"
                        >
                          <Award className="h-3 w-3" />
                          <span>+ Quản lý</span>
                        </button>
                      </div>
                      <FormControl>
                        <select
                          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
                          value={field.value || ""}
                          onChange={(e) => {
                            if (e.target.value === "__MANAGE_NEW__") {
                              setIsManageQualityOpen(true);
                            } else {
                              field.onChange(e.target.value);
                            }
                          }}
                        >
                          <option value="">-- Chọn chất lượng --</option>
                          {qualityGrades.map((g) => (
                            <option key={g.id} value={g.name}>
                              {g.name}
                            </option>
                          ))}
                          <option value="__MANAGE_NEW__" className="font-semibold text-emerald-700">
                            + Thêm / Quản lý phân loại...
                          </option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="season"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("harvestForm.seasonLabel")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("harvestForm.seasonPlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ── Ngày thu hoạch ───────────────────── */}
              <FormField
                control={form.control}
                name="harvested_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("harvestForm.harvestDateLabel")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── Submit ───────────────────────────── */}
              <div className="flex justify-end pt-2 gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t("action.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !hasSelection}
                  className="bg-emerald-700 hover:bg-emerald-800 min-w-[160px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang ghi nhận...
                    </>
                  ) : finalPlantIds.length > 1 ? (
                    `🌾 Ghi nhận ${finalPlantIds.length} cây`
                  ) : (
                    t("harvestForm.submitRecord")
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        <QualityManagementDialog
          open={isManageQualityOpen}
          onOpenChange={setIsManageQualityOpen}
          gardenId={gardenId}
          onUpdated={refreshQualityGrades}
        />
      </DialogContent>
    </Dialog>
  );
}
