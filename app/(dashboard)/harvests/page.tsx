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
import { Plus, Tractor, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HarvestFormDialog } from "@/components/harvests/harvest-form-dialog";
import { ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

export default function HarvestsPage() {
  const queryClient = useQueryClient();
  const [gardenId, setGardenId] = useState<string>("");
  const [selectedPlantId, setSelectedPlantId] = useState<string>("");
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 10;
  
  const [formOpen, setFormOpen] = useState(false);

  const handleGardenChange = (newGardenId: string) => {
    setGardenId(newGardenId);
    setSelectedPlantId("");
    setPageIndex(0);
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
      header: "Date",
      cell: ({ row }) => format(new Date(row.original.harvested_at), "MMM d, yyyy"),
    },
    {
      accessorKey: "quantity_kg",
      header: "Yield (kg)",
      cell: ({ row }) => <div className="font-mono font-medium text-green-700">{row.original.quantity_kg} kg</div>,
    },
    {
      accessorKey: "quality",
      header: "Quality",
      cell: ({ row }) => row.original.quality || "-",
    },
    {
      accessorKey: "season",
      header: "Season",
      cell: ({ row }) => row.original.season || "-",
    },
    {
      accessorKey: "plant_id",
      header: "Plant Code",
      cell: ({ row }) => (
        <div className="font-mono text-sm font-medium">
          {getPlantCode(row.original.plant_id)}
        </div>
      ),
    }
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
          <h2 className="text-3xl font-bold tracking-tight">Harvests</h2>
          <p className="text-muted-foreground mt-1">Track crop yields and harvest seasons</p>
        </div>
        <div className="flex items-center gap-2">
          <GardenSelector value={gardenId} onChange={handleGardenChange} />
          <Button onClick={() => setFormOpen(true)} disabled={!gardenId}>
            <Plus className="mr-2 h-4 w-4" /> Record Harvest
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
              <h3 className="text-sm font-medium text-muted-foreground">Total Harvested</h3>
              <div className="text-4xl font-bold mt-1 text-green-700">{stats.total_kg.toFixed(1)} <span className="text-2xl text-muted-foreground">kg</span></div>
              <p className="text-sm text-muted-foreground mt-2">{stats.total_records} harvest records</p>
            </div>

            {/* By Zone Chart */}
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 md:col-span-2">
              <h3 className="font-semibold leading-none tracking-tight mb-4">Yield by Zone</h3>
              {stats.by_zone.length > 0 ? (
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.by_zone} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="zone_name" type="category" axisLine={false} tickLine={false} width={80} />
                      <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: "8px" }} />
                      <Bar dataKey="quantity_kg" fill="#3F9142" radius={[0, 4, 4, 0]} name="Yield (kg)" barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[150px] items-center justify-center text-sm text-muted-foreground">
                  No zone yield data
                </div>
              )}
            </div>
          </div>

          {/* Season & Quality Breakdowns */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            <div className="rounded-xl border bg-card p-5">
              <h4 className="font-semibold text-sm mb-3">Yield by Season</h4>
              {stats.by_season.length > 0 ? (
                <div className="space-y-2">
                  {stats.by_season.map((s, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm p-2 rounded bg-muted/40">
                      <span className="font-medium">{s.season || "Unassigned"}</span>
                      <span className="font-mono font-bold text-green-700">{s.quantity_kg} kg <span className="text-xs text-muted-foreground">({s.records} records)</span></span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No season data recorded.</p>
              )}
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h4 className="font-semibold text-sm mb-3">Yield by Quality Grade</h4>
              {stats.by_quality.length > 0 ? (
                <div className="space-y-2">
                  {stats.by_quality.map((q, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm p-2 rounded bg-muted/40">
                      <span className="font-medium">{q.quality || "Unassigned"}</span>
                      <span className="font-mono font-bold text-green-700">{q.quantity_kg} kg <span className="text-xs text-muted-foreground">({q.records} records)</span></span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No quality grade data recorded.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
        <h3 className="font-semibold text-lg">Harvest History</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Select Plant:</span>
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
              <SelectValue placeholder={gardenId ? "Select a plant..." : "Select garden first"}>
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
                  Loading...
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
                  No harvests recorded yet.
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
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPageIndex((old) => old + 1)}
          disabled={pageIndex >= table.getPageCount() - 1 || listLoading}
        >
          Next
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
    </div>
  );
}
