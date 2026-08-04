"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiClient as api } from "@/lib/api-client";
import { Harvest, HarvestStats, PaginatedResponse } from "@/types";
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
import { HarvestFormDialog } from "@/components/harvests/harvest-form-dialog";
import { ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

export default function HarvestsPage() {
  const [gardenId, setGardenId] = useState<string>("");
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 10;
  
  const [formOpen, setFormOpen] = useState(false);

  // Fetch harvest stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["harvests", gardenId, "stats"],
    queryFn: () =>
      api.get(`api/gardens/${gardenId}/harvest-stats`).json<HarvestStats>(),
    enabled: !!gardenId,
  });

  const { data: harvestsData, isLoading: listLoading, refetch } = useQuery({
    queryKey: ["harvests", gardenId, pageIndex],
    queryFn: () =>
      api.get(`api/gardens/${gardenId}/harvests?limit=${pageSize}&offset=${pageIndex * pageSize}`).json<PaginatedResponse<Harvest>>(),
    enabled: !!gardenId,
  });

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
      header: "Plant ID",
      cell: ({ row }) => <div className="font-mono text-xs">{row.original.plant_id.split("-")[0]}...</div>,
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
          <GardenSelector value={gardenId} onChange={setGardenId} />
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
      ) : null}

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
          onSuccess={() => { setFormOpen(false); refetch(); }}
        />
      )}
    </div>
  );
}
