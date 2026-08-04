"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { apiClient as api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { Plant, PaginatedResponse, Zone } from "@/types";
import { PlantStatusBadge } from "@/components/plant-status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, ChevronRight, Eye, ChevronLeft, Printer } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
// Dialog components
import { BulkGenerateDialog } from "@/components/plants/bulk-generate-dialog";
import { PrintTagsDialog } from "@/components/plants/print-tags-dialog";

export const columns: ColumnDef<Plant>[] = [
  {
    accessorKey: "code",
    header: "Plant Code",
    cell: ({ row }) => (
      <Link href={`/plants/${row.original.id}`} className="font-medium text-blue-600 hover:underline">
        {row.original.code}
      </Link>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <PlantStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "zone_id",
    header: "Zone",
    cell: ({ row }) => row.original.zone_id || "Unassigned", // Ideally we fetch zone name
  },
  {
    accessorKey: "planted_at",
    header: "Planted At",
    cell: ({ row }) => row.original.planted_at ? formatDate(row.original.planted_at) : "-",
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {

      return (
        <div className="flex gap-2">
          <Link href={`/plants/${row.original.id}`}>
          <Button variant="ghost" size="icon" title="View details">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
        </div>
      );
    },
  },
];

interface PlantsDataTableProps {
  gardenId: string;
}

export function PlantsDataTable({ gardenId }: PlantsDataTableProps) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [zoneFilter, setZoneFilter] = useState<string>("ALL");
  const [codeFilter, setCodeFilter] = useState<string>("");

  const [isBulkGenerateOpen, setIsBulkGenerateOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);

  // Fetch Zones for filter dropdown
  const { data: zonesData } = useQuery<Zone[]>({
    queryKey: [...queryKeys.gardens(), gardenId, "zones"],
    queryFn: () => api.get(`api/gardens/${gardenId}/zones`).json(),
  });

  // Fetch Plants
  const { data, isLoading, isError, refetch } = useQuery<PaginatedResponse<Plant>>({
    queryKey: [...queryKeys.gardens(), gardenId, "plants", page, pageSize, statusFilter, zoneFilter, codeFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (page * pageSize).toString(),
      });
      if (statusFilter && statusFilter !== "ALL") params.append("status", statusFilter);
      if (zoneFilter && zoneFilter !== "ALL") params.append("zone_id", zoneFilter);
      if (codeFilter) params.append("code", codeFilter);

      return api.get(`api/gardens/${gardenId}/plants?${params.toString()}`).json();
    },
  });

  const table = useReactTable({
    data: data?.items || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: data ? Math.ceil(data.total / pageSize) : -1,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Filter by code..."
            value={codeFilter}
            onChange={(e) => {
              setCodeFilter(e.target.value);
              setPage(0);
            }}
            className="w-[200px]"
          />
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              if (val) {
                setStatusFilter(val);
                setPage(0);
              }
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="HEALTHY">Healthy</SelectItem>
              <SelectItem value="WATCHING">Watching</SelectItem>
              <SelectItem value="SICK">Sick</SelectItem>
              <SelectItem value="DEAD">Dead</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={zoneFilter}
            onValueChange={(val) => {
              if (val) {
                setZoneFilter(val);
                setPage(0);
              }
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Zone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Zones</SelectItem>
              {zonesData?.map((zone) => (
                <SelectItem key={zone.id} value={zone.id}>
                  {zone.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsPrintDialogOpen(true)}>
            <Printer className="mr-2 h-4 w-4" />
            Print Tags
          </Button>
          <Button onClick={() => setIsBulkGenerateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Bulk Add
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Loading plants...
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-red-500">
                  Failed to load plants.
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No plants found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination Controls */}
      {data && data.total > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, data.total)} of {data.total} plants
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={pageSize.toString()}
              onValueChange={(val) => {
                setPageSize(Number(val));
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((old) => Math.max(0, old - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((old) => (old + 1 < table.getPageCount() ? old + 1 : old))}
              disabled={page >= table.getPageCount() - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <BulkGenerateDialog 
        open={isBulkGenerateOpen} 
        onOpenChange={setIsBulkGenerateOpen} 
        gardenId={gardenId}
        onSuccess={refetch}
      />
      
      <PrintTagsDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        gardenId={gardenId}
      />
    </div>
  );
}
