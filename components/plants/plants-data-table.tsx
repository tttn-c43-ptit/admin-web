"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Eye, Printer, MoreHorizontal, Edit2, Trash2, Plus, ChevronRight, ChevronLeft } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n-provider";
// Dialog components
import { BulkGenerateDialog } from "@/components/plants/bulk-generate-dialog";
import { PrintTagsDialog } from "@/components/plants/print-tags-dialog";
import { PrintSingleTagDialog } from "@/components/plants/print-single-tag-dialog";
import { CreatePlantDialog } from "@/components/plants/create-plant-dialog";
import { UpdatePlantDialog } from "@/components/plants/update-plant-dialog";

interface PlantsDataTableProps {
  gardenId: string;
}

export function PlantsDataTable({ gardenId }: PlantsDataTableProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [zoneFilter, setZoneFilter] = useState<string>("ALL");
  const [codeFilter, setCodeFilter] = useState<string>("");

  const [isBulkGenerateOpen, setIsBulkGenerateOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  
  const [isPrintSingleOpen, setIsPrintSingleOpen] = useState(false);
  const [plantToPrint, setPlantToPrint] = useState<Plant | null>(null);

  const [isCreatePlantOpen, setIsCreatePlantOpen] = useState(false);
  const [isUpdatePlantOpen, setIsUpdatePlantOpen] = useState(false);
  const [plantToUpdate, setPlantToUpdate] = useState<Plant | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [plantToDelete, setPlantToDelete] = useState<Plant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const columns: ColumnDef<Plant>[] = [
    {
      accessorKey: "code",
      header: t("plants.colCode"),
      cell: ({ row }) => (
        <Link href={`/plants/${row.original.id}`} className="font-medium text-blue-600 hover:underline">
          {row.original.code}
        </Link>
      ),
    },
    {
      accessorKey: "status",
      header: t("plants.colStatus"),
      cell: ({ row }) => <PlantStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "zone_id",
      header: t("plants.colZone"),
      cell: ({ row }) => {
        if (!row.original.zone_id) return t("plants.unassignedZone");
        if (zonesData) {
          const zone = zonesData.find((z) => z.id === row.original.zone_id);
          return zone ? zone.name : t("plants.unassignedZone");
        }
        return t("zones.loading");
      },
    },
    {
      accessorKey: "planted_at",
      header: t("plants.colPlantedAt"),
      cell: ({ row }) => row.original.planted_at ? formatDate(row.original.planted_at) : "-",
    },
    {
      id: "actions",
      header: t("plants.colActions"),
      cell: ({ row }) => {
        const plant = row.original;
        return (
          <div className="flex gap-2 items-center justify-end">
            <Link href={`/plants/${plant.id}`}>
              <Button variant="ghost" size="icon" title={t("plants.viewDetails")}>
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              } />
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{t("plants.colActions")}</DropdownMenuLabel>
                  <DropdownMenuItem
                  onClick={() => {
                    setPlantToPrint(plant);
                    setIsPrintSingleOpen(true);
                  }}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  {t("plants.printTag")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setPlantToUpdate(plant);
                    setIsUpdatePlantOpen(true);
                  }}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  {t("plants.editPlant")}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                      setPlantToDelete(plant);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("plants.deletePlant")}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

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
            placeholder={t("plants.filterCodePlaceholder")}
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
              <SelectValue placeholder={t("plants.colStatus")}>
                {statusFilter === "ALL" ? t("plants.allStatus") : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1).toLowerCase()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("plants.allStatus")}</SelectItem>
              <SelectItem value="HEALTHY">{t("status.healthy")}</SelectItem>
              <SelectItem value="WATCHING">{t("status.watching")}</SelectItem>
              <SelectItem value="SICK">{t("status.sick")}</SelectItem>
              <SelectItem value="DEAD">{t("status.dead")}</SelectItem>
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
              <SelectValue placeholder={t("plants.colZone")}>
                {zoneFilter === "ALL" ? t("plants.allZones") : zonesData?.find((z) => z.id === zoneFilter)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("plants.allZones")}</SelectItem>
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
            {t("plants.printTags")}
          </Button>
          <Button variant="outline" onClick={() => setIsCreatePlantOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("plants.addPlant")}
          </Button>
          <Button onClick={() => setIsBulkGenerateOpen(true)}>
            {t("plants.bulkAdd")}
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
                  {t("plants.loading")}
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-red-500">
                  {t("plants.failed")}
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
                  {t("plants.noPlantsFound")}
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
            {t("plants.showingRange")
              .replace("{start}", (page * pageSize + 1).toString())
              .replace("{end}", Math.min((page + 1) * pageSize, data.total).toString())
              .replace("{total}", data.total.toString())}
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
        zonesData={zonesData}
        existingPlants={data?.items}
      />
      
      <PrintTagsDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        gardenId={gardenId}
      />

      {plantToPrint && (
        <PrintSingleTagDialog
          open={isPrintSingleOpen}
          onOpenChange={setIsPrintSingleOpen}
          plant={plantToPrint}
        />
      )}

      <CreatePlantDialog
        open={isCreatePlantOpen}
        onOpenChange={setIsCreatePlantOpen}
        gardenId={gardenId}
        zonesData={zonesData}
        existingPlants={data?.items}
        onSuccess={() => refetch()}
      />

      {plantToUpdate && (
        <UpdatePlantDialog
          open={isUpdatePlantOpen}
          onOpenChange={setIsUpdatePlantOpen}
          plant={plantToUpdate}
          zonesData={zonesData}
          onSuccess={() => {
            refetch();
            setPlantToUpdate(null);
          }}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("plants.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("plants.deleteConfirmDesc").replace("{code}", plantToDelete?.code || "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("action.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={async (e) => {
                e.preventDefault();
                if (!plantToDelete) return;
                setIsDeleting(true);
                try {
                  await api.delete(`api/plants/${plantToDelete.id}`);
                  toast.success(`Deleted plant ${plantToDelete.code}`);
                  setIsDeleteDialogOpen(false);
                  setPlantToDelete(null);
                  refetch();
                } catch (error: unknown) {
                  const err = error as { message?: string };
                  toast.error(err.message || "Failed to delete plant");
                } finally {
                  setIsDeleting(false);
                }
              }}
            >
              {isDeleting ? t("action.deleting") : t("action.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
