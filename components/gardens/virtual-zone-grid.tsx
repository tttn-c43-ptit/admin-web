"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient as api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { Plant, Zone } from "@/types";
import { useTranslation } from "@/components/i18n-provider";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PlantStatusBadge } from "@/components/plant-status-badge";
import { Grid, Sparkles, Move, Plus, Trash2, ExternalLink, RefreshCw, Layers, Undo2, Redo2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface VirtualZoneGridProps {
  gardenId: string;
  zones?: Zone[];
}

interface PlantPositionSnapshot {
  plantId: string;
  grid_x: number | null;
  grid_y: number | null;
}

export function VirtualZoneGrid({ gardenId, zones }: VirtualZoneGridProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [selectedZoneId, setSelectedZoneId] = useState<string>("ALL");
  const [rows, setRows] = useState<number>(5);
  const [cols, setCols] = useState<number>(5);
  const [draggedPlant, setDraggedPlant] = useState<Plant | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ x: number; y: number } | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState<boolean>(false);
  const [isAutoDividing, setIsAutoDividing] = useState<boolean>(false);

  // History stack for Undo / Redo (Ctrl + Z / Ctrl + Y)
  const [historyStack, setHistoryStack] = useState<PlantPositionSnapshot[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Fetch all plants for this garden
  const { data: plantsData, isLoading } = useQuery<{ items: Plant[] }>({
    queryKey: ["plants_grid", gardenId],
    queryFn: () => api.get(`api/gardens/${gardenId}/plants?limit=500`).json(),
  });

  const plants = plantsData?.items || [];

  // Record history snapshot before making grid modifications
  const recordHistory = () => {
    const currentSnapshot: PlantPositionSnapshot[] = plants.map((p) => ({
      plantId: p.id,
      grid_x: p.grid_x ?? null,
      grid_y: p.grid_y ?? null,
    }));
    setHistoryStack((prev) => [...prev.slice(0, historyIndex + 1), currentSnapshot]);
    setHistoryIndex((prev) => prev + 1);
  };

  const handleUndo = async () => {
    if (historyIndex < 0 || historyStack.length === 0) return;
    const targetSnapshot = historyStack[historyIndex];
    setHistoryIndex((prev) => prev - 1);

    try {
      const updates = targetSnapshot.map((item) => {
        const targetPlant = plants.find((p) => p.id === item.plantId);
        if (!targetPlant) return Promise.resolve();
        return api.put(`api/plants/${item.plantId}`, {
          json: {
            code: targetPlant.code,
            status: targetPlant.status,
            zone_id: targetPlant.zone_id,
            grid_x: item.grid_x,
            grid_y: item.grid_y,
          },
        });
      });

      await Promise.all(updates);
      queryClient.invalidateQueries({ queryKey: ["plants_grid", gardenId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.plants(gardenId) });
      toast.success(t("grid.undoSuccess"));
    } catch (e) {
      console.error("Undo failed:", e);
    }
  };

  const handleRedo = async () => {
    if (historyIndex >= historyStack.length - 1) return;
    const nextIdx = historyIndex + 1;
    const targetSnapshot = historyStack[nextIdx];
    setHistoryIndex(nextIdx);

    try {
      const updates = targetSnapshot.map((item) => {
        const targetPlant = plants.find((p) => p.id === item.plantId);
        if (!targetPlant) return Promise.resolve();
        return api.put(`api/plants/${item.plantId}`, {
          json: {
            code: targetPlant.code,
            status: targetPlant.status,
            zone_id: targetPlant.zone_id,
            grid_x: item.grid_x,
            grid_y: item.grid_y,
          },
        });
      });

      await Promise.all(updates);
      queryClient.invalidateQueries({ queryKey: ["plants_grid", gardenId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.plants(gardenId) });
      toast.success(t("grid.redoSuccess"));
    } catch (e) {
      console.error("Redo failed:", e);
    }
  };

  // Keyboard shortcut listener (Ctrl + Z / Ctrl + Y / Cmd + Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if (modifier && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [historyIndex, historyStack]);

  // Filter plants by active zone selection
  const filteredPlants = useMemo(() => {
    if (selectedZoneId === "ALL") return plants;
    if (selectedZoneId === "NONE") return plants.filter((p) => !p.zone_id);
    return plants.filter((p) => p.zone_id === selectedZoneId);
  }, [plants, selectedZoneId]);

  // Compute maximum grid dimensions automatically if plants exceed current rows/cols
  const gridDimensions = useMemo(() => {
    let maxR = rows;
    let maxC = cols;
    filteredPlants.forEach((p) => {
      if (p.grid_y && p.grid_y > maxR) maxR = Math.min(p.grid_y, 20);
      if (p.grid_x && p.grid_x > maxC) maxC = Math.min(p.grid_x, 20);
    });
    return { rows: maxR, cols: maxC };
  }, [filteredPlants, rows, cols]);

  // Map plants into (x,y) lookup dictionary
  const plantGridMap = useMemo(() => {
    const map = new Map<string, Plant>();
    filteredPlants.forEach((p) => {
      if (p.grid_x != null && p.grid_y != null) {
        map.set(`${p.grid_x}_${p.grid_y}`, p);
      }
    });
    return map;
  }, [filteredPlants]);

  // Unassigned plants (plants without grid_x / grid_y)
  const unassignedPlants = useMemo(() => {
    return filteredPlants.filter((p) => p.grid_x == null || p.grid_y == null);
  }, [filteredPlants]);

  // Mutation to update plant grid position
  const updatePositionMutation = useMutation({
    mutationFn: async ({ plantId, grid_x, grid_y }: { plantId: string; grid_x: number | null; grid_y: number | null }) => {
      const targetPlant = plants.find((p) => p.id === plantId);
      if (!targetPlant) return;
      await api.put(`api/plants/${plantId}`, {
        json: {
          code: targetPlant.code,
          status: targetPlant.status,
          zone_id: targetPlant.zone_id,
          grid_x,
          grid_y,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plants_grid", gardenId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.plants(gardenId) });
    },
  });

  // Auto divide grid generator
  const handleAutoDivide = async () => {
    if (filteredPlants.length === 0) {
      toast.info("Không có cây trồng nào để phân bố sơ đồ.");
      return;
    }

    recordHistory();
    setIsAutoDividing(true);
    try {
      let currentX = 1;
      let currentY = 1;

      const updates = filteredPlants.map((plant) => {
        const x = currentX;
        const y = currentY;

        currentX++;
        if (currentX > cols) {
          currentX = 1;
          currentY++;
        }

        return api.put(`api/plants/${plant.id}`, {
          json: {
            code: plant.code,
            status: plant.status,
            zone_id: plant.zone_id,
            grid_x: x,
            grid_y: y,
          },
        });
      });

      await Promise.all(updates);
      queryClient.invalidateQueries({ queryKey: ["plants_grid", gardenId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.plants(gardenId) });
      toast.success(t("grid.autoDivide") + " thành công!");
    } catch (error) {
      console.error(error);
      toast.error("Lỗi khi tự động chia sơ đồ lưới.");
    } finally {
      setIsAutoDividing(false);
    }
  };

  // Drag & drop handlers
  const handleDragStart = (plant: Plant) => {
    setDraggedPlant(plant);
  };

  const handleDropOnSlot = (targetX: number, targetY: number) => {
    if (!draggedPlant) return;
    recordHistory();
    updatePositionMutation.mutate({
      plantId: draggedPlant.id,
      grid_x: targetX,
      grid_y: targetY,
    });
    setDraggedPlant(null);
  };

  const handleAssignUnassignedPlant = (plantId: string) => {
    if (!selectedSlot) return;
    recordHistory();
    updatePositionMutation.mutate({
      plantId,
      grid_x: selectedSlot.x,
      grid_y: selectedSlot.y,
    });
    setAssignDialogOpen(false);
    setSelectedSlot(null);
  };

  const handleClearSlot = (plantId: string) => {
    recordHistory();
    updatePositionMutation.mutate({
      plantId,
      grid_x: null,
      grid_y: null,
    });
  };

  return (
    <Card className="w-full border shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl font-bold">
            <Grid className="h-5 w-5 text-emerald-600" />
            {t("grid.title")}
          </CardTitle>
          <CardDescription>{t("grid.subtitle")}</CardDescription>
        </div>

        {/* Top Control Bar with Undo / Redo */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Undo & Redo Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border">
            <Button
              size="sm"
              variant="ghost"
              disabled={historyIndex < 0}
              onClick={handleUndo}
              title={t("action.undo")}
              className="h-7 px-2 text-slate-700 hover:bg-white hover:shadow-xs disabled:opacity-40"
            >
              <Undo2 className="h-3.5 w-3.5 mr-1" />
              <span className="text-[11px] font-medium hidden sm:inline">Undo</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={historyIndex >= historyStack.length - 1}
              onClick={handleRedo}
              title={t("action.redo")}
              className="h-7 px-2 text-slate-700 hover:bg-white hover:shadow-xs disabled:opacity-40"
            >
              <Redo2 className="h-3.5 w-3.5 mr-1" />
              <span className="text-[11px] font-medium hidden sm:inline">Redo</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold whitespace-nowrap">{t("grid.selectZone")}</Label>
            <Select value={selectedZoneId} onValueChange={(val) => setSelectedZoneId(val || "ALL")}>
              <SelectTrigger className="h-9 w-[150px] text-xs">
                <SelectValue placeholder={t("grid.allZones")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("grid.allZones")}</SelectItem>
                <SelectItem value="NONE">{t("plants.unassignedZone")}</SelectItem>
                {zones?.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id}>
                    {zone.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <Label className="text-xs font-semibold">{t("grid.rows")}:</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={rows}
              onChange={(e) => setRows(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
              className="h-9 w-14 text-center text-xs"
            />
            <Label className="text-xs font-semibold">{t("grid.cols")}:</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={cols}
              onChange={(e) => setCols(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
              className="h-9 w-14 text-center text-xs"
            />
          </div>

          <Button
            size="sm"
            onClick={handleAutoDivide}
            disabled={isAutoDividing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs gap-1.5 shadow-sm h-9"
          >
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            {isAutoDividing ? t("action.saving") : t("grid.autoDivideButton")}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
            {t("plants.loading")}
          </div>
        ) : (
          <>
            {/* Helper Notice & Hotkey Hint */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <Move className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{t("grid.dragToMove")}</span>
              </div>
              <Badge variant="outline" className="bg-white text-emerald-800 border-emerald-300 font-mono text-[11px]">
                ⌨️ Ctrl + Z (Hoàn tác) | Ctrl + Y (Làm lại)
              </Badge>
            </div>

            {/* Matrix Grid Representation */}
            <div className="overflow-x-auto pb-4">
              <div
                className="grid gap-2.5 min-w-[600px]"
                style={{
                  gridTemplateColumns: `repeat(${gridDimensions.cols}, minmax(110px, 1fr))`,
                }}
              >
                {Array.from({ length: gridDimensions.rows }).map((_, rIdx) => {
                  const y = rIdx + 1;
                  return Array.from({ length: gridDimensions.cols }).map((_, cIdx) => {
                    const x = cIdx + 1;
                    const plant = plantGridMap.get(`${x}_${y}`);

                    return (
                      <div
                        key={`${x}_${y}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDropOnSlot(x, y)}
                        className={`relative group rounded-xl border p-2.5 transition-all duration-200 flex flex-col justify-between h-28 ${
                          plant
                            ? "bg-white border-slate-200 shadow-xs hover:shadow-md hover:border-emerald-400"
                            : "bg-slate-50/80 border-dashed border-slate-300 hover:bg-emerald-50/40 hover:border-emerald-400 cursor-pointer"
                        }`}
                        onClick={() => {
                          if (!plant) {
                            setSelectedSlot({ x, y });
                            setAssignDialogOpen(true);
                          }
                        }}
                      >
                        {/* Cell Position Label */}
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                          <span>
                            ({x},{y})
                          </span>
                          {plant && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClearSlot(plant.id);
                              }}
                              title={t("grid.clearPosition")}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity p-0.5"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>

                        {/* Cell Content */}
                        {plant ? (
                          <div
                            draggable
                            onDragStart={() => handleDragStart(plant)}
                            className="flex flex-col gap-1 cursor-grab active:cursor-grabbing"
                          >
                            <span className="font-bold text-xs text-slate-900 line-clamp-1">{plant.code}</span>
                            <PlantStatusBadge status={plant.status} className="text-[10px] py-0 px-1.5 w-fit" />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center flex-1 text-slate-400 group-hover:text-emerald-600 transition-colors">
                            <Plus className="h-4 w-4" />
                            <span className="text-[10px] font-medium mt-0.5">{t("grid.emptySlot")}</span>
                          </div>
                        )}

                        {/* View Details Link */}
                        {plant && (
                          <Link
                            href={`/plants/${plant.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 font-medium mt-1"
                          >
                            <span>Chi tiết</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </Link>
                        )}
                      </div>
                    );
                  });
                })}
              </div>
            </div>

            {/* Unassigned Plants Tray */}
            {unassignedPlants.length > 0 && (
              <div className="border-t pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-amber-500" />
                    {t("grid.unassignedPlants")} ({unassignedPlants.length})
                  </h4>
                  <span className="text-[11px] text-muted-foreground">{t("grid.dragToMove")}</span>
                </div>

                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-lg border">
                  {unassignedPlants.map((plant) => (
                    <div
                      key={plant.id}
                      draggable
                      onDragStart={() => handleDragStart(plant)}
                      className="bg-white border rounded-md px-2.5 py-1 text-xs shadow-xs flex items-center gap-2 cursor-grab active:cursor-grabbing hover:border-emerald-400"
                    >
                      <span className="font-semibold text-slate-800">{plant.code}</span>
                      <PlantStatusBadge status={plant.status} className="text-[9px] py-0 px-1" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Assign Plant to Cell Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {selectedSlot && t("grid.cellLabel", { x: selectedSlot.x.toString(), y: selectedSlot.y.toString() })}
            </DialogTitle>
            <DialogDescription className="text-xs">{t("grid.assignToSlot")}</DialogDescription>
          </DialogHeader>

          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
            {unassignedPlants.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Tất cả cây trồng đã được xếp vị trí ô.</p>
            ) : (
              unassignedPlants.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleAssignUnassignedPlant(p.id)}
                  className="p-2.5 border rounded-lg hover:bg-emerald-50 cursor-pointer flex justify-between items-center transition-colors"
                >
                  <div>
                    <span className="font-semibold text-xs text-slate-800">{p.code}</span>
                    <span className="text-[11px] text-slate-500 block">Ngày trồng: {p.planted_at || "Chưa rõ"}</span>
                  </div>
                  <PlantStatusBadge status={p.status} className="text-[10px]" />
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAssignDialogOpen(false)} className="text-xs">
              {t("action.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
