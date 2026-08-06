"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiClient as api } from "@/lib/api-client";
import { PaginatedResponse, TraceCode } from "@/types";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, QrCode, Trash2, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";
import { TraceCodeFormDialog } from "@/components/trace-codes/trace-code-form-dialog";
import Link from "next/link";

export default function TraceCodesPage() {
  const [gardenId, setGardenId] = useState<string>("");
  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 10;
  
  const [formOpen, setFormOpen] = useState(false);

  const { data: traceData, isLoading, refetch } = useQuery({
    queryKey: ["trace-codes", gardenId, pageIndex],
    queryFn: () =>
      api.get(`api/gardens/${gardenId}/trace-codes?limit=${pageSize}&offset=${pageIndex * pageSize}`).json<PaginatedResponse<TraceCode>>(),
    enabled: !!gardenId,
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this trace code? Consumers will no longer be able to scan it.")) return;
    try {
      await api.delete(`api/trace-codes/${id}`);
      toast.success("Trace code deleted");
      refetch();
    } catch (err) {
      toast.error("Failed to delete trace code");
    }
  };

  const columns: ColumnDef<TraceCode>[] = [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <div className="font-mono font-medium text-primary">
          <Link href={`/trace/${row.original.code}`} target="_blank" className="hover:underline flex items-center gap-1">
            {row.original.code} <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      ),
    },
    {
      accessorKey: "batch_name",
      header: "Batch Name",
      cell: ({ row }) => row.original.batch_name || "-",
    },
    {
      accessorKey: "harvest_date",
      header: "Harvest Date",
      cell: ({ row }) => {
        const d = row.original.harvest_date;
        return d ? format(new Date(d), "MMM d, yyyy") : "-";
      },
    },
    {
      accessorKey: "plant_ids",
      header: "Plants",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.plant_ids.length} plants</span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="ghost" className="h-8 w-8 p-0" />
            }>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem>
                <Link href={`/trace/${item.code}`} target="_blank" className="cursor-pointer w-full flex items-center">
                  <ExternalLink className="mr-2 h-4 w-4" /> View Public Page
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/trace/${item.code}`);
                  toast.success("Trace link copied to clipboard");
                }}
              >
                <Copy className="mr-2 h-4 w-4" /> Copy Trace Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: traceData?.items || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: traceData ? Math.ceil(traceData.total / pageSize) : -1,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Trace Codes</h2>
          <p className="text-muted-foreground mt-1">Generate public traceability codes for consumers</p>
        </div>
        <div className="flex items-center gap-2">
          <GardenSelector value={gardenId} onChange={setGardenId} />
          <Button onClick={() => setFormOpen(true)} disabled={!gardenId}>
            <Plus className="mr-2 h-4 w-4" /> Generate Code
          </Button>
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
            {isLoading ? (
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
                <TableCell colSpan={columns.length} className="h-24 text-center flex-col gap-2">
                  <QrCode className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  No trace codes generated yet.
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
          disabled={pageIndex === 0 || isLoading}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPageIndex((old) => old + 1)}
          disabled={pageIndex >= table.getPageCount() - 1 || isLoading}
        >
          Next
        </Button>
      </div>

      {gardenId && (
        <TraceCodeFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          gardenId={gardenId}
          onSuccess={() => { setFormOpen(false); refetch(); }}
        />
      )}
    </div>
  );
}
