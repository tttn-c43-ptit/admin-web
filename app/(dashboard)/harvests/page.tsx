"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiClient as api } from "@/lib/api-client";
import { Harvest, HarvestStats, PaginatedResponse, Plant } from "@/types";
import { GardenSelector } from "@/components/dashboard/garden-selector";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Plus, Tractor, Loader2, Pencil, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HarvestFormDialog } from "@/components/harvests/harvest-form-dialog";
import { ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/components/i18n-provider";

export default function HarvestsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [gardenId, setGardenId] = useState<string>("");
  const [selectedPlantId, setSelectedPlantId] = useState<string>("");
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 10;
  
  const [formOpen, setFormOpen] = useState(false);

  // Edit Harvest State
  const [editingHarvest, setEditingHarvest] = useState<Harvest | null>(null);
  const [editQuantityKg, setEditQuantityKg] = useState<number>(0);
  const [editQuality, setEditQuality] = useState<string>("");
  const [editSeason, setEditSeason] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleGardenChange = (newGardenId: string) => {
    setGardenId(newGardenId);
    setSelectedPlantId("");
    setPageIndex(0);
  };

  // Open Edit Harvest Dialog
  const handleOpenEdit = (harvest: Harvest) => {
    setEditingHarvest(harvest);
    setEditQuantityKg(harvest.quantity_kg);
    setEditQuality(harvest.quality || "");
    setEditSeason(harvest.season || "");
  };

  // Submit Edit Harvest (PATCH /api/harvests/{id})
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHarvest) return;
    setIsUpdating(true);
    try {
      await api.patch(`api/harvests/${editingHarvest.id}`, {
        json: {
          quantity_kg: editQuantityKg,
          quality: editQuality || null,
          season: editSeason || null,
        },
      });
      toast.success("Harvest record updated successfully");
      setEditingHarvest(null);
      queryClient.invalidateQueries({ queryKey: ["harvests"] });
      refetch();
    } catch (err) {
      toast.error("Failed to update harvest record");
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete Harvest (DELETE /api/harvests/{id})
  const handleDeleteHarvest = async (harvestId: string) => {
    if (!confirm(t("harvests.deleteConfirm"))) return;
    try {
      await api.delete(`api/harvests/${harvestId}`);
      toast.success("Harvest record deleted");
      queryClient.invalidateQueries({ queryKey: ["harvests"] });
      refetch();
    } catch (err) {
      toast.error("Failed to delete harvest record");
    }
  };

  // Fetch plants for the selected garden
  const { data: plantsData } = useQuery({
    queryKey: ["plants", gardenId, "list-selector"],
    queryFn: () =>
      api.get(`api/gardens/${gardenId}/plants?limit=100&offset=0`).json<PaginatedResponse<Plant>>(),
    enabled: !!gardenId,
  });

  // Sync plant selection when garden or plants change
  useEffect(() => {
    if (plantsData?.items) {
      if (plantsData.items.length > 0) {
        const exists = plantsData.items.some((p) => p.id === selectedPlantId);
        if (!exists) {
          setSelectedPlantId(plantsData.items[0].id);
        }
      } else {
        setSelectedPlantId("");
      }
    } else if (!gardenId) {
      setSelectedPlantId("");
    }
  }, [plantsData, selectedPlantId, gardenId]);

  // Fetch harvest stats (existing API: GET /api/gardens/{garden_id}/harvest-stats)
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["harvests", gardenId, "stats"],
    queryFn: () =>
      api.get(`api/gardens/${gardenId}/harvest-stats`).json<HarvestStats>(),
    enabled: !!gardenId,
  });

  // Fetch harvests for selected plant (existing API: GET /api/plants/{plant_id}/harvests)
  const { data: harvestsData, isLoading: listLoading, refetch } = useQuery({
    queryKey: ["harvests", selectedPlantId, pageIndex],
    queryFn: () =>
      api.get(`api/plants/${selectedPlantId}/harvests?limit=${pageSize}&offset=${pageIndex * pageSize}`).json<PaginatedResponse<Harvest>>(),
    enabled: !!selectedPlantId && selectedPlantId.trim() !== "",
  });

  // Helper to format plant code nicely (avoid raw 36-char UUID)
  const getPlantCode = (plantId: string) => {
    const plant = plantsData?.items.find((p) => p.id === plantId);
    if (!plant) {
      return plantId.length === 36 && plantId.includes("-")
        ? `Plant #${plantId.substring(0, 8)}`
        : plantId;
    }
    if (plant.code.length === 36 && plant.code.includes("-")) {
      return `Plant #${plant.code.substring(0, 8)}`;
    }
    return plant.code;
  };

  const columns: ColumnDef<Harvest>[] = [
    {
      accessorKey: "harvested_at",
      header: t("harvests.colDate"),
      cell: ({ row }) => format(new Date(row.original.harvested_at), "MMM d, yyyy"),
    },
    {
      accessorKey: "quantity_kg",
      header: t("harvests.colYield"),
      cell: ({ row }) => <div className="font-mono font-medium text-green-700">{row.original.quantity_kg} kg</div>,
    },
    {
      accessorKey: "quality",
      header: t("harvests.colQuality"),
      cell: ({ row }) => row.original.quality || "-",
    },
    {
      accessorKey: "season",
      header: t("harvests.colSeason"),
      cell: ({ row }) => row.original.season || "-",
    },
    {
      accessorKey: "plant_id",
      header: t("harvests.colPlantCode"),
      cell: ({ row }) => (
        <div className="font-mono text-sm font-medium">
          {getPlantCode(row.original.plant_id)}
        </div>
      ),
    },
    {
      id: "actions",
      header: t("harvests.colActions"),
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEdit(row.original)}
            title={t("action.edit")}
          >
            <Pencil className="h-4 w-4 text-gray-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteHarvest(row.original.id)}
            title={t("action.delete")}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: harvestsData?.items || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: harvestsData ? Math.ceil(harvestsData.total / pageSize) : -1,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("harvests.title")}</h2>
          <p className="text-muted-foreground mt-1">{t("harvests.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <GardenSelector value={gardenId} onChange={handleGardenChange} />
          <Button onClick={() => setFormOpen(true)} disabled={!gardenId}>
            <Plus className="mr-2 h-4 w-4" /> {t("harvests.addHarvest")}
          </Button>
        </div>
      </div>

      {gardenId && statsLoading ? (
        <div className="flex h-[200px] flex-col items-center justify-center text-muted-foreground border rounded-xl border-dashed gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : stats ? (
        <div className="space-y-6">
          <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
            {/* Total KPI */}
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-center items-center text-center">
              <div className="p-3 bg-green-100 rounded-full mb-4">
                <Tractor className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">{t("harvests.totalHarvested")}</h3>
              <div className="text-4xl font-bold mt-1 text-green-700">{stats.total_kg.toFixed(1)} <span className="text-2xl text-muted-foreground">kg</span></div>
              <p className="text-sm text-muted-foreground mt-2">
                {t("harvests.harvestRecordsCount").replace("{count}", String(stats.total_records))}
              </p>
            </div>

            {/* By Zone Chart */}
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 md:col-span-2">
              <h3 className="font-semibold leading-none tracking-tight mb-4">{t("harvests.yieldByZone")}</h3>
              {stats.by_zone.length > 0 ? (
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.by_zone} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="zone_name" type="category" axisLine={false} tickLine={false} width={80} />
                      <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: "8px" }} />
                      <Bar dataKey="quantity_kg" fill="#3F9142" radius={[0, 4, 4, 0]} name={t("harvests.colYield")} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[150px] items-center justify-center text-sm text-muted-foreground">
                  {t("harvests.noZoneData")}
                </div>
              )}
            </div>
          </div>

          {/* Season & Quality Breakdowns */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            <div className="rounded-xl border bg-card p-5">
              <h4 className="font-semibold text-sm mb-3">{t("harvests.yieldBySeason")}</h4>
              {stats.by_season.length > 0 ? (
                <div className="space-y-2">
                  {stats.by_season.map((s, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm p-2 rounded bg-muted/40">
                      <span className="font-medium">{s.season || t("harvests.unassigned")}</span>
                      <span className="font-mono font-bold text-green-700">{s.quantity_kg} kg <span className="text-xs text-muted-foreground">({s.records} {t("harvests.harvestRecordsCount").replace("{count}", "").trim()})</span></span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{t("harvests.noSeasonData")}</p>
              )}
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h4 className="font-semibold text-sm mb-3">{t("harvests.yieldByQuality")}</h4>
              {stats.by_quality.length > 0 ? (
                <div className="space-y-2">
                  {stats.by_quality.map((q, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm p-2 rounded bg-muted/40">
                      <span className="font-medium">{q.quality || t("harvests.unassigned")}</span>
                      <span className="font-mono font-bold text-green-700">{q.quantity_kg} kg <span className="text-xs text-muted-foreground">({q.records} {t("harvests.harvestRecordsCount").replace("{count}", "").trim()})</span></span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{t("harvests.noQualityData")}</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
        <h3 className="font-semibold text-lg">{t("harvests.historyTitle")}</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{t("harvests.selectPlant")}</span>
          <Select 
            value={selectedPlantId} 
            onValueChange={(val) => {
              if (val) {
                setSelectedPlantId(val);
                setPageIndex(0);
              }
            }}
            disabled={!gardenId}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder={gardenId ? t("harvests.selectPlantPlaceholder") : t("harvests.selectGardenFirst")}>
                {selectedPlantId ? getPlantCode(selectedPlantId) : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {plantsData?.items.map((plant) => (
                <SelectItem key={plant.id} value={plant.id}>
                  {getPlantCode(plant.id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {listLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {t("harvests.loading")}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {t("harvests.noHarvests")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPageIndex((old) => Math.max(old - 1, 0))}
          disabled={pageIndex === 0 || listLoading}
        >
          {t("action.previous")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPageIndex((old) => old + 1)}
          disabled={pageIndex >= table.getPageCount() - 1 || listLoading}
        >
          {t("action.next")}
        </Button>
      </div>

      {gardenId && (
        <HarvestFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          gardenId={gardenId}
          onSuccess={(createdPlantId) => {
            setFormOpen(false);
            if (createdPlantId) {
              setSelectedPlantId(createdPlantId);
            }
            queryClient.invalidateQueries({ queryKey: ["harvests"] });
          }}
        />
      )}

      {/* Edit Harvest Dialog */}
      <Dialog open={!!editingHarvest} onOpenChange={(open) => !open && setEditingHarvest(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("harvestForm.editTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit_quantity_kg">{t("harvestForm.quantityLabel")}</Label>
              <Input
                id="edit_quantity_kg"
                type="number"
                step="0.1"
                min="0.1"
                value={editQuantityKg || ""}
                onChange={(e) => setEditQuantityKg(parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_quality">{t("harvestForm.qualityLabel")}</Label>
              <Input
                id="edit_quality"
                placeholder={t("harvestForm.qualityPlaceholder")}
                value={editQuality}
                onChange={(e) => setEditQuality(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_season">{t("harvestForm.seasonLabel")}</Label>
              <Input
                id="edit_season"
                placeholder={t("harvestForm.seasonPlaceholder")}
                value={editSeason}
                onChange={(e) => setEditSeason(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingHarvest(null)}>
                {t("action.cancel")}
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? t("action.saving") : t("action.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
